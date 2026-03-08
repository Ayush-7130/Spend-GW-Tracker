import { dbManager, Notification } from "./database";
import { ObjectId } from "mongodb";
import logger from "./logger";

// Notification types and their message generators
export type NotificationType =
  | "expense_added"
  | "expense_updated"
  | "expense_deleted"
  | "settlement_added"
  | "settlement_updated"
  | "settlement_deleted"
  | "category_added"
  | "category_updated"
  | "category_deleted"
  | "password_changed"
  | "password_reset"
  | "new_login"
  | "failed_login_attempts"
  | "session_revoked"
  | "mfa_enabled"
  | "mfa_disabled";

export interface NotificationData {
  type: NotificationType;
  actorName: string;
  entityName: string;
  entityId?: string;
  amount?: number;
  isSplit?: boolean;
}

// Message generators for different notification types
const messageGenerators: Record<
  NotificationType,
  (data: NotificationData) => string
> = {
  expense_added: (data) => {
    const expenseType = data.isSplit ? "split" : "personal";
    return `${data.actorName} added a ${expenseType} expense: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`;
  },
  expense_updated: (data) => {
    const expenseType = data.isSplit ? "split" : "personal";
    return `${data.actorName} updated a ${expenseType} expense: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`;
  },
  expense_deleted: (data) =>
    `${data.actorName} deleted an expense: ${data.entityName}`,
  settlement_added: (data) =>
    `${data.actorName} added a settlement: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`,
  settlement_updated: (data) =>
    `${data.actorName} updated a settlement: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`,
  settlement_deleted: (data) =>
    `${data.actorName} deleted a settlement: ${data.entityName}`,
  category_added: (data) =>
    `${data.actorName} added a category: ${data.entityName}`,
  category_updated: (data) =>
    `${data.actorName} updated a category: ${data.entityName}`,
  category_deleted: (data) =>
    `${data.actorName} deleted a category: ${data.entityName}`,
  password_changed: (data) =>
    `🔐 Your password was changed successfully${data.entityName ? ` from ${data.entityName}` : ""}`,
  password_reset: (data) =>
    `🔐 Your password was reset${data.entityName ? ` from ${data.entityName}` : ""}`,
  new_login: (data) =>
    `🔔 New login detected${data.entityName ? ` from ${data.entityName}` : ""}`,
  failed_login_attempts: () =>
    `⚠️ Multiple failed login attempts detected on your account`,
  session_revoked: (data) =>
    `🚪 A session was revoked${data.entityName ? `: ${data.entityName}` : ""}`,
  mfa_enabled: () =>
    `✅ Two-factor authentication has been enabled on your account`,
  mfa_disabled: () =>
    `⚠️ Two-factor authentication has been disabled on your account`,
};

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Notification types that are user-level security events (no group context)
  private static readonly SYSTEM_NOTIFICATION_TYPES: NotificationType[] = [
    "password_changed",
    "password_reset",
    "new_login",
    "failed_login_attempts",
    "session_revoked",
    "mfa_enabled",
    "mfa_disabled",
  ];

  // Send notification to specific user
  async sendNotification(
    userId: string,
    notificationData: NotificationData,
    groupId?: string // Required for group-scoped notification types
  ): Promise<void> {
    try {
      const message =
        messageGenerators[notificationData.type](notificationData);

      await dbManager.createNotification({
        userId,
        ...(groupId ? { groupId } : {}),
        type: notificationData.type,
        message,
        entityId: notificationData.entityId,
        entityType: this.getEntityType(notificationData.type),
        read: false,
      });
    } catch (error) {
      // FIX M37: Log notification errors instead of silent failure
      logger.error("Failed to send notification", {
        userId,
        type: notificationData.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send notification to multiple users (broadcast)
   *
   * @param excludeUserId - User ID to exclude from broadcast (typically the actor)
   * @param notificationData - Notification content and metadata
   * @param groupId - Optional group ID for scoping
   *
   * CRITICAL SECURITY: Group scoping prevents cross-group notification leakage
   *
   * BEHAVIOR:
   * - If groupId is provided: Only notify members of that specific group
   * - If groupId is null/undefined: Notify ALL users except excludeUserId (LEGACY BEHAVIOR)
   *
   * WARNING: Calling without groupId broadcasts to ALL USERS (use only for system-wide alerts)
   *
   * RECOMMENDED: Always provide groupId for group-scoped events to prevent accidental
   * all-user broadcasts which could leak group activity to non-members
   */
  async broadcastNotification(
    excludeUserId: string,
    notificationData: NotificationData,
    groupId?: string // Optional: if provided, only notify group members
  ): Promise<void> {
    try {
      // SECURITY: Define which notification types REQUIRE group scoping
      const groupScopedTypes: NotificationType[] = [
        "expense_added",
        "expense_updated",
        "expense_deleted",
        "settlement_added",
        "settlement_updated",
        "settlement_deleted",
        "category_added",
        "category_updated",
        "category_deleted",
      ];

      // SECURITY CHECK: Prevent accidental all-user broadcasts for group events
      if (!groupId && groupScopedTypes.includes(notificationData.type)) {
        logger.error(
          "[broadcastNotification] SECURITY: Attempted to broadcast group-scoped notification without groupId",
          {
            type: notificationData.type,
            excludeUserId,
            actorName: notificationData.actorName,
          }
        );
        // Fail safely: do not broadcast to all users
        return;
      }

      const db = await dbManager.getDatabase();

      let users;
      if (groupId) {
        // Group-scoped broadcast: Get all members of the specific group
        const group = await db.collection("groups").findOne({
          _id: new ObjectId(groupId),
        });

        if (!group) {
          return; // Group not found, silently fail
        }

        // Get user IDs from group members, excluding the actor
        const memberUserIds = group.members
          .map((m: any) => m.userId)
          .filter((id: string) => id !== excludeUserId);

        if (memberUserIds.length === 0) {
          return; // No members to notify
        }

        users = await db
          .collection("users")
          .find({
            _id: { $in: memberUserIds.map((id: string) => new ObjectId(id)) },
          })
          .toArray();
      } else {
        // Legacy behavior for non-group notifications (security events, etc.)
        // Only use this for system-wide security notifications
        users = await db
          .collection("users")
          .find({ _id: { $ne: new ObjectId(excludeUserId) } })
          .toArray();
      }

      const message =
        messageGenerators[notificationData.type](notificationData);

      const notifications = users.map((user) => ({
        userId: user._id.toString(),
        groupId: groupId, // Include groupId for group-scoped notifications
        type: notificationData.type,
        message,
        entityId: notificationData.entityId,
        entityType: this.getEntityType(notificationData.type),
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (notifications.length > 0) {
        await db.collection("notifications").insertMany(notifications);
      }
    } catch (error) {
      // FIX M37: Log broadcast notification errors
      logger.error("Failed to broadcast notification", {
        excludeUserId,
        groupId,
        type: notificationData.type,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get user notifications with pagination
   *
   * @param userId - User ID to fetch notifications for
   * @param page - Page number (1-indexed)
   * @param limit - Number of notifications per page
   * @param sessionId - Optional session ID to exclude notifications meant for specific session
   * @param groupId - Optional group ID filter
   *
   * GROUP FILTERING BEHAVIOR (IMPORTANT):
   * When groupId is provided, the query returns:
   * 1. Notifications specific to that group (groupId === provided ID)
   * 2. System/security notifications (groupId === null) - always shown
   * 3. Legacy notifications without groupId field - always shown
   *
   * This means filtering by group will STILL include system notifications like:
   * - Password changes
   * - Session revocations
   * - Account security alerts
   *
   * SECURITY: userId is ALWAYS included in the query to prevent cross-user access
   */
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    sessionId?: string,
    groupId?: string // Filter by group if provided
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const db = await dbManager.getDatabase();

      const skip = (page - 1) * limit;

      // Build query to exclude notifications for current session
      // SECURITY: userId is ALWAYS in the query
      const query: any = { userId };
      if (sessionId) {
        query["metadata.excludeSessionId"] = { $ne: sessionId };
      }
      // Filter by groupId if provided (for group-scoped notifications).
      // System/security notification types are always shown regardless of group.
      // Group-activity types (expense, settlement, category) are shown ONLY for
      // the active group — this prevents cross-group notification leakage when
      // a user leaves one group and joins another.
      if (groupId !== undefined) {
        query.$or = [
          { groupId: groupId }, // Notifications belonging to this group
          { type: { $in: NotificationService.SYSTEM_NOTIFICATION_TYPES } }, // Security/account alerts (always shown)
        ];
      }

      const [notifications, total, unreadCount] = await Promise.all([
        db
          .collection("notifications")
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("notifications").countDocuments(query),
        db
          .collection("notifications")
          .countDocuments({ ...query, read: false }),
      ]);

      return {
        notifications: notifications.map(
          (n) => ({ ...n, _id: n._id.toString() }) as Notification
        ),
        total,
        unreadCount,
      };
    } catch {
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    return await dbManager.markNotificationAsRead(notificationId);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const db = await dbManager.getDatabase();
      const result = await db
        .collection("notifications")
        .updateMany({ userId, read: false }, { $set: { read: true } });
      return result.modifiedCount > 0;
    } catch {
      return false;
    }
  }

  // Delete old notifications (cleanup)
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const db = await dbManager.getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db.collection("notifications").deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true,
      });

      return result.deletedCount;
    } catch {
      return 0;
    }
  }

  // Helper to get entity type from notification type
  private getEntityType(
    notificationType: NotificationType
  ): "expense" | "settlement" | "category" | "security" | undefined {
    if (notificationType.startsWith("expense_")) return "expense";
    if (notificationType.startsWith("settlement_")) return "settlement";
    if (notificationType.startsWith("category_")) return "category";
    if (
      [
        "password_changed",
        "password_reset",
        "new_login",
        "failed_login_attempts",
        "session_revoked",
        "mfa_enabled",
        "mfa_disabled",
      ].includes(notificationType)
    ) {
      return "security";
    }
    return undefined;
  }

  // Security-specific notification methods
  async notifyPasswordChanged(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      await db.collection("notifications").insertOne({
        userId,
        type: "password_changed",
        message: `🔐 Your password was changed successfully${deviceInfo ? ` from ${deviceInfo}` : ""}`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo, ipAddress },
        createdAt: now,
      });
    } catch (error) {
      // FIX M37: Log security notification errors
      logger.error("Failed to send password change notification", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async notifyPasswordReset(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.collection("notifications").insertOne({
        userId,
        type: "password_reset",
        message: `🔐 Your password was reset${deviceInfo ? ` from ${deviceInfo}` : ""}`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo, ipAddress },
        createdAt: now,
      });
    } catch (error) {
      // FIX M37: Log security notification errors
      logger.error("Failed to send password reset notification", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async notifyNewLogin(
    userId: string,
    deviceInfo: string,
    location?: string,
    excludeSessionId?: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const locationStr = location ? ` from ${location}` : "";
      const message = `🔔 New login detected: ${deviceInfo}${locationStr}`;

      await db.collection("notifications").insertOne({
        userId,
        type: "new_login",
        message,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo, location, excludeSessionId },
        createdAt: now,
      });
    } catch {
      // Silent fail - notification is not critical
    }
  }

  async notifyFailedLoginAttempts(
    userId: string,
    attemptCount: number
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.collection("notifications").insertOne({
        userId,
        type: "failed_login_attempts",
        message: `⚠️ ${attemptCount} failed login attempts detected on your account`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { attemptCount },
        createdAt: now,
      });
    } catch (error) {
      // FIX M37: Log security notification errors
      logger.error("Failed to send failed login attempts notification", {
        userId,
        attemptCount,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async notifySessionRevoked(
    userId: string,
    deviceInfo: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.collection("notifications").insertOne({
        userId,
        type: "session_revoked",
        message: `🚪 A session was revoked: ${deviceInfo}`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo },
        createdAt: now,
      });
    } catch (error) {
      // FIX M37: Log security notification errors
      logger.error("Failed to send session revoked notification", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async notifyMFAEnabled(userId: string): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();

      await db.collection("notifications").insertOne({
        userId,
        type: "mfa_enabled",
        message: `✅ Two-factor authentication has been enabled on your account`,
        entityType: "security",
        read: false,
        createdAt: now,
      });
    } catch (error) {
      // FIX M37: Log security notification errors
      logger.error("Failed to send MFA enabled notification", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async notifyMFADisabled(userId: string): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();

      await db.collection("notifications").insertOne({
        userId,
        type: "mfa_disabled",
        message: `⚠️ Two-factor authentication has been disabled on your account`,
        entityType: "security",
        read: false,
        createdAt: now,
      });
    } catch (error) {
      // FIX M37: Log security notification errors
      logger.error("Failed to send MFA disabled notification", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Clean up expired notifications (should be run periodically)
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();

      const result = await db.collection("notifications").deleteMany({
        expiresAt: { $lt: now },
      });

      return result.deletedCount;
    } catch (error) {
      // FIX M37: Log cleanup errors
      logger.error("Failed to cleanup expired notifications", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
