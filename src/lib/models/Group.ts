/**
 * Group Model - Multi-User Collaborative Expense Tracking
 *
 * Enables users to collaborate in shared groups where expenses, settlements, and
 * categories are scoped to the group context.
 *
 * KEY FEATURES:
 * - 6-digit alphanumeric group codes for easy sharing
 * - Role-based access control (admin/member)
 * - Join request approval workflow
 * - Support for multiple groups per user
 *
 * SECURITY:
 * - Only members can view group data
 * - Only admins can approve requests, edit settings, remove members
 * - Group codes are unique and immutable after creation
 *
 * DATABASE INDEXES (to be created via createIndexes method):
 * - groupId (unique) - Fast lookup by 6-digit code
 * - members.userId - Find groups by member
 * - joinRequests.userId - Find pending requests by user
 * - { members.userId, members.role } - Compound index for role queries
 * - { createdBy, createdAt } - Find groups by creator
 */

/**
 * Group Member Interface
 *
 * Represents a user's membership in a group with their role.
 */
export interface GroupMember {
  userId: string; // MongoDB ObjectId string reference to User
  role: "admin" | "member";
  joinedAt: Date;
  isDefault?: boolean; // User's default/primary group
  status?: "active" | "left"; // undefined means active (backward-compatible)
  leftAt?: Date; // Timestamp when user left the group
}

/**
 * Join Request Interface
 *
 * Tracks pending requests to join a group.
 * Deleted after approval/rejection.
 */
export interface JoinRequest {
  userId: string; // MongoDB ObjectId string reference to User
  requestedAt: Date;
  status: "pending" | "approved" | "rejected";
}

/**
 * Group Settings Interface
 *
 * Configurable group-level preferences.
 */
export interface GroupSettings {
  allowJoinRequests: boolean; // If false, code sharing is disabled
  requireApproval: boolean; // If false, join requests are auto-approved
  notifyOnJoinRequest: boolean; // Notify admins of new join requests
}

/**
 * Group Document Interface
 *
 * Main group entity with all related data.
 */
export interface Group {
  _id: string; // MongoDB ObjectId as string
  groupId: string; // Unique 6-digit alphanumeric code (e.g., "ABC123")
  name: string; // Group display name (e.g., "Family Expenses")
  description?: string; // Optional group description
  members: GroupMember[]; // Array of group members with roles
  joinRequests: JoinRequest[]; // Pending join requests
  settings: GroupSettings; // Group configuration
  createdBy: string; // User who created the group (always admin)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default Group Settings
 *
 * Applied when creating a new group.
 */
export const DEFAULT_GROUP_SETTINGS: GroupSettings = {
  allowJoinRequests: true,
  requireApproval: true,
  notifyOnJoinRequest: true,
};

/**
 * Validation Functions
 */

/**
 * Validate group ID format
 * Must be exactly 6 alphanumeric characters (uppercase)
 */
export function isValidGroupId(groupId: string): boolean {
  return /^[A-Z0-9]{6}$/.test(groupId);
}

/**
 * Validate group name
 * Must be 1-100 characters
 */
export function isValidGroupName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100;
}

/**
 * Validate group description
 * Must be 0-500 characters
 */
export function isValidGroupDescription(
  description: string | undefined
): boolean {
  if (!description) return true;
  return description.trim().length <= 500;
}

/**
 * Check if user is a member of a group
 */
export function isGroupMember(group: Group, userId: string): boolean {
  return group.members.some((m) => m.userId === userId);
}

/**
 * Check if user is an admin of a group
 */
export function isGroupAdmin(group: Group, userId: string): boolean {
  return group.members.some((m) => m.userId === userId && m.role === "admin");
}

/**
 * Get member count
 */
export function getGroupMemberCount(group: Group): number {
  return group.members.length;
}

/**
 * Get admin count
 */
export function getGroupAdminCount(group: Group): number {
  return group.members.filter((m) => m.role === "admin").length;
}

/**
 * Check if there are pending join requests
 */
export function hasPendingJoinRequests(group: Group): boolean {
  return group.joinRequests.some((r) => r.status === "pending");
}

/**
 * Validate group has at least one admin
 */
export function validateGroupHasAdmin(members: GroupMember[]): boolean {
  return members.some((m) => m.role === "admin");
}

/**
 * Database Collection Name
 */
export const GROUP_COLLECTION = "groups";

/**
 * Group Validation Errors
 */
export const GroupValidationErrors = {
  INVALID_GROUP_ID: "Group ID must be exactly 6 alphanumeric characters",
  INVALID_NAME: "Group name must be 1-100 characters",
  INVALID_DESCRIPTION: "Description cannot exceed 500 characters",
  NO_ADMIN: "Group must have at least one admin",
  DUPLICATE_MEMBER: "User is already a member of this group",
  DUPLICATE_REQUEST: "User already has a pending join request",
  GROUP_NOT_FOUND: "Group not found",
  NOT_A_MEMBER: "User is not a member of this group",
  NOT_AN_ADMIN: "User is not an admin of this group",
  CANNOT_REMOVE_LAST_ADMIN: "Cannot remove the last admin from the group",
} as const;
