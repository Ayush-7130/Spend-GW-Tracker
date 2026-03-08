import { api, withRetry } from "./base";

// Expense-related types
export interface Expense {
  _id: string;
  groupId?: string; // Group-scoped expenses
  amount: number;
  description: string;
  date: string;
  category: string;
  paidBy: string; // User ID from group members
  isSplit?: boolean;
  categoryName?: string;
  subcategory?: string;
  splitBetween?: string[]; // Array of user IDs from group
  splitDetails?: {
    type?: string;
    splits?: Array<{
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseData {
  groupId?: string; // Required for group-scoped creation
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string; // User ID from group members
  isSplit?: boolean;
  splitBetween?: string[]; // Array of user IDs from group
  splitDetails?: {
    type?: string;
    splits?: Array<{
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  _id: string;
}

export interface ExpenseFilters {
  user?: string; // User ID for filtering
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: "date" | "amount" | "description";
  sortOrder?: "asc" | "desc";
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Expenses Datasource
export class ExpensesDataSource {
  /**
   * Get all expenses with optional filtering
   * @param groupId - Required: The group ID to fetch expenses for
   * @param filters - Optional filters for expenses
   */
  static async getExpenses(
    groupId: string,
    filters?: ExpenseFilters
  ): Promise<ExpenseListResponse> {
    return withRetry(() =>
      api.get<ExpenseListResponse>("/expenses", { ...filters, groupId })
    );
  }

  /**
   * Get a specific expense by ID
   * @param groupId - Required: The group ID to verify access
   * @param id - The expense ID
   */
  static async getExpenseById(groupId: string, id: string): Promise<Expense> {
    return withRetry(() => api.get<Expense>(`/expenses/${id}`, { groupId }));
  }

  /**
   * Create a new expense
   * @param groupId - Required: The group ID for the expense
   * @param expenseData - The expense data
   */
  static async createExpense(
    groupId: string,
    expenseData: CreateExpenseData
  ): Promise<Expense> {
    return withRetry(() =>
      api.post<Expense>("/expenses", { ...expenseData, groupId })
    );
  }

  /**
   * Update an existing expense
   * @param groupId - Required: The group ID to verify access
   * @param id - The expense ID
   * @param expenseData - The updated expense data
   */
  static async updateExpense(
    groupId: string,
    id: string,
    expenseData: UpdateExpenseData
  ): Promise<Expense> {
    return withRetry(() =>
      api.put<Expense>(`/expenses/${id}`, { ...expenseData, groupId })
    );
  }

  /**
   * Delete an expense
   * @param groupId - Required: The group ID to verify access
   * @param id - The expense ID
   */
  static async deleteExpense(
    groupId: string,
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return withRetry(() =>
      api.delete<{ success: boolean; message: string }>(
        `/expenses/${id}?groupId=${groupId}`
      )
    );
  }

  /**
   * Get recent expenses (for dashboard)
   * @param groupId - Required: The group ID to fetch expenses for
   * @param limit - Number of expenses to return
   */
  static async getRecentExpenses(
    groupId: string,
    limit: number = 5
  ): Promise<Expense[]> {
    return withRetry(() =>
      api.get<Expense[]>("/expenses", {
        groupId,
        limit,
        sortBy: "date",
        sortOrder: "desc",
      })
    );
  }

  /**
   * Get expense summary/statistics
   * @param groupId - Required: The group ID to calculate summary for
   * @param filters - Optional filters
   */
  static async getExpenseSummary(
    groupId: string,
    filters?: Omit<ExpenseFilters, "page" | "limit">
  ): Promise<{
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    monthlyTotal: number;
    monthlyCount: number;
  }> {
    return withRetry(() =>
      api.get("/expenses/summary", { ...filters, groupId })
    );
  }

  /**
   * Bulk delete expenses
   * @param groupId - Required: The group ID to verify access
   * @param ids - Array of expense IDs to delete
   */
  static async bulkDeleteExpenses(
    groupId: string,
    ids: string[]
  ): Promise<{
    success: boolean;
    deleted: number;
    failed: string[];
  }> {
    return withRetry(() => api.post("/expenses/bulk-delete", { ids, groupId }));
  }

  /**
   * Duplicate an expense
   * @param groupId - Required: The group ID to verify access
   * @param id - The expense ID to duplicate
   * @param modifications - Optional modifications to the duplicated expense
   */
  static async duplicateExpense(
    groupId: string,
    id: string,
    modifications?: Partial<CreateExpenseData>
  ): Promise<Expense> {
    return withRetry(() =>
      api.post(`/expenses/${id}/duplicate`, { ...modifications, groupId })
    );
  }

  /**
   * Get expenses by category
   * @param groupId - Required: The group ID to fetch expenses for
   * @param categoryId - The category ID
   * @param filters - Optional filters
   */
  static async getExpensesByCategory(
    groupId: string,
    categoryId: string,
    filters?: Omit<ExpenseFilters, "category">
  ): Promise<ExpenseListResponse> {
    return withRetry(() =>
      api.get<ExpenseListResponse>("/expenses", {
        ...filters,
        groupId,
        category: categoryId,
      })
    );
  }

  /**
   * Get expense trends over time
   */
  static async getExpenseTrends(
    period: "week" | "month" | "year" = "month",
    filters?: ExpenseFilters
  ): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  }> {
    return withRetry(() =>
      api.get(`/expenses/trends`, {
        ...filters,
        period,
      })
    );
  }
}

export default ExpensesDataSource;
