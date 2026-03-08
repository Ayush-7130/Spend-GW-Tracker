/**
 * Group Utility Functions
 *
 * Helper functions for group management, validation, and access control.
 *
 * KEY FUNCTIONS:
 * - generateGroupId: Create unique 6-digit alphanumeric codes
 * - isGroupAdmin/isGroupMember: Role and membership checks
 * - validateGroupAccess: Centralized authorization logic
 */

import { Group, GroupMember } from "../database";
import { dbManager } from "../database";
import { ObjectId } from "mongodb";

/**
 * Characters used for group ID generation
 * Excludes easily confused characters (0/O, 1/I, etc.)
 */
const GROUP_ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const GROUP_ID_LENGTH = 6;
const MAX_GENERATION_ATTEMPTS = 10;

/**
 * Generate a unique 6-digit alphanumeric group ID
 *
 * - Excludes easily confused characters (0/O, 1/I, 5/S, 2/Z)
 * - Checks database for uniqueness
 * - Retries up to 10 times if collision occurs
 *
 * @returns Promise<string> - Unique 6-character group ID
 * @throws Error if unable to generate unique ID after max attempts
 */
export async function generateGroupId(): Promise<string> {
  const db = await dbManager.getDatabase();
  const groupsCollection = db.collection("groups");

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    // Generate random 6-character code
    let groupId = "";
    for (let i = 0; i < GROUP_ID_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * GROUP_ID_CHARS.length);
      groupId += GROUP_ID_CHARS[randomIndex];
    }

    // Check if code already exists
    const existing = await groupsCollection.findOne({ groupId });
    if (!existing) {
      return groupId;
    }

    // Collision detected, try again (very rare)
  }

  throw new Error("Failed to generate unique group ID after maximum attempts");
}

/**
 * Check if a user is a member of a group
 *
 * @param group - Group document
 * @param userId - User ID to check (MongoDB ObjectId string)
 * @returns boolean - True if user is a member
 */
export function isGroupMember(group: Group, userId: string): boolean {
  return group.members.some(
    (m: GroupMember) =>
      m.userId === userId && (!m.status || m.status === "active")
  );
}

/**
 * Check if a user is an admin of a group
 *
 * @param group - Group document
 * @param userId - User ID to check (MongoDB ObjectId string)
 * @returns boolean - True if user is an admin
 */
export function isGroupAdmin(group: Group, userId: string): boolean {
  return group.members.some(
    (m: GroupMember) =>
      m.userId === userId &&
      m.role === "admin" &&
      (!m.status || m.status === "active")
  );
}

/**
 * Get user's role in a group
 *
 * @param group - Group document
 * @param userId - User ID to check
 * @returns 'admin' | 'member' | null
 */
export function getUserRole(
  group: Group,
  userId: string
): "admin" | "member" | null {
  const member = group.members.find(
    (m: GroupMember) =>
      m.userId === userId && (!m.status || m.status === "active")
  );
  return member ? member.role : null;
}

/**
 * Validate user has access to a group
 *
 * Centralized authorization logic for group-scoped operations.
 *
 * @param groupId - Group ID to validate access for (MongoDB ObjectId string)
 * @param userId - User ID requesting access (MongoDB ObjectId string)
 * @param requireAdmin - If true, user must be an admin (default: false)
 * @returns Promise<Group> - Group document if access granted
 * @throws Error with specific message if access denied
 */
export async function validateGroupAccess(
  groupId: string,
  userId: string,
  requireAdmin: boolean = false
): Promise<Group> {
  const db = await dbManager.getDatabase();
  const groupsCollection = db.collection("groups");

  // Find group - support both ObjectId and 6-digit group code
  let group;
  if (ObjectId.isValid(groupId)) {
    // MongoDB ObjectId format
    group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
  } else {
    // 6-digit group code format
    group = await groupsCollection.findOne({ groupId: groupId });
  }

  if (!group) {
    throw new Error("Group not found");
  }

  // Convert group document
  const groupDoc: Group = {
    ...group,
    _id: group._id.toString(),
  } as Group;

  // Check membership
  if (!isGroupMember(groupDoc, userId)) {
    throw new Error("User is not a member of this group");
  }

  // Check admin role if required
  if (requireAdmin && !isGroupAdmin(groupDoc, userId)) {
    throw new Error("User is not an admin of this group");
  }

  return groupDoc;
}

/**
 * Validate user can perform admin actions
 *
 * Shorthand for validateGroupAccess with requireAdmin=true
 *
 * @param groupId - Group ID (MongoDB ObjectId string)
 * @param userId - User ID (MongoDB ObjectId string)
 * @returns Promise<Group> - Group document if user is admin
 * @throws Error if user is not an admin
 */
export async function validateGroupAdmin(
  groupId: string,
  userId: string
): Promise<Group> {
  return validateGroupAccess(groupId, userId, true);
}

