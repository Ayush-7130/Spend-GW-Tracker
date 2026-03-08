import { api, withRetry } from "./base";

// Analytics-related types
export interface AnalyticsOverview {
  totalExpenses: number;
  totalExpenseCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  categoriesCount: number;
  settlementAmount: number;
  settlementMessage: string;
  users: Array<{
    id: string;
    name: string;
    totalExpenses: number;
    expenseCount: number;
  }>;
  recentExpenses: Array<{
    _id: string;
    amount: number;
    description: string;
    date: string;
    category: string;
    paidBy: string;
    isSplit?: boolean;
    categoryName?: string;
  }>;
}

export interface TimelineData {
  date: string;
  total: number;
  count: number;
  categories: Array<{
    name: string;
    amount: number;
    count: number;
    color?: string;
  }>;
}

export interface CategoryTrend {
  category: string;
  data: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
}

export interface UserAnalytics {
  username: string;
  totalSpent: number;
  expenseCount: number;
  averageExpense: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  splitVsPersonalRatio: {
    personal: number;
    split: number;
  };
}

export interface ComparisonData {
  users: Array<{
    name: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
  labels: string[];
  summary: {
    totalByUser: Record<string, number>;
    averageByUser: Record<string, number>;
    topSpender: string;
    mostEconomical: string;
  };
}

export interface AdvancedFilters {
  groupId?: string; // Required for multi-group support
  userIds?: string[]; // Filter by specific users in the group
  startDate?: string;
  endDate?: string;
  categories?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  includeSettlements?: boolean;
  groupBy?: "day" | "week" | "month" | "year";
}

// Analytics Datasource
export class AnalyticsDataSource {
  /**
   * Get dashboard overview data
   * @param groupId - Required: The group ID to fetch analytics for
   * @param userIds - Optional: Filter by specific users
   */
  static async getDashboardOverview(
    groupId: string,
    userIds?: string[]
  ): Promise<AnalyticsOverview> {
    return withRetry(() =>
      api.get<AnalyticsOverview>("/analytics/overview", { groupId, userIds })
    );
  }

  /**
   * Get timeline/trend data for charts
   * @param groupId - Required: The group ID to fetch timeline for
   * @param period - Time period for grouping
   * @param filters - Optional filters
   */
  static async getTimelineData(
    groupId: string,
    period: "week" | "month" | "year" = "month",
    filters?: AdvancedFilters
  ): Promise<TimelineData[]> {
    return withRetry(() =>
      api.get<TimelineData[]>("/analytics/timeline", {
        groupId,
        period,
        ...filters,
      })
    );
  }

  /**
   * Get category-wise trends over time
   * @param groupId - Required: The group ID to fetch trends for
   * @param period - Time period for grouping
   * @param filters - Optional filters
   */
  static async getCategoryTrends(
    groupId: string,
    period: "week" | "month" | "year" = "month",
    filters?: AdvancedFilters
  ): Promise<CategoryTrend[]> {
    return withRetry(() =>
      api.get<CategoryTrend[]>("/analytics/trends", {
        groupId,
        period,
        ...filters,
      })
    );
  }

  /**
   * Get detailed user analytics
   * @param groupId - Required: The group ID
   * @param userId - The user ID to get analytics for
   * @param timeframe - Time period for analytics
   */
  static async getUserAnalytics(
    groupId: string,
    userId: string,
    timeframe?: "week" | "month" | "year" | "all"
  ): Promise<UserAnalytics> {
    return withRetry(() =>
      api.get<UserAnalytics>(`/analytics/user/${userId}`, {
        groupId,
        timeframe: timeframe || "all",
      })
    );
  }

  /**
   * Get user comparison data
   * @param groupId - Required: The group ID to compare users within
   * @param metric - Metric to compare
   * @param period - Time period for comparison
   */
  static async getUserComparison(
    groupId: string,
    metric: "spending" | "categories" | "frequency" = "spending",
    period: "week" | "month" | "year" = "month"
  ): Promise<ComparisonData> {
    return withRetry(() =>
      api.get<ComparisonData>("/analytics/comparison", {
        groupId,
        metric,
        period,
      })
    );
  }

  /**
   * Get category breakdown (pie chart data)
   * @param groupId - Required: The group ID to fetch breakdown for
   * @param filters - Optional filters
   */
  static async getCategoryBreakdown(
    groupId: string,
    filters?: AdvancedFilters
  ): Promise<{
    labels: string[];
    data: number[];
    backgroundColor: string[];
    total: number;
  }> {
    return withRetry(() =>
      api.get("/analytics/categories", { groupId, ...filters })
    );
  }

