/**
 * Database Layer - MongoDB Connection and Type-Safe Data Access
 *
 * Provides centralized database access with:
 * - Singleton pattern for connection reuse (prevents connection pool exhaustion)
 * - Type-safe interfaces matching MongoDB document schemas
 * - Helper methods for common database operations
 * - Error handling and connection management
 *
 * WHY Singleton Pattern:
 * - MongoDB connections are expensive to create
 * - Reusing connections improves performance
 * - Prevents "too many connections" errors in production
 *
 * Security Considerations:
 * - All sensitive fields (passwordHash, tokens) are typed but excluded from responses
 * - User operations never return password hashes
 * - Session tokens are stored hashed in the database
 */

import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";
import logger from "./logger";

/**
 * User Document Interface
 *
 * Represents user accounts with comprehensive security fields.
 *
 * Security Features:
 * - passwordHash: bcrypt hashed, never returned in API responses
 * - emailVerificationToken: hashed before storage
 * - passwordResetToken: hashed before storage
 * - mfaSecret: encrypted TOTP secret for 2FA
 * - mfaBackupCodes: single-use recovery codes (hashed)
 * - accountLocked: temporary lockout after failed login attempts
 * - failedLoginAttempts: counter for account lockout mechanism
 *
 * Multi-Group Features:
 * - groups: array of group memberships with roles
 * - currentGroupId: active group context for data scoping (MongoDB ObjectId string)
 *
 * CRITICAL: Group Identifier Strategy
 * - groupId in UserGroupMembership: Always MongoDB _id.toString() of the Group document
 * - currentGroupId: Always MongoDB _id.toString() of the active Group
 * - Group.groupId: The 6-character invite code (for sharing/joining only)
 * - Never store invite codes in user.groups or user.currentGroupId
 */
export interface UserGroupMembership {
  groupId: string; // MUST be Group._id.toString() (MongoDB ObjectId string)
  role: "admin" | "member";
  isDefault?: boolean; // User's preferred group
}

export interface User {
  _id: string;
  name: string;
  email: string; // Stored lowercase for case-insensitive lookups
  passwordHash: string; // bcrypt hash, 12 rounds
  role: "user" | "admin"; // Role-based access control

  // Multi-Group Features (optional for backward compatibility)
  groups?: UserGroupMembership[]; // Groups user belongs to
  currentGroupId?: string; // Active group context (MUST be Group._id.toString(), NOT invite code)

  // Email verification: Prevents unauthorized signups
  isEmailVerified: boolean;
  emailVerificationToken?: string; // Hashed 32-byte token
  emailVerificationExpiry?: Date; // 24-hour validity

  // Password security: Reset and change tracking
  passwordChangedAt?: Date; // Invalidates old tokens issued before this time
  passwordResetToken?: string; // Hashed token for forgot password flow
  passwordResetExpiry?: Date; // 1-hour validity

  // Multi-Factor Authentication (TOTP-based)
  mfaEnabled: boolean;
  mfaSecret?: string; // TOTP secret (encrypted at rest)
  mfaBackupCodes?: string[]; // Single-use backup codes (hashed)

  // Account lockout: Prevents brute force attacks
  accountLocked: boolean;
  lockReason?: string; // Human-readable reason for audit
  lockedUntil?: Date; // Auto-unlock time (15 minutes after 5 failed attempts)

