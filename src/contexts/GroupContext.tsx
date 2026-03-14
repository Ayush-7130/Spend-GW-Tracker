"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useNotification } from "./NotificationContext";
import { error as logError } from "@/lib/logger";
import { GroupsDataSource, ApiError } from "@/datasource";
import {
  getPersistedGroupId,
  persistGroupId,
} from "@/lib/utils/group-persistence";

// Types
interface GroupMember {
  userId: string;
  role: "admin" | "member";
  joinedAt: Date;
  status?: "active" | "left";
  leftAt?: Date;
}

interface Group {
  _id: string;
  name: string;
  description?: string;
  groupId: string;
  members?: GroupMember[]; // Optional since list endpoint doesn't include it
  memberCount?: number; // From API list response
  role?: "admin" | "member"; // User's role in this group (from API)
  isDefault?: boolean;
  joinedAt?: Date;
  pendingRequestsCount?: number;
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
  settings?: {
    allowMemberInvites?: boolean;
    requireApproval?: boolean;
  };
}

interface JoinRequest {
  _id: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
}

interface GroupContextType {
  groups: Group[];
  activeGroup: Group | null;
  joinRequests: JoinRequest[];
  isLoading: boolean;
  error: string | null;

  // Group operations
  createGroup: (name: string, description?: string) => Promise<void>;
  switchGroup: (groupId: string) => Promise<void>;
  joinGroup: (groupCode: string) => Promise<void>;
  leaveGroup: (groupId: string) => Promise<void>;
  updateGroup: (groupId: string, data: Partial<Group>) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;

  // Member management
  removeMember: (groupId: string, userId: string) => Promise<void>;
  updateMemberRole: (
    groupId: string,
    userId: string,
    role: "admin" | "member"
  ) => Promise<void>;
  getGroupMembers: (groupId?: string) => Promise<GroupMember[]>;

  // Join requests
  fetchJoinRequests: (groupId: string) => Promise<void>;
  approveJoinRequest: (groupId: string, userId: string) => Promise<void>;
  rejectJoinRequest: (groupId: string, userId: string) => Promise<void>;

  // Utility
  refreshGroups: () => Promise<Group[]>;
  isGroupAdmin: (groupId?: string) => boolean;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start as true to prevent flash
  const [error, setError] = useState<string | null>(null);

  // Fetch user's groups - delegates to GroupsDataSource for API access
  const fetchGroups = useCallback(async (): Promise<Group[]> => {
    if (!user) {
      return [];
    }

    try {
      setIsLoading(true);
      setError(null);

      const groupsData = await GroupsDataSource.getGroups();
      setGroups(groupsData as Group[]);

      // Set active group based on persisted preference, and sync server's currentGroupId
      // to match. Without this sync, the server's currentGroupId remains stale (pointing
      // to a different group) and all group-scoped APIs return data from the wrong group.
      const savedGroupId = getPersistedGroupId();

      if (savedGroupId && groupsData.length > 0) {
        // Try to restore previously selected group
        const active = groupsData.find(
          (g) => g._id === savedGroupId || g.groupId === savedGroupId
        );
        const resolved = (active || groupsData[0]) as Group;
        setActiveGroup(resolved);

        // Silently sync the server so all write/read APIs use the same group
        GroupsDataSource.switchGroup({ groupId: resolved._id }).catch(() => {
          // Non-fatal: server sync failure should not block the UI
        });
      } else if (groupsData.length > 0) {
        // Default to first group if no saved selection
        const firstGroup = groupsData[0] as Group;
        setActiveGroup(firstGroup);
        persistGroupId(firstGroup._id);

        // Sync server to this default group
        GroupsDataSource.switchGroup({ groupId: firstGroup._id }).catch(
          () => {}
        );
      }

      return groupsData as Group[];
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to fetch groups";
      setError(message);
      logError("Error fetching groups", err, { userId: user?.id });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user, fetchGroups]);

  // Create a new group - delegates to GroupsDataSource
  const createGroup = async (name: string, description?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const newGroup = await GroupsDataSource.createGroup({
        name,
        description,
      });
      showNotification("Group created successfully!", "success");

      // Refresh groups list and get the updated groups
      const updatedGroups = await fetchGroups();

      // Auto-switch to the newly created group
      if (newGroup._id && updatedGroups.length > 0) {
        // Find the newly created group in the updated list
        const createdGroup = updatedGroups.find((g) => g._id === newGroup._id);
        if (createdGroup) {
          // Sync server's currentGroupId so all subsequent API calls (expense creation,
          // dashboard, etc.) scope data to the newly created group.
          await GroupsDataSource.switchGroup({ groupId: createdGroup._id });

          // Switch to the new group immediately
          setActiveGroup(createdGroup);

          // Persist selection
          persistGroupId(createdGroup._id);

          // Dispatch custom event for other components
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("groupChanged", {
                detail: { groupId: createdGroup._id },
              })
            );
          }
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to create group";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Switch active group - delegates to GroupsDataSource
  const switchGroup = async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // Find the group to switch to
      const targetGroup = groups.find(
        (g) => g._id === groupId || g.groupId === groupId
      );

      if (!targetGroup) {
        throw new Error("Group not found");
      }

      // Call API to update currentGroupId in database
      await GroupsDataSource.switchGroup({ groupId: targetGroup._id });

      // Update active group in state
      setActiveGroup(targetGroup);

      // Persist selection
      persistGroupId(targetGroup._id);

      // Dispatch custom event for other components to react to group change
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("groupChanged", {
            detail: { groupId: targetGroup._id },
          })
        );
      }

