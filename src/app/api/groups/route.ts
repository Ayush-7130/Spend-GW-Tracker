/**
 * Group Management API Routes
 *
 * Endpoints:
 * - GET  /api/groups - List user's groups
 * - POST /api/groups - Create new group
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
import {
  generateGroupId,
  validateGroupName,
  validateGroupDescription,
} from "@/lib/utils/group";
import { ObjectId } from "mongodb";
import { error as logError } from "@/lib/logger";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/groups
 *
 * List all groups where user is a member
 * Returns groups sorted by most recently updated
 */
export const GET = withAuth(async (req: NextRequest, context) => {
  try {
    const { user } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");

    // Find all groups where user is an active member (exclude left)
    const groups = await groupsCollection
      .find({
        members: {
          $elemMatch: {
            userId: user.id,
            $or: [{ status: { $exists: false } }, { status: "active" }],
          },
        },
      })
      .sort({ updatedAt: -1 })
      .toArray();

    // Transform and enrich group data
    const groupsData = groups.map((group) => {
      const userMember = group.members.find(
        (m: any) => m.userId === user.id && (!m.status || m.status === "active")
      );
      // Count only active members for the displayed member count
      const activeMemberCount = group.members.filter(
        (m: any) => !m.status || m.status === "active"
      ).length;

      return {
        _id: group._id.toString(),
        groupId: group.groupId,
        name: group.name,
        description: group.description,
        memberCount: activeMemberCount,
        role: userMember?.role || "member",
        isDefault: userMember?.isDefault || false,
        joinedAt: userMember?.joinedAt,
        pendingRequestsCount:
          group.joinRequests?.filter((r: any) => r.status === "pending")
            .length || 0,
        createdBy: group.createdBy,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      };
    });

    return successResponse({
      groups: groupsData,
      total: groupsData.length,
    });
  } catch (error) {
    logError("Error fetching groups", error, { userId: context.user?.id });
    return errorResponse("Failed to fetch groups", 500);
  }
});

/**
 * POST /api/groups
 *
 * Create a new group
 * User becomes the first admin of the group
 * Group is automatically set as current if user has no groups
 *
 * Body:
 * {
 *   name: string (required, 1-100 chars)
 *   description?: string (optional, max 500 chars)
 * }
 */
export const POST = withAuth(async (req: NextRequest, context) => {
  try {
    const { user } = context;

    if (!user) {
      return errorResponse("Authentication required", 401);
    }

    const body = await req.json();

    // Validate input
    const errors: Record<string, string> = {};

    if (!body.name || typeof body.name !== "string") {
      errors.name = "Group name is required";
    } else {
      const nameValidation = validateGroupName(body.name);
      if (!nameValidation.valid) {
        errors.name = nameValidation.error!;
      }
    }

    if (body.description !== undefined) {
      const descValidation = validateGroupDescription(body.description);
      if (!descValidation.valid) {
        errors.description = descValidation.error!;
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    const db = await dbManager.getDatabase();
    const groupsCollection = db.collection("groups");
    const usersCollection = db.collection("users");

    // Generate unique group ID
    const groupId = await generateGroupId();
    const now = new Date();

    // Create group document
    const newGroup = {
      groupId,
      name: body.name.trim(),
      description: body.description?.trim() || "",
      members: [
        {
          userId: user.id,
          role: "admin",
          joinedAt: now,
          isDefault: false,
        },
      ],
      joinRequests: [],
      settings: {
        allowJoinRequests: true,
        requireApproval: true,
        notifyOnJoinRequest: true,
      },
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };

    // Insert group
    const result = await groupsCollection.insertOne(newGroup);
    const insertedId = result.insertedId.toString();

    // Check if user has any existing groups
    const user_doc = await usersCollection.findOne({
      _id: new ObjectId(user.id),
    });
    const existingGroups = user_doc?.groups || [];
    const isFirstGroup = existingGroups.length === 0;

    // Update user's groups array and set as current if first group
    // CRITICAL: Store MongoDB _id (insertedId), NOT the invite code (groupId)
    // This ensures consistency with group-access layer and authorization checks
    await usersCollection.updateOne(
      { _id: new ObjectId(user.id) },
      {
        $push: {
          groups: {
            groupId: insertedId, // MUST use MongoDB _id, not invite code
            role: "admin",
            isDefault: isFirstGroup,
          } as any,
        },
        ...(isFirstGroup ? { $set: { currentGroupId: insertedId } } : {}), // MUST use _id
      }
    );

    // Create notification
    await dbManager.createNotification({
      userId: user.id,
      groupId: insertedId, // Use MongoDB _id for group reference
      type: "group_created",
      message: `You created the group "${body.name}"`,
      entityId: insertedId,
      entityType: "group",
      read: false,
    });

    // Return success response
    // No need to update JWT token - currentGroupId is read from database on each request
    return successResponse(
      {
        group: {
          _id: insertedId,
          groupId,
          name: body.name.trim(),
          description: body.description?.trim() || "",
          memberCount: 1,
          role: "admin",
          isDefault: isFirstGroup,
          createdAt: now,
          updatedAt: now,
        },
        message: `Group created successfully! Share code: ${groupId}`,
      },
      undefined,
      201
    );
  } catch (error) {
    logError("Error creating group", error, { userId: context.user?.id });
    return errorResponse("Failed to create group", 500);
  }
});
