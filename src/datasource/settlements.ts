import { api, withRetry } from "./base";

// Settlement-related types
export interface Settlement {
  _id: string;
  groupId?: string; // Required for multi-user groups
  fromUser: string; // Can be userId or username
  toUser: string; // Can be userId or username
  amount: number;
  description?: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
  relatedExpenses?: string[]; // Array of expense IDs
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSettlementData {
  groupId?: string; // Will be required when creating settlements
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  date?: string;
  relatedExpenses?: string[];
}

export interface UpdateSettlementData extends Partial<CreateSettlementData> {
  _id: string;
  status?: "pending" | "completed" | "cancelled";
}

export interface BalanceInfo {
  userId: string; // User ID for multi-user support
  userName: string; // User name for display
  netBalance: number; // Positive = owed to this user, negative = owes others
  owes: Array<{ userId: string; userName: string; amount: number }>; // Who this user owes
  owedBy: Array<{ userId: string; userName: string; amount: number }>; // Who owes this user
}

export interface SettlementSummary {
  groupId: string;
  totalOwed: number;
  totalSettled: number;
  totalTransactions: number;
  activeBalances: number;
  balances: BalanceInfo[]; // Array of balances for all users in group
  optimalTransactions: Array<{
    // Optimal settlement plan
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    amount: number;
  }>;
}

export interface SettlementFilters {
  user?: string;
  status?: "pending" | "completed" | "cancelled" | "all";
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount" | "status";
  sortOrder?: "asc" | "desc";
}

export interface SettlementListResponse {
  settlements: Settlement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Settlements Datasource
export class SettlementsDataSource {
  /**
   * Get all settlements with optional filtering
   * @param groupId - Required: The group ID to fetch settlements for
   * @param filters - Optional filters
   */
  static async getSettlements(
    groupId: string,
    filters?: SettlementFilters
  ): Promise<SettlementListResponse> {
    return withRetry(() =>
      api.get<SettlementListResponse>("/settlements", { ...filters, groupId })
    );
  }

  /**
   * Get a specific settlement by ID
   * @param groupId - Required: The group ID to verify access
   * @param id - The settlement ID
   */
  static async getSettlementById(
    groupId: string,
    id: string
  ): Promise<Settlement> {
    return withRetry(() =>
      api.get<Settlement>(`/settlements/${id}`, { groupId })
    );
  }

  /**
   * Create a new settlement
   * @param groupId - Required: The group ID to create settlement for
   * @param settlementData - The settlement data
   */
  static async createSettlement(
    groupId: string,
    settlementData: CreateSettlementData
  ): Promise<Settlement> {
    return withRetry(() =>
      api.post<Settlement>("/settlements", { ...settlementData, groupId })
    );
  }

  /**
   * Update an existing settlement
   * @param groupId - Required: The group ID to verify access
   * @param id - The settlement ID
   * @param settlementData - The updated settlement data
   */
  static async updateSettlement(
    groupId: string,
    id: string,
    settlementData: UpdateSettlementData
  ): Promise<Settlement> {
    return withRetry(() =>
      api.put<Settlement>(`/settlements/${id}`, { ...settlementData, groupId })
    );
  }

  /**
   * Delete a settlement
   * @param groupId - Required: The group ID to verify access
   * @param id - The settlement ID
   */
  static async deleteSettlement(
    groupId: string,
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return withRetry(() =>
      api.delete<{ success: boolean; message: string }>(
        `/settlements/${id}?groupId=${groupId}`
      )
    );
  }

  /**
   * Get balance information for all users in a group
   * @param groupId - Required: The group ID to calculate balances for
   */
  static async getBalances(groupId: string): Promise<SettlementSummary> {
    return withRetry(() =>
      api.get<SettlementSummary>("/settlements/balance", { groupId })
    );
  }

  /**
   * Get balance information for a specific user in a group
   * @param groupId - Required: The group ID
   * @param userId - The user ID to get balance for
   */
  static async getUserBalance(
    groupId: string,
    userId: string
  ): Promise<BalanceInfo> {
    return withRetry(() =>
      api.get<BalanceInfo>(`/settlements/balance/${userId}`, { groupId })
    );
  }

  /**
   * Mark a settlement as completed
   * @param groupId - Required: The group ID to verify access
   * @param id - The settlement ID
   */
  static async completeSettlement(
    groupId: string,
    id: string
  ): Promise<Settlement> {
    return withRetry(() =>
      api.patch<Settlement>(`/settlements/${id}/complete`, { groupId })
    );
  }