      showNotification(`Switched to ${targetGroup.name}`, "success");

      return; // Operation complete
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to switch group";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Join a group using code - delegates to GroupsDataSource
  const joinGroup = async (groupCode: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await GroupsDataSource.joinGroup({ groupCode });

      if (result.requiresApproval) {
        showNotification(
          "Join request sent! Waiting for admin approval.",
          "info"
        );
      } else {
        showNotification("Joined group successfully!", "success");
        await fetchGroups();
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to join group";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Leave a group - delegates to GroupsDataSource
  const leaveGroup = async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      await GroupsDataSource.removeMember(groupId, user.id);
      showNotification("Left group successfully!", "success");
      await fetchGroups();

      // If left the active group, switch to another
      if (activeGroup?._id === groupId) {
        const remainingGroups = groups.filter((g) => g._id !== groupId);
        if (remainingGroups.length > 0) {
          await switchGroup(remainingGroups[0]._id);
        } else {
          setActiveGroup(null);
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to leave group";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update group details - delegates to GroupsDataSource
  const updateGroup = async (groupId: string, updateData: Partial<Group>) => {
    try {
      setIsLoading(true);
      setError(null);

      await GroupsDataSource.updateGroup(groupId, updateData);
      showNotification("Group updated successfully!", "success");
      await fetchGroups();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to update group";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Delete group - delegates to GroupsDataSource
  const deleteGroup = async (groupId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await GroupsDataSource.deleteGroup(groupId);
      showNotification("Group deleted successfully!", "success");
      await fetchGroups();

      // If deleted the active group, switch to another
      if (activeGroup?._id === groupId) {
        const remainingGroups = groups.filter((g) => g._id !== groupId);
        if (remainingGroups.length > 0) {
          await switchGroup(remainingGroups[0]._id);
        } else {
          setActiveGroup(null);
        }
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to delete group";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove member from group - delegates to GroupsDataSource
  const removeMember = async (groupId: string, userId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await GroupsDataSource.removeMember(groupId, userId);
      showNotification("Member removed successfully!", "success");
      await fetchGroups();

      // Dispatch event to notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("groupChanged", {
            detail: { groupId },
          })
        );
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to remove member";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update member role - delegates to GroupsDataSource
  const updateMemberRole = async (
    groupId: string,
    userId: string,
    role: "admin" | "member"
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      await GroupsDataSource.updateMemberRole(groupId, userId, { role });
      showNotification("Member role updated successfully!", "success");
      await fetchGroups();

      // Dispatch event to notify other components
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("groupChanged", {
            detail: { groupId },
          })
        );
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to update member role";
      setError(message);
      showNotification(message, "error");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch join requests - delegates to GroupsDataSource
  const fetchJoinRequests = useCallback(
    async (groupId: string) => {
      try {
        const requests = await GroupsDataSource.getJoinRequests(groupId);
        setJoinRequests(requests as JoinRequest[]);
      } catch (err) {
        logError("Error fetching join requests", err, {
          groupId,
          userId: user?.id,
        });
      }
    },
    [user?.id]
  );

  // Approve join request - delegates to GroupsDataSource
  const approveJoinRequest = useCallback(
    async (groupId: string, userId: string) => {
      try {
        setIsLoading(true);

        await GroupsDataSource.processJoinRequest(groupId, userId, {
          action: "approve",
        });
        showNotification("Join request approved!", "success");
        await fetchJoinRequests(groupId);
        await fetchGroups();

        // Dispatch event to notify other components
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("groupChanged", {
              detail: { groupId },
            })
          );
        }
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Failed to approve request";
        showNotification(message, "error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [showNotification, fetchJoinRequests, fetchGroups]
  );

  // Reject join request - delegates to GroupsDataSource
  const rejectJoinRequest = useCallback(
    async (groupId: string, userId: string) => {
      try {
        setIsLoading(true);

        await GroupsDataSource.processJoinRequest(groupId, userId, {
          action: "reject",
        });
        showNotification("Join request rejected!", "success");
        await fetchJoinRequests(groupId);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Failed to reject request";
        showNotification(message, "error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [showNotification, fetchJoinRequests]
  );

  // Check if user is admin of a group
  const isGroupAdmin = useCallback(
    (groupId?: string) => {
      const targetGroupId = groupId || activeGroup?._id;
      if (!targetGroupId || !user) return false;

      const group = groups.find((g) => g._id === targetGroupId);
      if (!group) return false;

      // Use the role property from API response (not members array)
      // The API returns the user's role directly
      return group.role === "admin";
    },
    [activeGroup?._id, user, groups]
  );

  // Fetch and return group members - shared utility to avoid duplication in pages
  const getGroupMembers = useCallback(
    async (groupId?: string): Promise<GroupMember[]> => {
      const targetGroupId = groupId || activeGroup?._id;
      if (!targetGroupId) return [];

      // First check if members are already available in the groups state
      const group = groups.find((g) => g._id === targetGroupId);
      if (group?.members && group.members.length > 0) {
        return group.members;
      }

      // Fetch full group details with members via datasource
      try {
        const fullGroup = await GroupsDataSource.getGroup(targetGroupId);
        // Update the group in state with fetched members
        setGroups((prev) =>
          prev.map((g) =>
            g._id === targetGroupId
              ? { ...g, members: fullGroup.members as GroupMember[] }
              : g
          )
        );
        if (activeGroup?._id === targetGroupId) {
          setActiveGroup((prev) =>
            prev
              ? { ...prev, members: fullGroup.members as GroupMember[] }
              : null
          );
        }
        return (fullGroup.members as GroupMember[]) || [];
      } catch (err) {
        logError("Error fetching group members", err, {
          groupId: targetGroupId,
          userId: user?.id,
        });
        return [];
      }
    },
    [activeGroup?._id, groups, user?.id]
  );

  const value: GroupContextType = {
    groups,
    activeGroup,
    joinRequests,
    isLoading,
    error,
    createGroup,
    switchGroup,
    joinGroup,
    leaveGroup,
    updateGroup,
    deleteGroup,
    removeMember,
    updateMemberRole,
    getGroupMembers,
    fetchJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    refreshGroups: fetchGroups,
    isGroupAdmin,
  };

  return (
    <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error("useGroup must be used within a GroupProvider");
  }
  return context;
}