  /**
   * Get spending patterns and insights
   * @param groupId - Required: The group ID to analyze patterns for
   * @param filters - Optional filters
   */
  static async getSpendingPatterns(
    groupId: string,
    filters?: AdvancedFilters
  ): Promise<{
    dailyAverage: number;
    weeklyAverage: number;
    monthlyAverage: number;
    mostExpensiveDay: { day: string; amount: number };
    mostExpensiveCategory: { category: string; amount: number };
    spendingStreak: { current: number; longest: number };
    budgetInsights: {
      recommendedBudget: number;
      savingsPotential: number;
      categoryRecommendations: Array<{
        category: string;
        currentSpending: number;
        recommendedSpending: number;
        reason: string;
      }>;
    };
  }> {
    return withRetry(() =>
      api.get("/analytics/patterns", { groupId, ...filters })
    );
  }

  /**
   * Get monthly summary report
   * @param groupId - Required: The group ID to get summary for
   * @param month - Month in format YYYY-MM
   * @param year - Year
   */
  static async getMonthlySummary(
    groupId: string,
    month?: string,
    year?: number
  ): Promise<{
    month: string;
    totalExpenses: number;
    expenseCount: number;
    averageExpense: number;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    userBreakdown: Record<string, { amount: number; count: number }>;
    weeklyBreakdown: Array<{ week: string; amount: number; count: number }>;
    goals: {
      budgetGoal?: number;
      actualSpending: number;
      variance: number;
      status: "under" | "over" | "on-track";
    };
  }> {
    return withRetry(() =>
      api.get("/analytics/summary", { groupId, month, year })
    );
  }

  /**
   * Get expense forecasting data
   * @param groupId - Required: The group ID to forecast for
   * @param months - Number of months to forecast
   * @param method - Forecasting method
   */
  static async getExpenseForecast(
    groupId: string,
    months: number = 3,
    method: "linear" | "seasonal" | "trend" = "trend"
  ): Promise<{
    forecast: Array<{
      period: string;
      predicted: number;
      confidence: number;
      range: { min: number; max: number };
    }>;
    accuracy: number;
    methodology: string;
    recommendations: string[];
  }> {
    return withRetry(() =>
      api.get("/analytics/forecast", { groupId, months, method })
    );
  }

  /**
   * Get budget analysis and recommendations
   * @param groupId - Required: The group ID to analyze budget for
   * @param budgetAmount - Optional budget amount for comparison
   */
  static async getBudgetAnalysis(
    groupId: string,
    budgetAmount?: number
  ): Promise<{
    currentMonthSpending: number;
    projectedMonthlySpending: number;
    budgetStatus: "under" | "over" | "on-track";
    remainingBudget: number;
    daysRemaining: number;
    dailyBudgetRemaining: number;
    recommendations: Array<{
      type: "warning" | "suggestion" | "congratulation";
      message: string;
      category?: string;
      amount?: number;
    }>;
    categoryBudgets: Array<{
      category: string;
      suggested: number;
      current: number;
      status: "under" | "over" | "on-track";
    }>;
  }> {
    return withRetry(() =>
      api.get("/analytics/budget", { groupId, budgetAmount })
    );
  }

  /**
   * Get advanced analytics with custom queries
   * @param groupId - Required: The group ID to query
   * @param query - Custom analytics query
   */
  static async getAdvancedAnalytics(
    groupId: string,
    query: {
      metrics: string[];
      dimensions: string[];
      filters?: AdvancedFilters;
      aggregation?: "sum" | "avg" | "count" | "min" | "max";
    }
  ): Promise<any> {
    return withRetry(() =>
      api.post("/analytics/advanced", { groupId, ...query })
    );
  }

  /**
   * Export analytics data
   * @param groupId - Required: The group ID to export analytics for
   * @param format - Export format
   * @param reportType - Type of report
   * @param filters - Optional filters
   */
  static async exportAnalytics(
    groupId: string,
    format: "csv" | "json" | "pdf" = "json",
    reportType: "summary" | "detailed" | "charts" = "summary",
    filters?: AdvancedFilters
  ): Promise<{ data: any; filename: string; url?: string }> {
    return withRetry(() =>
      api.get("/analytics/export", { groupId, format, reportType, ...filters })
    );
  }
}

export default AnalyticsDataSource;