/**
 * Get groups where user is a member
 *
 * @param userId - User ID (MongoDB ObjectId string)
 * @returns Promise<Group[]> - Array of groups user belongs to
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  const db = await dbManager.getDatabase();
  const groupsCollection = db.collection("groups");

  // Only fetch groups where user is an active member (not left)
  const groups = await groupsCollection
    .find({
      members: {
        $elemMatch: {
          userId: userId,
          $or: [{ status: { $exists: false } }, { status: "active" }],
        },
      },
    })
    .sort({ updatedAt: -1 })
    .toArray();

  return groups.map((g) => ({
    ...g,
    _id: g._id.toString(),
  })) as Group[];
}

/**
 * Get group by 6-digit group code
 *
 * @param groupCode - 6-digit alphanumeric code
 * @returns Promise<Group | null> - Group document or null if not found
 */
export async function getGroupByCode(groupCode: string): Promise<Group | null> {
  const db = await dbManager.getDatabase();
  const groupsCollection = db.collection("groups");

  const group = await groupsCollection.findOne({
    groupId: groupCode.toUpperCase(),
  });
  if (!group) {
    return null;
  }

  return {
    ...group,
    _id: group._id.toString(),
  } as Group;
}

/**
 * Get group by MongoDB ObjectId
 *
 * @param groupId - MongoDB ObjectId string
 * @returns Promise<Group | null> - Group document or null if not found
 */
export async function getGroupById(groupId: string): Promise<Group | null> {
  if (!ObjectId.isValid(groupId)) {
    return null;
  }

  const db = await dbManager.getDatabase();
  const groupsCollection = db.collection("groups");

  const group = await groupsCollection.findOne({ _id: new ObjectId(groupId) });
  if (!group) {
    return null;
  }

  return {
    ...group,
    _id: group._id.toString(),
  } as Group;
}

/**
 * Check if user has a pending join request for a group
 *
 * @param groupId - MongoDB ObjectId string
 * @param userId - User ID (MongoDB ObjectId string)
 * @returns Promise<boolean> - True if pending request exists
 */
export async function hasPendingJoinRequest(
  groupId: string,
  userId: string
): Promise<boolean> {
  if (!ObjectId.isValid(groupId)) {
    return false;
  }

  const db = await dbManager.getDatabase();
  const groupsCollection = db.collection("groups");

  const group = await groupsCollection.findOne({
    _id: new ObjectId(groupId),
    "joinRequests.userId": userId,
    "joinRequests.status": "pending",
  });

  return !!group;
}

/**
 * Check if group can be deleted
 *
 * Validates that group is empty or user is admin
 *
 * @param group - Group document
 * @param userId - User ID requesting deletion
 * @returns object - { canDelete: boolean, reason?: string }
 */
export function canDeleteGroup(
  group: Group,
  userId: string
): { canDelete: boolean; reason?: string } {
  // Must be admin to delete
  if (!isGroupAdmin(group, userId)) {
    return { canDelete: false, reason: "Only admins can delete the group" };
  }

  // Group can be deleted
  return { canDelete: true };
}

/**
 * Check if member can be removed from group
 *
 * @param group - Group document
 * @param memberUserId - User ID of member to remove
 * @param actingUserId - User ID performing the action
 * @returns object - { canRemove: boolean, reason?: string }
 */
export function canRemoveMember(
  group: Group,
  memberUserId: string,
  actingUserId: string
): { canRemove: boolean; reason?: string } {
  // Acting user must be admin
  if (!isGroupAdmin(group, actingUserId)) {
    return { canRemove: false, reason: "Only admins can remove members" };
  }

  // Cannot remove yourself if you're the last admin
  const adminCount = group.members.filter(
    (m) => m.role === "admin" && (!m.status || m.status === "active")
  ).length;
  const isTargetAdmin = isGroupAdmin(group, memberUserId);

  if (actingUserId === memberUserId && isTargetAdmin && adminCount === 1) {
    return {
      canRemove: false,
      reason:
        "Cannot remove yourself as the last admin. Transfer admin role first.",
    };
  }

  return { canRemove: true };
}

/**
 * Validate group name
 *
 * @param name - Group name
 * @returns object - { valid: boolean, error?: string }
 */
export function validateGroupName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Group name is required" };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: "Group name cannot exceed 100 characters" };
  }

  return { valid: true };
}

/**
 * Validate group description
 *
 * @param description - Group description
 * @returns object - { valid: boolean, error?: string }
 */
export function validateGroupDescription(description: string | undefined): {
  valid: boolean;
  error?: string;
} {
  if (!description) {
    return { valid: true };
  }

  if (description.trim().length > 500) {
    return { valid: false, error: "Description cannot exceed 500 characters" };
  }

  return { valid: true };
}

/**
 * Validate group code format
 *
 * @param code - Group code to validate
 * @returns object - { valid: boolean, error?: string }
 */
export function validateGroupCode(code: string): {
  valid: boolean;
  error?: string;
} {
  if (!/^[A-Z0-9]{6}$/.test(code.toUpperCase())) {
    return {
      valid: false,
      error: "Group code must be exactly 6 alphanumeric characters",
    };
  }

  return { valid: true };
}
