/**
 * Join Requests API Routes
 *
 * Endpoint:
 * - GET /api/groups/[groupId]/requests - List pending join requests (admin only)
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

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/groups/[groupId]/requests
 *
 * Get all pending join requests for a group
 * Requires admin role
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

    // Validate user is admin
    const group = await validateGroupAccess(groupId, user.id, true);

    // Get user details for requesters
    const db = await dbManager.getDatabase();
    const usersCollection = db.collection("users");

    const pendingRequests = group.joinRequests.filter(
      (r) => r.status === "pending"
    );
    const requesterUserIds = pendingRequests.map((r) => new ObjectId(r.userId));

    const requesterUsers = await usersCollection
      .find({ _id: { $in: requesterUserIds } })
      .project({ _id: 1, name: 1, email: 1 })
      .toArray();

    // Enrich requests with user data
    const enrichedRequests = pendingRequests.map((request) => {
      const userData = requesterUsers.find(
        (u) => u._id.toString() === request.userId
      );
      return {
        _id: request.userId, // Use userId as _id for compatibility
        userId: request.userId,
        userName: userData?.name || "Unknown",
        userEmail: userData?.email || "",
        requestedAt: request.requestedAt,
        status: request.status,
      };
    });

    return successResponse({
      requests: enrichedRequests,
      total: enrichedRequests.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch join requests";
    return errorResponse(message, 403);
  }
});
