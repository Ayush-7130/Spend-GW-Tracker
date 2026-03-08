/**
 * Individual Group API Routes
 *
 * Endpoints:
 * - GET    /api/groups/[groupId] - Get group details with members
 * - PATCH  /api/groups/[groupId] - Update group (admin only)
 * - DELETE /api/groups/[groupId] - Delete group (admin only)
 *
 * Authorization: Requires authentication and group membership
 */

import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import {
  validateGroupAccess,
  validateGroupName,
  validateGroupDescription,
} from "@/lib/utils/group";
import { ObjectId } from "mongodb";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/groups/[groupId]
 *
 * Get detailed group information including members
 * Requires group membership
 */
export const GET = withAuth(async (req: NextRequest, context) => {
  try {
    const { user, params } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const resolvedParams = await params;
    const groupId = resolvedParams?.groupId;
    if (!groupId || !ObjectId.isValid(groupId)) {
      return validationErrorResponse({ groupId: "Invalid group ID" });
    }

    // Validate user access to group
    const group = await validateGroupAccess(groupId, user.id);

    // Get user details for members
    const db = await dbManager.getDatabase();
    const usersCollection = db.collection("users");

    const memberUserIds = group.members.map((m) => new ObjectId(m.userId));
    const memberUsers = await usersCollection
      .find({ _id: { $in: memberUserIds } })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();

    // Enrich members with user data (include all — active + former — for display in group settings)
    const enrichedMembers = group.members.map((member) => {
      const userData = memberUsers.find(
        (u) => u._id.toString() === member.userId
      );
      return {
        userId: member.userId,
        name: userData?.name || "Unknown",
        email: userData?.email || "",
        role: member.role,
        joinedAt: member.joinedAt,
        status: member.status || "active",
        leftAt: member.leftAt,
      };
    });

    const activeMemberCount = group.members.filter(
      (m) => !m.status || m.status === "active"
    ).length;

    return successResponse({
      group: {
        _id: group._id,
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        members: enrichedMembers,
        memberCount: activeMemberCount,
        pendingRequestsCount: group.joinRequests.filter(
          (r) => r.status === "pending"
        ).length,
        settings: group.settings,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch group";
    return errorResponse(message, 403);
  }
});

/**
 * PATCH /api/groups/[groupId]
 *
 * Update group details (name, description, settings)
 * Requires admin role
 *
 * Body:
 * {
 *   name?: string
 *   description?: string
 *   settings?: {
 *     allowJoinRequests?: boolean
 *     requireApproval?: boolean
 *     notifyOnJoinRequest?: boolean
 *   }
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
    if (!groupId || !ObjectId.isValid(groupId)) {
      return validationErrorResponse({ groupId: "Invalid group ID" });
    }

    // Validate user is admin
    const group = await validateGroupAccess(groupId, user.id, true);

    const body = await req.json();
    const errors: Record<string, string> = {};

    // Validate name if provided
    if (body.name !== undefined) {
      const nameValidation = validateGroupName(body.name);
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }
    }

    // Validate description if provided
    if (body.description !== undefined) {
      const descValidation = validateGroupDescription(body.description);
      if (!descValidation.valid) {
        errors.description = descValidation.error!;
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    // Build update object
    const updateFields: any = { updatedAt: new Date() };

    if (body.name !== undefined) {
      updateFields.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateFields.description = body.description.trim();
    }

    if (body.settings !== undefined) {
      // Merge settings with existing
      updateFields["settings.allowJoinRequests"] =
        body.settings.allowJoinRequests ?? group.settings.allowJoinRequests;
      updateFields["settings.requireApproval"] =
        body.settings.requireApproval ?? group.settings.requireApproval;
      updateFields["settings.notifyOnJoinRequest"] =
        body.settings.notifyOnJoinRequest ?? group.settings.notifyOnJoinRequest;
    }

    // Update group
    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");

    await groupsCollection.updateOne(
      { _id: new ObjectId(groupId) },
      { $set: updateFields }
    );

    return successResponse({
      message: "Group updated successfully",
      group: {
        _id: group._id,
        name: body.name?.trim() || group.name,
        description: body.description?.trim() || group.description,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update group";
    return errorResponse(message, 403);
  }
});

/**
 * DELETE /api/groups/[groupId]
 *
 * Delete group permanently
 * Requires admin role
 * Also removes group from all members' groups arrays
 */
export const DELETE = withAuth(async (req: NextRequest, context) => {
  try {
    const { user, params } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const resolvedParams = await params;
    const groupId = resolvedParams?.groupId;
    if (!groupId || !ObjectId.isValid(groupId)) {
      return validationErrorResponse({ groupId: "Invalid group ID" });
    }

    // Validate user is admin
    const group = await validateGroupAccess(groupId, user.id, true);

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");
    const usersCollection = db.collection("users");

    // Remove group from all members' groups arrays
    await usersCollection.updateMany(
      { "groups.groupId": groupId },
      {
        $pull: { groups: { groupId } } as any,
        $set: { updatedAt: new Date() },
      }
    );

    // Update users who had this as current group
    await usersCollection.updateMany(
      { currentGroupId: groupId },
      {
        $unset: { currentGroupId: "" },
        $set: { updatedAt: new Date() },
      }
    );

    // Delete the group
    await groupsCollection.deleteOne({ _id: new ObjectId(groupId) });

    // Cascade delete all group-related data
    const groupObjectId = new ObjectId(groupId);
    await Promise.all([
      db.collection("expenses").deleteMany({ groupId: groupObjectId }),
      db.collection("settlements").deleteMany({ groupId: groupObjectId }),
      db.collection("categories").deleteMany({ groupId: groupObjectId }),
      db.collection("notifications").deleteMany({ groupId: groupId }),
    ]);

    return successResponse({
      message: `Group "${group.name}" has been deleted`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete group";
    return errorResponse(message, 403);
  }
});
