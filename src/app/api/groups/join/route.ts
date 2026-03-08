/**
 * Join Group API Route
 *
 * Endpoint:
 * - POST /api/groups/join - Request to join group by 6-digit code
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
import { validateGroupCode, getGroupByCode } from "@/lib/utils/group";
import { ObjectId } from "mongodb";
import { error as logError } from "@/lib/logger";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * POST /api/groups/join
 *
 * Request to join a group using 6-digit code
 * If group settings allow, creates a join request for admin approval
 *
 * Body:
 * {
 *   groupCode: string (6-digit alphanumeric code)
 * }
 */
export const POST = withAuth(async (req: NextRequest, context) => {
  try {
    const { user } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const body = await req.json();

    // Validate group code format
    if (!body.groupCode || typeof body.groupCode !== "string") {
      return validationErrorResponse({ groupCode: "Group code is required" });
    }

    const codeValidation = validateGroupCode(body.groupCode);
    if (!codeValidation.valid) {
      return validationErrorResponse({ groupCode: codeValidation.error! });
    }

    const groupCode = body.groupCode.toUpperCase();

    // Find group by code
    const group = await getGroupByCode(groupCode);
    if (!group) {
      return errorResponse(
        "Group not found. Please check the code and try again.",
        404
      );
    }

    // Check if user is already an active member
    const isMember = group.members.some(
      (m) => m.userId === user.id && (!m.status || m.status === "active")
    );
    if (isMember) {
      return errorResponse("You are already a member of this group", 400);
    }

    // Handle re-join: if user previously left, treat their join request normally
    // Their old records remain visible; on approval the status will be reset to active

    // Check if user already has a pending request
    const hasPendingRequest = group.joinRequests.some(
      (r) => r.userId === user.id && r.status === "pending"
    );
    if (hasPendingRequest) {
      return errorResponse(
        "You already have a pending join request for this group",
        400
      );
    }

    // Check if group allows join requests
    if (!group.settings.allowJoinRequests) {
      return errorResponse(
        "This group is not accepting new members at this time",
        403
      );
    }

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");

    const now = new Date();

    // Add join request to group
    await groupsCollection.updateOne(
      { _id: new ObjectId(group._id) },
      {
        $push: {
          joinRequests: {
            userId: user.id,
            requestedAt: now,
            status: "pending",
          } as any,
        },
        $set: { updatedAt: now },
      }
    );

    // Get admin users for notifications
    const adminMembers = group.members.filter((m) => m.role === "admin");

    // Notify admins if settings enabled
    if (group.settings.notifyOnJoinRequest && adminMembers.length > 0) {
      for (const admin of adminMembers) {
        await dbManager.createNotification({
          userId: admin.userId,
          groupId: group._id,
          type: "member_added",
          message: `${user.email} requested to join "${group.name}"`,
          entityId: group._id,
          entityType: "group",
          read: false,
          metadata: {
            excludeSessionId: undefined,
          },
        });
      }
    }

    return successResponse({
      message:
        "Join request sent successfully. You will be notified when approved.",
      requiresApproval: true,
      group: {
        _id: group._id,
        name: group.name,
        description: group.description,
        memberCount: group.members.length,
      },
    });
  } catch (error) {
    logError("Error joining group", error, { userId: context.user?.id });
    return errorResponse("Failed to send join request", 500);
  }
});
