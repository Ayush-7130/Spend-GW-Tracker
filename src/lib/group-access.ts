/**
 * Group Access Layer
 *
 * Provides real-time group membership verification from database instead of JWT.
 * Implements caching to reduce database load while maintaining data freshness.
 *
 * CRITICAL ARCHITECTURE:
 * - Groups are NO LONGER stored in JWT tokens
 * - Every request verifies group membership from database
 * - 5-minute cache reduces database queries
 * - Cache invalidated on membership changes
 *
 * WHY This Approach:
 * - Immediate access revocation (user removed from group)
 * - No stale data in JWT tokens
 * - Smaller JWT payload
 * - Real-time role changes
 *
 * @module group-access
 */

import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import { cache, cacheKeys, CacheTTL, invalidateCache } from "./cache";
import logger from "./logger";

/**
 * Group Membership Interface
 * Represents a user's membership in a specific group
 *
 * CRITICAL: groupId here is Group._id.toString() (MongoDB ObjectId string)
 * NOT the 6-character invite code
 */
export interface GroupMembership {
  groupId: string; // Group._id.toString() - MongoDB ObjectId string
  userId: string; // User._id.toString() - MongoDB ObjectId string
  role: "admin" | "member";
  joinedAt: Date;
  isDefault?: boolean;
}

/**
 * Group with User Access Information
 * Includes both group data and user's role
 */
export interface GroupWithAccess {
  _id: string; // MongoDB ObjectId string - Primary identifier
  groupId: string; // 6-character invite code - For display/sharing only
  name: string;
  description?: string;
  userRole: "admin" | "member";
  memberCount: number;
  joinedAt: Date;
  createdBy: string;
  createdAt: Date;
  settings: {
    allowJoinRequests: boolean;
    requireApproval: boolean;
    notifyOnJoinRequest: boolean;
  };
}

/**
 * Get all groups a user belongs to
 *
 * Uses caching to reduce database load. Cache TTL is 5 minutes.
 * Cache is invalidated when:
 * - User joins a new group
 * - User leaves a group
 * - User's role changes in a group
 *
 * @param userId - User's MongoDB ObjectId string
 * @returns Array of group memberships
 */
export async function getUserGroups(
  userId: string
): Promise<GroupMembership[]> {
  // Check cache first
  const cacheKey = cacheKeys.userGroups(userId);
  const cached = cache.get<GroupMembership[]>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Query groups where user is a member
    const groups = await db
      .collection("groups")
      .find({
        "members.userId": userId,
      })
      .project({
        _id: 1,
        groupId: 1,
        name: 1,
        members: 1,
      })
      .toArray();

    // Extract user's membership info from each group
    const memberships: GroupMembership[] = groups.map((group) => {
      const member = group.members.find((m: any) => m.userId === userId);

      return {
        groupId: group._id.toString(),
        userId: userId,
        role: member?.role || "member",
        joinedAt: member?.joinedAt || new Date(),
        isDefault: member?.isDefault || false,
      };
    });

    // Cache for 5 minutes
    cache.set(cacheKey, memberships, CacheTTL.MEDIUM);

    return memberships;
  } catch (error) {
    logger.error("Error fetching user groups", { error, userId });
    throw new Error("Failed to fetch user groups");
  }
}

/**
 * Check if user is a member of a specific group
 *
 * Returns membership information if user belongs to group, null otherwise.
 * Uses per-group cache for granular invalidation.
 *
 * @param userId - User's MongoDB ObjectId string
 * @param groupId - Group's MongoDB ObjectId string
 * @returns GroupMembership if user is member, null otherwise
 */
export async function checkGroupMembership(
  userId: string,
  groupId: string
): Promise<GroupMembership | null> {
  // Validate ObjectId format
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(groupId)) {
    return null;
  }

  // Check cache first
  const cacheKey = cacheKeys.groupMembership(userId, groupId);
  const cached = cache.get<GroupMembership | null>(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Find group and check if user is a member
    const group = await db.collection("groups").findOne(
      {
        _id: new ObjectId(groupId),
        "members.userId": userId,
      },
      {
        projection: {
          _id: 1,
          groupId: 1,
          members: 1,
        },
      }
    );

    if (!group) {
      // Cache negative result too (prevents repeated DB queries for unauthorized access)
      cache.set(cacheKey, null, CacheTTL.SHORT);
      return null;
    }

    // Find user's membership details
    const member = group.members.find((m: any) => m.userId === userId);

    if (!member) {
      cache.set(cacheKey, null, CacheTTL.SHORT);
      return null;
    }

    const membership: GroupMembership = {
      groupId: group._id.toString(),
      userId: userId,
      role: member.role,
      joinedAt: member.joinedAt,
      isDefault: member.isDefault || false,
    };

    // Cache for 5 minutes
    cache.set(cacheKey, membership, CacheTTL.MEDIUM);

    return membership;
  } catch (error) {
    logger.error("Error checking group membership", { error, userId, groupId });
    throw new Error("Failed to check group membership");
  }
}

/**
 * Verify user has required role in group
 *
 * @param userId - User's MongoDB ObjectId string
 * @param groupId - Group's MongoDB ObjectId string
 * @param requiredRole - Optional role to verify (defaults to any role)
 * @returns True if user has required role in group
 */
export async function verifyGroupRole(
  userId: string,
  groupId: string,
  requiredRole?: "admin"
): Promise<boolean> {
  const membership = await checkGroupMembership(userId, groupId);

  if (!membership) {
    return false;
  }

  // If specific role required, verify it
  if (requiredRole && membership.role !== requiredRole) {
    return false;
  }

  return true;
}

