/**
 * Switch Group API Route
 *
 * Endpoint:
 * - POST /api/groups/switch - Switch user's active group
 *
 * Authorization: Requires authentication
 */

import { NextRequest } from "next/server";
import {
  withAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { getGroupById, getGroupByCode } from "@/lib/utils/group";
import { ObjectId } from "mongodb";
import { error as logError } from "@/lib/logger";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/groups/switch
 *
 * Switch user's active group (currentGroupId)
 * User must be a member of the target group
 *
 * Body:
 * {
 *   groupId: string (MongoDB ObjectId)
 * }
 */
export const POST = withAuth(async (req: NextRequest, context) => {
  try {
    const { user } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const body = await req.json();

    // Validate groupId
    if (!body.groupId || typeof body.groupId !== "string") {
      return validationErrorResponse({ groupId: "Group ID is required" });
    }

    // Try to get group by MongoDB _id (ObjectId) or by groupId (6-digit code)
    let group;
    if (ObjectId.isValid(body.groupId)) {
      // MongoDB ObjectId format - use getGroupById
      group = await getGroupById(body.groupId);
    } else {
      // 6-digit code format - use getGroupByCode
      group = await getGroupByCode(body.groupId);
    }

    if (!group) {
      return errorResponse("Group not found", 404);
    }

    // Check if user is a member
    const isMember = group.members.some((m: any) => m.userId === user.id);
    if (!isMember) {
      return errorResponse("You are not a member of this group", 403);
    }

    // Update user's currentGroupId to use the group's MongoDB _id (NOT the invite code)
    // CRITICAL: Must use _id for consistency with authorization and data scoping
    const db = await dbManager.getDatabase();
    const usersCollection = db.collection("users");
    const now = new Date();

    await usersCollection.updateOne(
      { _id: new ObjectId(user.id) },
      {
        $set: {
          currentGroupId: group._id, // MUST use MongoDB _id, not invite code
          updatedAt: now,
        },
      }
    );

    // Return success response
    // No need to update JWT token - currentGroupId is read from database on each request
    return successResponse({
      message: `Switched to group "${group.name}"`,
      currentGroupId: group._id, // Return the MongoDB _id (what's actually stored)
      group: {
        _id: group._id,
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        memberCount: group.members.length,
      },
    });
  } catch (error) {
    logError("Error switching group", error, { userId: context.user?.id });
    return errorResponse("Failed to switch group", 500);
  }
});
