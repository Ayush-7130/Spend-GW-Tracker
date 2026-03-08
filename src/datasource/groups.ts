import { api, withRetry } from "./base";
import {
  Group,
  GroupJoinRequest,
  CreateGroupRequest,
  JoinGroupRequest,
  SwitchGroupRequest,
  UpdateGroupRequest,
  UpdateMemberRoleRequest,
  ProcessJoinRequestRequest,
} from "@/types/api";

/**
 * Groups Datasource
 * Handles all group-related API calls
 */
export class GroupsDataSource {
  /**
   * Get all groups for the current user
   */
  static async getGroups(): Promise<Group[]> {
    // api.get now returns unwrapped data: { groups: Group[], total: number }
    const data = await withRetry(() =>
      api.get<{ groups: Group[]; total: number }>("/groups")
    );
    return data.groups;
  }

  /**
   * Create a new group
   */
  static async createGroup(data: CreateGroupRequest): Promise<Group> {
    // api.post now returns unwrapped data: { group: Group, message: string }
    const result = await withRetry(() =>
      api.post<{ group: Group; message: string }>("/groups", data)
    );
    return result.group;
  }

  /**
   * Join a group using a code
   */
  static async joinGroup(data: JoinGroupRequest): Promise<{
    success: boolean;
    requiresApproval?: boolean;
    message?: string;
  }> {
    // api.post now returns unwrapped data
    return withRetry(() =>
      api.post<{
        success: boolean;
        requiresApproval?: boolean;
        message?: string;
      }>("/groups/join", data)
    );
  }

  /**
   * Switch active group
   */
  static async switchGroup(
    data: SwitchGroupRequest
  ): Promise<{ success: boolean }> {
    // api.post now returns unwrapped data
    return withRetry(() =>
      api.post<{ success: boolean }>("/groups/switch", data)
    );
  }

  /**
   * Get a specific group by ID
   */
  static async getGroup(groupId: string): Promise<Group> {
    // api.get now returns unwrapped data: { group: Group }
    const data = await withRetry(() =>
      api.get<{ group: Group }>(`/groups/${groupId}`)
    );
    return data.group;
  }

  /**
   * Update group details
   */
  static async updateGroup(
    groupId: string,
    data: UpdateGroupRequest
  ): Promise<Group> {
    // api.patch now returns unwrapped data: { message: string, group: Group }
    const result = await withRetry(() =>
      api.patch<{ message: string; group: Group }>(`/groups/${groupId}`, data)
    );
    return result.group;
  }

  /**
   * Delete a group
   */
  static async deleteGroup(groupId: string): Promise<{ success: boolean }> {
    // api.delete now returns unwrapped data
    return withRetry(() =>
      api.delete<{ success: boolean }>(`/groups/${groupId}`)
    );
  }

  /**
   * Remove a member from a group
   */
  static async removeMember(
    groupId: string,
    userId: string
  ): Promise<{ success: boolean }> {
    // api.delete now returns unwrapped data
    return withRetry(() =>
      api.delete<{ success: boolean }>(`/groups/${groupId}/members/${userId}`)
    );
  }

  /**
   * Update a member's role
   */
  static async updateMemberRole(
    groupId: string,
    userId: string,
    data: UpdateMemberRoleRequest
  ): Promise<{ success: boolean }> {
    // api.patch now returns unwrapped data
    return withRetry(() =>
      api.patch<{ success: boolean }>(
        `/groups/${groupId}/members/${userId}`,
        data
      )
    );
  }

  /**
   * Get join requests for a group
   */
  static async getJoinRequests(groupId: string): Promise<GroupJoinRequest[]> {
    // api.get now returns unwrapped data: { requests: GroupJoinRequest[], total: number }
    const data = await withRetry(() =>
      api.get<{ requests: GroupJoinRequest[]; total: number }>(
        `/groups/${groupId}/requests`
      )
    );
    return data.requests;
  }

  /**
   * Process a join request (approve or reject)
   */
  static async processJoinRequest(
    groupId: string,
    userId: string,
    data: ProcessJoinRequestRequest
  ): Promise<{ success: boolean }> {
    // api.patch now returns unwrapped data
    return withRetry(() =>
      api.patch<{ success: boolean }>(
        `/groups/${groupId}/requests/${userId}`,
        data
      )
    );
  }
}