/**
 * Get full group data with user's access level
 *
 * Returns complete group information along with user's role.
 * Throws error if user is not a member.
 *
 * @param userId - User's MongoDB ObjectId string
 * @param groupId - Group's MongoDB ObjectId string
 * @returns Group data with user's role
 * @throws Error if user is not a member or group doesn't exist
 */
export async function getGroupWithAccess(
  userId: string,
  groupId: string
): Promise<GroupWithAccess> {
  // First check if user is a member
  const membership = await checkGroupMembership(userId, groupId);

  if (!membership) {
    throw new Error("User is not a member of this group");
  }

  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Fetch full group data
    const group = await db.collection("groups").findOne({
      _id: new ObjectId(groupId),
    });

    if (!group) {
      throw new Error("Group not found");
    }

    const userMember = group.members.find((m: any) => m.userId === userId);

    return {
      _id: group._id.toString(),
      groupId: group.groupId,
      name: group.name,
      description: group.description,
      userRole: membership.role,
      memberCount: group.members.length,
      joinedAt: userMember?.joinedAt || new Date(),
      createdBy: group.createdBy,
      createdAt: group.createdAt,
      settings: group.settings || {
        allowJoinRequests: true,
        requireApproval: true,
        notifyOnJoinRequest: true,
      },
    };
  } catch (error) {
    logger.error("Error fetching group with access", {
      error,
      userId,
      groupId,
    });
    throw error;
  }
}

/**
 * Invalidate all cached data for a user's groups
 *
 * Call this when:
 * - User joins a group
 * - User leaves a group
 * - User's role changes in a group
 * - Group is deleted
 *
 * @param userId - User's MongoDB ObjectId string
 */
export async function invalidateUserGroupsCache(userId: string): Promise<void> {
  invalidateCache.userGroups(userId);
}

/**
 * Invalidate cached data for a specific group membership
 *
 * Call this when:
 * - User's role changes in a specific group
 * - User leaves a specific group
 *
 * @param userId - User's MongoDB ObjectId string
 * @param groupId - Group's MongoDB ObjectId string
 */
export async function invalidateGroupMembershipCache(
  userId: string,
  groupId: string
): Promise<void> {
  invalidateCache.groupMembership(userId, groupId);
}

/**
 * Batch check multiple users' membership in a group
 *
 * More efficient than calling checkGroupMembership multiple times.
 * Useful for validating expense split members, etc.
 *
 * @param userIds - Array of user MongoDB ObjectId strings
 * @param groupId - Group's MongoDB ObjectId string
 * @returns Map of userId to GroupMembership (or null if not member)
 */
export async function batchCheckGroupMembership(
  userIds: string[],
  groupId: string
): Promise<Map<string, GroupMembership | null>> {
  // Validate inputs
  if (!ObjectId.isValid(groupId)) {
    throw new Error("Invalid groupId");
  }

  const invalidUserIds = userIds.filter((id) => !ObjectId.isValid(id));
  if (invalidUserIds.length > 0) {
    throw new Error(`Invalid userIds: ${invalidUserIds.join(", ")}`);
  }

  const results = new Map<string, GroupMembership | null>();

  // Try to get from cache first
  for (const userId of userIds) {
    const cacheKey = cacheKeys.groupMembership(userId, groupId);
    const cached = cache.get<GroupMembership | null>(cacheKey);

    if (cached !== undefined) {
      results.set(userId, cached);
    }
  }

  // Get uncached userIds
  const uncachedUserIds = userIds.filter((id) => !results.has(id));

  if (uncachedUserIds.length === 0) {
    return results;
  }

  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Fetch group with all members in one query
    const group = await db.collection("groups").findOne(
      {
        _id: new ObjectId(groupId),
      },
      {
        projection: {
          _id: 1,
          groupId: 1,
          members: 1,
        },
      }
    );

    if (!group) {
      // Group doesn't exist, all uncached users are not members
      for (const userId of uncachedUserIds) {
        const cacheKey = cacheKeys.groupMembership(userId, groupId);
        cache.set(cacheKey, null, CacheTTL.SHORT);
        results.set(userId, null);
      }
      return results;
    }

    // Process each uncached userId
    for (const userId of uncachedUserIds) {
      const member = group.members.find((m: any) => m.userId === userId);

      if (!member) {
        const cacheKey = cacheKeys.groupMembership(userId, groupId);
        cache.set(cacheKey, null, CacheTTL.SHORT);
        results.set(userId, null);
        continue;
      }

      const membership: GroupMembership = {
        groupId: group._id.toString(),
        userId: userId,
        role: member.role,
        joinedAt: member.joinedAt,
        isDefault: member.isDefault || false,
      };

      const cacheKey = cacheKeys.groupMembership(userId, groupId);
      cache.set(cacheKey, membership, CacheTTL.MEDIUM);
      results.set(userId, membership);
    }

    return results;
  } catch (error) {
    logger.error("Error in batch check group membership", {
      error,
      userIds,
      groupId,
    });
    throw new Error("Failed to batch check group membership");
  }
}

/**
 * Verify all users in an array are members of a group
 *
 * Useful for validating expense split members before creating an expense.
 *
 * @param userIds - Array of user MongoDB ObjectId strings
 * @param groupId - Group's MongoDB ObjectId string
 * @returns True if ALL users are members, false otherwise
 */
export async function verifyAllUsersInGroup(
  userIds: string[],
  groupId: string
): Promise<boolean> {
  if (userIds.length === 0) {
    return true;
  }

  const memberships = await batchCheckGroupMembership(userIds, groupId);

  // Check if any user is not a member
  for (const [, membership] of memberships.entries()) {
    if (!membership) {
      return false;
    }
  }

  return true;
}
