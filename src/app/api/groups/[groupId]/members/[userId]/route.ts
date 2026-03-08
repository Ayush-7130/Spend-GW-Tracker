/**
 * Member Management API Routes
 *
 * Endpoints:
 * - DELETE /api/groups/[groupId]/members/[userId] - Remove member from group
 * - PATCH  /api/groups/[groupId]/members/[userId] - Update member role
 *
 * Authorization: Requires authentication, group membership, and admin role
 */

import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { validateGroupAccess, canRemoveMember } from "@/lib/utils/group";
import { ObjectId } from "mongodb";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * DELETE /api/groups/[groupId]/members/[userId]
 *
 * Remove a member from the group
 * Requires admin role
 * Cannot remove last admin
 */
export const DELETE = withAuth(async (req: NextRequest, context) => {
  try {
    const { user, params } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const resolvedParams = await params;
    const groupId = resolvedParams?.groupId;
    const memberId = resolvedParams?.userId;

    if (!groupId || !ObjectId.isValid(groupId)) {
      return validationErrorResponse({ groupId: "Invalid group ID" });
    }

    if (!memberId || !ObjectId.isValid(memberId)) {
      return validationErrorResponse({ userId: "Invalid user ID" });
    }

    // Validate group access:
    // - Removing yourself (leaving) only requires membership, not admin
    // - Removing someone else requires admin
    const isSelfLeave = memberId === user.id;
    const group = await validateGroupAccess(groupId, user.id, !isSelfLeave);

    // Authorization check:
    // - Self-leave: always allowed, unless leaving would remove the last admin
    // - Removing others: delegate to canRemoveMember (admin-only)
    if (isSelfLeave) {
      const isTargetAdmin = group.members.some(
        (m) =>
          m.userId === memberId &&
          m.role === "admin" &&
          (!m.status || m.status === "active")
      );
      const adminCount = group.members.filter(
        (m) => m.role === "admin" && (!m.status || m.status === "active")
      ).length;
      if (isTargetAdmin && adminCount === 1) {
        return errorResponse(
          "Cannot leave as the last admin. Transfer admin role first.",
          400
        );
      }
    } else {
      const removeCheck = canRemoveMember(group, memberId, user.id);
      if (!removeCheck.canRemove) {
        return errorResponse(removeCheck.reason!, 400);
      }
    }

    // Check if active member exists (cannot remove someone who has already left)
    const memberExists = group.members.some(
      (m) => m.userId === memberId && (!m.status || m.status === "active")
    );
    if (!memberExists) {
      return errorResponse("User is not a member of this group", 404);
    }

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");
    const usersCollection = db.collection("users");
    const now = new Date();

    // Soft-delete: mark member as 'left' with a timestamp instead of removing.
    // Their expenses/records remain visible to the group, tagged as from a former member.
    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId), "members.userId": memberId },
      {
        $set: {
          "members.$.status": "left",
          "members.$.leftAt": now,
          updatedAt: now,
        },
      }
    );

    // Remove group from user's groups array
    await usersCollection.updateOne(
      { _id: new ObjectId(memberId) },
      {
        $pull: {
          groups: { groupId: groupId } as any,
        },
        $set: { updatedAt: now },
      }
    );

    // If this was user's current group, unset it
    await usersCollection.updateOne(
      { _id: new ObjectId(memberId), currentGroupId: groupId },
      {
        $unset: { currentGroupId: "" },
      }
    );

    // Notify removed member - message differs for self-leave vs admin removal
    await dbManager.createNotification({
      userId: memberId,
      type: "member_removed",
      message: isSelfLeave
        ? `You left the group "${group.name}"`
        : `You were removed from "${group.name}"`,
      entityId: groupId,
      entityType: "group",
      read: false,
    });

    return successResponse({
      message: "Member removed successfully",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove member";
    return errorResponse(message, 403);
  }
});

/**
 * PATCH /api/groups/[groupId]/members/[userId]
 *
 * Update member role (admin <-> member)
 * Requires admin role
 * Cannot demote last admin
 *
 * Body:
 * {
 *   role: 'admin' | 'member'
 * }
 */
export const PATCH = withAuth(async (req: NextRequest, context) => {
  try {
    const { user, params } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const resolvedParams = await params;
    const groupId = resolvedParams?.groupId;
    const memberId = resolvedParams?.userId;

    if (!groupId || !ObjectId.isValid(groupId)) {
      return validationErrorResponse({ groupId: "Invalid group ID" });
    }

    if (!memberId || !ObjectId.isValid(memberId)) {
      return validationErrorResponse({ userId: "Invalid user ID" });
    }

    // Validate user is admin
    const group = await validateGroupAccess(groupId, user.id, true);

    const body = await req.json();

    if (!body.role || !["admin", "member"].includes(body.role)) {
      return validationErrorResponse({
        role: 'Role must be "admin" or "member"',
      });
    }

    // Check if member exists
    const member = group.members.find((m) => m.userId === memberId);
    if (!member) {
      return errorResponse("User is not a member of this group", 404);
    }

    // Check if already has this role
    if (member.role === body.role) {
      return errorResponse(`User already has the role "${body.role}"`, 400);
    }

    // If demoting from admin, ensure not the last admin
    if (member.role === "admin" && body.role === "member") {
      const adminCount = group.members.filter((m) => m.role === "admin").length;
      if (adminCount === 1) {
        return errorResponse(
          "Cannot demote the last admin. Promote another member first.",
          400
        );
      }
    }

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");
    const usersCollection = db.collection("users");
    const now = new Date();

    // Update member role in group
    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId), "members.userId": memberId },
      {
        $set: {
          "members.$.role": body.role,
          updatedAt: now,
        },
      }
    );

    // Update role in user's groups array
    await usersCollection.updateOne(
      { _id: new ObjectId(memberId), "groups.groupId": groupId },
      {
        $set: {
          "groups.$.role": body.role,
          updatedAt: now,
        },
      }
    );

    // Notify member of role change
    const notificationType =
      body.role === "admin" ? "admin_role_granted" : "admin_role_revoked";
    const message =
      body.role === "admin"
        ? `You were promoted to admin in "${group.name}"`
        : `You were changed to member role in "${group.name}"`;

    await dbManager.createNotification({
      userId: memberId,
      groupId: groupId,
      type: notificationType,
      message,
      entityId: groupId,
      entityType: "group",
      read: false,
    });

    return successResponse({
      message: `Member role updated to ${body.role}`,
      role: body.role,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update member role";
    return errorResponse(message, 403);
  }
});
