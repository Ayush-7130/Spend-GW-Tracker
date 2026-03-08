import { api, withRetry } from "./base";

// Dashboard-specific data types matching API response
export interface DashboardData {
  totalExpenses: number;
  totalExpenseCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  categoriesCount: number;
  settlementAmount: number;
  settlementMessage: string;
  settlementDetails?: Array<{
    fromUser: string;
    toUser: string;
    amount: number;
  }>;
  users: Array<{
    id: string;
    name: string;
    email?: string;
    role?: string;
  }>;
  recentExpenses: Array<{
    _id: string;
    amount: number;
    description: string;
    date: string;
    category: string;
    paidBy: string;
    createdBy?: string;
    isSplit?: boolean;
    splitBetween?: string[];
    splitDetails?: {
      type?: string;
      splits?: Array<{
        userId: string;
        userName: string;
        amount: number;
      }>;
    };
    categoryName?: string;
  }>;
}

// Dashboard Datasource
export class DashboardDataSource {
  /**
   * Get complete dashboard data
   * @param groupId - Required: The group ID to fetch dashboard data for (not used in current API but kept for consistency)
   * @param userId - Optional: Filter by specific user ID (defaults to "all")
   */
  static async getDashboardData(
    groupId: string,
    userId: string = "all"
  ): Promise<DashboardData> {
    return withRetry(() =>
      api.get<DashboardData>("/dashboard", { userId, groupId }, "noCache")
    );
  }
}

export default DashboardDataSource;