  /**
   * Mark a settlement as cancelled
   * @param groupId - Required: The group ID to verify access
   * @param id - The settlement ID
   * @param reason - Optional cancellation reason
   */
  static async cancelSettlement(
    groupId: string,
    id: string,
    reason?: string
  ): Promise<Settlement> {
    return withRetry(() =>
      api.patch<Settlement>(`/settlements/${id}/cancel`, { groupId, reason })
    );
  }

  /**
   * Get recent settlements (for dashboard)
   * @param groupId - Required: The group ID to fetch settlements for
   * @param limit - Maximum number of settlements to return
   */
  static async getRecentSettlements(
    groupId: string,
    limit: number = 5
  ): Promise<Settlement[]> {
    const result = await withRetry(() =>
      api.get<SettlementListResponse>("/settlements", {
        groupId,
        limit,
        sortBy: "date",
        sortOrder: "desc",
      })
    );
    // API returns { settlements: [...], pagination: {...} } after unwrapping
    const response = result as any;
    return Array.isArray(response?.settlements)
      ? response.settlements
      : Array.isArray(response)
        ? response
        : [];
  }

  /**
   * Auto-calculate settlement suggestions based on expenses
   * @param groupId - Required: The group ID to calculate suggestions for
   */
  static async getSettlementSuggestions(groupId: string): Promise<
    Array<{
      fromUser: string;
      toUser: string;
      amount: number;
      relatedExpenses: string[];
      description: string;
    }>
  > {
    return withRetry(() => api.get("/settlements/suggestions", { groupId }));
  }

  /**
   * Create settlements from suggestions
   * @param groupId - Required: The group ID to create settlements for
   * @param suggestions - Array of settlement suggestions
   */
  static async createFromSuggestions(
    groupId: string,
    suggestions: Array<{
      fromUser: string;
      toUser: string;
      amount: number;
      relatedExpenses: string[];
      description?: string;
    }>
  ): Promise<Settlement[]> {
    return withRetry(() =>
      api.post<Settlement[]>("/settlements/create-from-suggestions", {
        groupId,
        suggestions,
      })
    );
  }

  /**
   * Get settlement history/timeline
   * @param groupId - Required: The group ID to fetch history for
   * @param filters - Optional filters
   */
  static async getSettlementHistory(
    groupId: string,
    filters?: {
      user?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<
    Array<{
      date: string;
      settlements: Settlement[];
      totalAmount: number;
    }>
  > {
    return withRetry(() =>
      api.get("/settlements/history", { ...filters, groupId })
    );
  }

  /**
   * Bulk operations on settlements
   * @param groupId - Required: The group ID to verify access
   * @param ids - Array of settlement IDs
   * @param updates - Updates to apply
   */
  static async bulkUpdateSettlements(
    groupId: string,
    ids: string[],
    updates: { status?: Settlement["status"]; description?: string }
  ): Promise<{
    updated: number;
    failed: string[];
  }> {
    return withRetry(() =>
      api.patch("/settlements/bulk-update", { groupId, ids, updates })
    );
  }

  /**
   * Get settlement statistics
   * @param groupId - Required: The group ID to fetch stats for
   * @param timeframe - Time period for statistics
   */
  static async getSettlementStats(
    groupId: string,
    timeframe?: "week" | "month" | "year" | "all"
  ): Promise<{
    totalSettlements: number;
    completedSettlements: number;
    pendingSettlements: number;
    cancelledSettlements: number;
    totalAmount: number;
    averageAmount: number;
    completionRate: number;
  }> {
    return withRetry(() =>
      api.get("/settlements/stats", { groupId, timeframe: timeframe || "all" })
    );
  }

  /**
   * Export settlements to CSV/JSON
   * @param groupId - Required: The group ID to export settlements from
   * @param format - Export format
   * @param filters - Optional filters
   */
  static async exportSettlements(
    groupId: string,
    format: "csv" | "json" = "json",
    filters?: SettlementFilters
  ): Promise<{ data: Settlement[]; filename: string }> {
    return withRetry(() =>
      api.get("/settlements/export", { ...filters, groupId, format })
    );
  }

  /**
   * Get optimal settlement plan (minimize number of transactions)
   * Uses graph algorithm to minimize transactions for N users in a group
   * @param groupId - Required: The group ID to calculate optimal plan for
   */
  static async getOptimalSettlementPlan(groupId: string): Promise<
    Array<{
      fromUserId: string;
      fromUserName: string;
      toUserId: string;
      toUserName: string;
      amount: number;
      description: string;
    }>
  > {
    return withRetry(() => api.get("/settlements/optimal-plan", { groupId }));
  }
}

export default SettlementsDataSource;