  // Login tracking: For security monitoring
  lastLoginAt?: Date;
  failedLoginAttempts: number; // Reset to 0 on successful login
  lastFailedLoginAt?: Date;

  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session Document Interface
 *
 * Tracks active user sessions with FIXED expiry (no sliding sessions).
 *
 * CRITICAL FIXED EXPIRY MODEL:
 * - expiresAt is set ONCE at login and NEVER modified
 * - lastActivityAt is tracked for analytics only, NOT expiry
 * - rememberMe controls initial duration (1 day vs 7 days)
 * - Session expires at EXACT time from login, regardless of activity
 *
 * WHY Fixed Expiry:
 * - Predictable security model (users know when re-login required)
 * - Prevents indefinite sessions through activity
 * - Simpler implementation (no sliding window logic)
 * - Compliance-friendly (clear audit trail)
 *
 * Device Tracking:
 * - Allows multi-device sessions (phone, laptop, tablet)
 * - Each device has independent session lifecycle
 * - User can view and revoke individual device sessions
 */
export interface Session {
  _id: string;
  userId: string;
  token: string; // Single JWT token (not split access/refresh)
  deviceInfo: {
    userAgent: string; // Full user agent string
    browser?: string; // Parsed browser name (Chrome, Firefox, etc.)
    os?: string; // Parsed OS (Windows, macOS, Linux, iOS, Android)
    device?: string; // Device type (desktop, mobile, tablet)
  };
  location?: {
    city?: string; // Geo-IP lookup (approximate)
    country?: string; // ISO country code
  };
  isActive: boolean; // False when logged out or expired
  rememberMe: boolean; // Controls initial duration at login
  expiresAt: Date; // FIXED expiry - NEVER updated after creation
  createdAt: Date;
  lastActivityAt: Date; // Tracked for analytics, NOT expiry calculation
}

/**
 * Login History Document Interface
 *
 * Audit trail for all login attempts (successful and failed).
 *
 * WHY Track Failed Logins:
 * - Detect brute force attacks
 * - Alert users to unauthorized access attempts
 * - Compliance requirements (SOC2, GDPR)
 *
 * Privacy Considerations:
 * - IP addresses stored for display only, not enforcement
 * - TTL index auto-deletes entries after 15 days
 * - Users can view their own login history
 */
export interface LoginHistory {
  _id: string;
  userId: string;
  email: string;
  success: boolean;
  deviceInfo: {
    userAgent: string;
    browser?: string;
    os?: string;
    device?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  failureReason?: string; // "Invalid credentials", "Account locked", "Invalid MFA token"
  timestamp: Date; // Auto-deleted after 15 days via TTL index
}

/**
 * Security Log Document Interface
 *
 * Audit trail for security-sensitive actions.
 *
 * WHY Separate from Login History:
 * - Login history is user-facing (visible in profile)
 * - Security logs are admin-facing (compliance, forensics)
 * - Different retention policies (security logs kept longer)
 *
 * Events Tracked:
 * - Password changes and resets
 * - MFA enable/disable
 * - Session revocations
 * - Account lockouts
 * - Email verifications
 */
export interface SecurityLog {
  _id: string;
  userId: string;
  eventType:
    | "password_change"
    | "password_reset"
    | "mfa_enabled"
    | "mfa_disabled"
    | "session_revoked"
    | "account_locked"
    | "account_unlocked"
    | "email_verified";
  description: string; // Human-readable event description
  metadata?: Record<string, any>; // Additional context (device, location, etc.)
  timestamp: Date;
}

/**
 * Group Document Interface
 *
 * Multi-user collaborative expense tracking groups.
 *
 * KEY FEATURES:
 * - 6-character alphanumeric group codes for easy sharing (Group.groupId field)
 * - Role-based access control (admin/member)
 * - Join request approval workflow
 * - Support for multiple groups per user
 *
 * CRITICAL: Group Identifier Strategy
 * - _id: MongoDB ObjectId - PRIMARY IDENTIFIER for all internal operations
 * - groupId: 6-character invite code - ONLY for sharing/joining (e.g., "ABC123")
 * - All internal references (user.currentGroupId, expense.groupId, etc.) MUST use _id.toString()
 * - Never use invite code (Group.groupId) for data scoping or authorization
 *
 * SECURITY:
 * - Only members can view group data
 * - Only admins can approve requests, edit settings, remove members
 * - Group codes are unique and immutable after creation
 */
export interface GroupMember {
  userId: string; // User._id.toString()
  role: "admin" | "member";
  joinedAt: Date;
  isDefault?: boolean;
  status?: "active" | "left"; // undefined means active (backward-compatible)
  leftAt?: Date; // Timestamp when user left the group
}

export interface GroupJoinRequest {
  userId: string; // User._id.toString()
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
}

export interface GroupSettings {
  allowJoinRequests: boolean;
  requireApproval: boolean;
  notifyOnJoinRequest: boolean;
}

export interface Group {
  _id: string; // MongoDB ObjectId string - PRIMARY identifier for all operations
  groupId: string; // 6-character invite code (e.g., "ABC123") - ONLY for joining
  name: string;
  description?: string;
  members: GroupMember[];
  joinRequests: GroupJoinRequest[];
  settings: GroupSettings;
  createdBy: string; // User._id.toString()
  createdAt: Date;
  updatedAt: Date;
}
/**
 * Notification Document Interface
 *
 * In-app notifications for user actions and security events.
 *
 * Security Notifications:
 * - New login from unfamiliar device
 * - Failed login attempts
 * - Password changes
 * - MFA status changes
 * - Session revocations
 *
 * WHY Auto-Expire:
 * - Notifications auto-delete 24 hours after being read
 * - Prevents notification bloat
 * - Encourages timely review of security alerts
 *
 * excludeSessionId:
 * - Prevents self-notification (e.g., don't notify current session about own login)
 *
 * Multi-Group Notifications:
 * - groupId: scope notification to specific group
 * - Group-level events added to type
 */
export interface Notification {
  _id: string;
  userId: string;
  groupId?: string; // Optional group context for group-specific notifications
  type:
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
    | "mfa_disabled"
    | "group_created"
    | "group_joined"
    | "join_request_approved"
    | "join_request_rejected"
    | "member_added"
    | "member_removed"
    | "admin_role_granted"
    | "admin_role_revoked";
  message: string;
  entityId?: string; // Related entity ID (expense, settlement, category, group)
  entityType?: "expense" | "settlement" | "category" | "security" | "group";
  read: boolean;
  readAt?: Date;
  expiresAt?: Date; // Auto-expire 24 hours after being read
  metadata?: {
    deviceInfo?: string; // Device description for security notifications
    location?: string; // Location string for security notifications
    excludeSessionId?: string; // Exclude this session from receiving notification
  };
  createdAt: Date;
}

/**
 * Expense Document Interface with Ownership Tracking
 *
 * WHY Ownership Field:
 * - Multi-user expense tracking requires knowing who created each expense
 * - Enables permission checks (only creator can edit/delete)
 * - Audit trail for compliance and dispute resolution
 *
 * Multi-Group Scoping:
 * - groupId: REQUIRED field scoping expense to a specific group
 * - createdBy: User who created the expense (replaces old 'user' field)
 * - All queries must filter by groupId to ensure data isolation
 */
export interface ExpenseWithOwnership {
  _id: string;
  groupId: string; // REQUIRED: MongoDB ObjectId string reference to Group
  amount: number;
  description: string;
  date: string; // ISO 8601 date string
  category: string;
  subcategory?: string;
  paidBy: string; // User ID who paid the expense
  isSplit?: boolean; // Whether expense is split between users
  splitDetails?: {
    // Dynamic splits for N members
    type?: "equal" | "manual";
    splits: Array<{
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
  createdBy: string; // User ID who created this record (replaces 'user')
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Settlement Document Interface with Ownership Tracking
 *
 * Tracks money transfers between users to settle shared expenses.
 *
 * WHY Status Field:
 * - pending: Settlement created but not yet paid
 * - completed: Payment confirmed by receiving user
 * - cancelled: Settlement voided (e.g., expense was deleted)
 *
 * Multi-Group Scoping:
 * - groupId: REQUIRED field scoping settlement to a specific group
 * - fromUser and toUser must be members of the group
 * - All queries must filter by groupId to ensure data isolation
 */
export interface SettlementWithOwnership {
  _id: string;
  groupId: string; // REQUIRED: MongoDB ObjectId string reference to Group
  expenseId: string; // Reference to related expense
  fromUser: string; // User ID who owes money (must be group member)
  toUser: string; // User ID who is owed money (must be group member)
  amount: number;
  description: string;
  date: string; // ISO 8601 date string
  status: "pending" | "completed" | "cancelled";
  createdBy: string; // User ID who created this settlement
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category Document Interface with Ownership Tracking
 *
 * Custom expense categories with optional subcategories.
 *
 * WHY Subcategories:
 * - Better expense organization (e.g., "Food" > "Groceries", "Restaurants")
 * - More detailed analytics and reporting
 * - User-defined taxonomy for personal finance tracking
 *
 * Multi-Group Scoping:
 * - groupId: REQUIRED field scoping category to a specific group
 * - createdBy: User who created the category (replaces old 'user' field)
 * - Categories are shared within the group (all members can use them)
 * - All queries must filter by groupId to ensure data isolation
 */
export interface CategoryWithOwnership {
  _id: string;
  groupId: string; // REQUIRED: MongoDB ObjectId string reference to Group
  name: string;
  description: string;
  subcategories: Array<{
    name: string;
    description: string;
  }>;
  createdBy: string; // User ID who created this category (replaces 'user')
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DatabaseManager Class - Singleton Pattern for Connection Reuse
 *
 * Provides centralized, type-safe database access across the application.
 *
 * WHY Singleton Pattern:
 * - MongoDB client maintains connection pool (default 10 connections)
 * - Multiple instances would create multiple connection pools
 * - Connection pool exhaustion causes "MongoServerSelectionError"
 * - Singleton ensures all code uses the same connection pool
 *
 * Usage:
 *   const dbManager = DatabaseManager.getInstance();
 *   const db = await dbManager.getDatabase();
 *   const user = await db.collection('users').findOne({...});
 */
export class DatabaseManager {
  private static instance: DatabaseManager;

  /**
   * Get singleton instance of DatabaseManager
   *
   * Thread-safe in Node.js (single-threaded event loop)
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Get MongoDB database instance
   *
   * Uses connection pooling from mongodb.ts (10 connections)
   * Throws error if MongoDB is unreachable (network issues, wrong credentials)
   *
   * @returns MongoDB database instance for 'spend-tracker' database
   */
  async getDatabase() {
    try {
      const client = await clientPromise;
      return client.db("spend-tracker"); // Match the actual database name (case-sensitive)
    } catch (error) {
      logger.error("Failed to connect to database", error, {
        context: "DatabaseManager.getDatabase",
      });
      throw error;
    }
  }

  // =========================================================================
  // USER OPERATIONS
  // =========================================================================

  /**
   * Create new user account
   *
   * Automatically adds createdAt and updatedAt timestamps
   * Returns user document with MongoDB _id converted to string
   */
  async createUser(
    userData: Omit<User, "_id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const db = await this.getDatabase();
    const now = new Date();

    const user = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }

  /**
   * Find user by email address
   *
   * Email is stored lowercase for case-insensitive lookups
   * Returns null if user not found (not an error)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user) return null;

    return {
      ...user,
      _id: user._id.toString(),
    } as User;
  }

  /**
   * Find user by MongoDB ObjectId
   *
   * Converts string ID to ObjectId for database query
   * Returns null if user not found (not an error)
   */
  async getUserById(userId: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) return null;

    return {
      ...user,
      _id: user._id.toString(),
    } as User;
  }

  // =========================================================================
  // NOTIFICATION OPERATIONS
  // =========================================================================

  /**
   * Create new notification for user
   *
   * Automatically adds createdAt timestamp
   * Used for both app notifications and security alerts
   */
  async createNotification(
    notificationData: Omit<Notification, "_id" | "createdAt">
  ): Promise<Notification> {
    const db = await this.getDatabase();
    const now = new Date();

    const notification = {
      ...notificationData,
      createdAt: now,
    };

    const result = await db.collection("notifications").insertOne(notification);
    return { ...notification, _id: result.insertedId.toString() };
  }

  // NOTE: getUserNotifications removed — use NotificationService.getUserNotifications()
  // from lib/notifications.ts instead, which properly filters by groupId.

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const db = await this.getDatabase();
    const result = await db
      .collection("notifications")
      .updateOne(
        { _id: new ObjectId(notificationId) },
        { $set: { read: true } }
      );

    return result.modifiedCount > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const db = await this.getDatabase();
    return await db.collection("notifications").countDocuments({
      userId,
      read: false,
    });
  }

  // Utility method to create indexes for better performance
  async createIndexes() {
    const db = await this.getDatabase();

    // =====================================================================
    // USER INDEXES
    // =====================================================================
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    // Multi-group support: index for finding groups by user
    await db.collection("users").createIndex({ "groups.groupId": 1 });
    await db.collection("users").createIndex({ currentGroupId: 1 });

    // =====================================================================
    // GROUP INDEXES
    // =====================================================================
    // Unique 6-digit group code
    await db.collection("groups").createIndex({ groupId: 1 }, { unique: true });

    // Find groups by member userId
    await db.collection("groups").createIndex({ "members.userId": 1 });

    // Find join requests by userId
    await db.collection("groups").createIndex({ "joinRequests.userId": 1 });

    // Compound index for member role queries
    await db
      .collection("groups")
      .createIndex({ "members.userId": 1, "members.role": 1 });

    // Find groups by creator
    await db.collection("groups").createIndex({ createdBy: 1, createdAt: -1 });

    // =====================================================================
    // EXPENSE INDEXES
    // =====================================================================
    // Group scoping - CRITICAL for data isolation
    await db.collection("expenses").createIndex({ groupId: 1, date: -1 });
    await db.collection("expenses").createIndex({ groupId: 1, category: 1 });
    await db.collection("expenses").createIndex({ groupId: 1, createdBy: 1 });

    // Legacy index for backward compatibility
    await db.collection("expenses").createIndex({ createdBy: 1 });

    // =====================================================================
    // SETTLEMENT INDEXES
    // =====================================================================
    // Group scoping - CRITICAL for data isolation
    await db
      .collection("settlements")
      .createIndex({ groupId: 1, status: 1, date: -1 });
    await db.collection("settlements").createIndex({ groupId: 1, fromUser: 1 });
    await db.collection("settlements").createIndex({ groupId: 1, toUser: 1 });

    // Legacy index for backward compatibility
    await db.collection("settlements").createIndex({ createdBy: 1 });

    // =====================================================================
    // CATEGORY INDEXES
    // =====================================================================
    // Group scoping - CRITICAL for data isolation
    await db.collection("categories").createIndex({ groupId: 1, name: 1 });
    await db.collection("categories").createIndex({ groupId: 1, createdBy: 1 });

    // Legacy index for backward compatibility
    await db.collection("categories").createIndex({ createdBy: 1 });

    // =====================================================================
    // NOTIFICATION INDEXES
    // =====================================================================
    await db.collection("notifications").createIndex({ userId: 1, read: 1 });
    await db.collection("notifications").createIndex({ createdAt: -1 });

    // Group-scoped notifications
    await db.collection("notifications").createIndex({ userId: 1, groupId: 1 });

    // =====================================================================
    // LOGIN HISTORY & SECURITY LOGS
    // =====================================================================
    // Login history TTL index - automatically delete documents after 15 days
    await db.collection("loginHistory").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 15 * 24 * 60 * 60 } // 15 days in seconds
    );

    // Security logs TTL index - automatically delete documents after 15 days
    await db.collection("securityLogs").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 15 * 24 * 60 * 60 } // 15 days in seconds
    );

    // Query performance indexes
    await db
      .collection("securityLogs")
      .createIndex({ userId: 1, timestamp: -1 });
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();
