/**
 * Join Request Action API Routes
 *
 * Endpoint:
 * - PATCH /api/groups/[groupId]/requests/[requestUserId] - Approve or reject join request
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
import { validateGroupAccess } from "@/lib/utils/group";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * PATCH /api/groups/[groupId]/requests/[requestUserId]
 *
 * Approve or reject a join request
 * Requires admin role
 *
 * Body:
 * {
 *   action: 'approve' | 'reject'
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
    const requestUserId = resolvedParams?.requestUserId;

    if (!groupId || !ObjectId.isValid(groupId)) {
      return validationErrorResponse({ groupId: "Invalid group ID" });
    }

    if (!requestUserId || !ObjectId.isValid(requestUserId)) {
      return validationErrorResponse({ requestUserId: "Invalid user ID" });
    }

    // Validate user is admin
    const group = await validateGroupAccess(groupId, user.id, true);

    const body = await req.json();

    if (!body.action || !["approve", "reject"].includes(body.action)) {
      return validationErrorResponse({
        action: 'Action must be "approve" or "reject"',
      });
    }

    // Check if join request exists and is pending
    const joinRequest = group.joinRequests.find(
      (r) => r.userId === requestUserId && r.status === "pending"
    );

    if (!joinRequest) {
      return errorResponse("Join request not found or already processed", 404);
    }

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");
    const usersCollection = db.collection("users");
    const now = new Date();

    if (body.action === "approve") {
      // FIX C11 & NEW-1: Use MongoDB transaction for atomic multi-document update
      // This prevents race conditions and ensures data consistency
      // Duplicate check MUST be inside transaction to prevent TOCTOU race condition
      const client = await clientPromise;
      const session = client.startSession();

      try {
        await session.withTransaction(async () => {
          // Re-fetch group inside transaction for latest state
          // This prevents race condition where multiple concurrent approvals bypass the check
          const currentGroup = await groupsCollection.findOne(
            { _id: new ObjectId(groupId) },
            { session }
          );

          if (!currentGroup) {
            throw new Error("Group not found");
          }

          // FIX NEW-1: Check for duplicate ACTIVE member INSIDE transaction
          const existingMember = currentGroup.members?.find(
            (m: any) => m.userId === requestUserId
          );
          const isAlreadyActiveMember =
            existingMember &&
            (!existingMember.status || existingMember.status === "active");
          if (isAlreadyActiveMember) {
            throw new Error("User is already a member of this group");
          }

          // Check if this is a re-join (previously left the group)
          const isRejoin = existingMember && existingMember.status === "left";

          if (isRejoin) {
            // Re-activate the existing member entry instead of adding a new one
            await groupsCollection.updateOne(
              { _id: new ObjectId(groupId), "members.userId": requestUserId },
              {
                $set: {
                  "members.$.status": "active",
                  "members.$.joinedAt": now,
                  "members.$.role": "member",
                  updatedAt: now,
                },
                $unset: { "members.$.leftAt": "" },
                $pull: {
                  joinRequests: { userId: requestUserId } as any,
                },
              },
              { session }
            );
          } else {
            // Add user to group members and remove join request atomically
            await groupsCollection.updateOne(
              { _id: new ObjectId(groupId) },
              {
                $push: {
                  members: {
                    userId: requestUserId,
                    role: "member",
                    joinedAt: now,
                    isDefault: false,
                    status: "active",
                  } as any,
                },
                $pull: {
                  joinRequests: { userId: requestUserId } as any,
                },
                $set: { updatedAt: now },
              },
              { session }
            );
          }

          // Check if this is user's first group
          const requestUser = await usersCollection.findOne(
            { _id: new ObjectId(requestUserId) },
            { session }
          );
          const existingGroups = requestUser?.groups || [];
          const isFirstGroup = existingGroups.length === 0;

          // Add group to user's groups array atomically
          // CRITICAL: Store MongoDB _id (group._id), not the route parameter
          await usersCollection.updateOne(
            { _id: new ObjectId(requestUserId) },
            {
              $push: {
                groups: {
                  groupId: group._id, // MUST use group._id, not route param
                  role: "member",
                  isDefault: isFirstGroup,
                } as any,
              },
              ...(isFirstGroup
                ? { $set: { currentGroupId: group._id, updatedAt: now } }
                : { $set: { updatedAt: now } }),
            },
            { session }
          );
        });
      } catch (transactionError) {
        // Handle specific transaction errors
        const errorMessage =
          transactionError instanceof Error
            ? transactionError.message
            : "Unknown error";

        if (errorMessage.includes("already a member")) {
          return errorResponse("User is already a member of this group", 409);
        }
        if (errorMessage.includes("not found")) {
          return errorResponse("Group not found", 404);
        }

        throw transactionError; // Re-throw for general error handling
      } finally {
        await session.endSession();
      }

      // Notify user of approval
      await dbManager.createNotification({
        userId: requestUserId,
        groupId: group._id, // Use group._id for consistency
        type: "join_request_approved",
        message: `Your request to join "${group.name}" was approved`,
        entityId: group._id,
        entityType: "group",
        read: false,
      });

      // Notify other admins
      const otherAdmins = group.members.filter(
        (m) => m.role === "admin" && m.userId !== user.id
      );

      for (const admin of otherAdmins) {
        await dbManager.createNotification({
          userId: admin.userId,
          groupId: group._id, // Use group._id for consistency
          type: "member_added",
          message: `${user.email} approved a member to join "${group.name}"`,
          entityId: group._id,
          entityType: "group",
          read: false,
        });
      }

      return successResponse({
        message: "Join request approved successfully",
        action: "approved",
      });
    } else {
      // Reject - just remove the request
      await groupsCollection.updateOne(
        { _id: new ObjectId(groupId) },
        {
          $pull: {
            joinRequests: { userId: requestUserId } as any,
          },
          $set: { updatedAt: now },
        }
      );

      // Notify user of rejection
      await dbManager.createNotification({
        userId: requestUserId,
        groupId: group._id, // Use group._id for consistency
        type: "join_request_rejected",
        message: `Your request to join "${group.name}" was declined`,
        entityId: group._id,
        entityType: "group",
        read: false,
      });

      return successResponse({
        message: "Join request rejected",
        action: "rejected",
      });
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process join request";
    return errorResponse(message, 403);
  }
});
