import { api, withRetry } from "./base";

// Category-related types
export interface Subcategory {
  name: string;
  description?: string;
  _id?: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  subcategories?: Subcategory[];
  color?: string;
  icon?: string;
  isActive?: boolean;
  groupId?: string; // Optional for backward compatibility
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  subcategories?: Omit<Subcategory, "_id">[];
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  _id: string;
}

export interface CategoryStats {
  _id: string;
  name: string;
  totalExpenses: number;
  expenseCount: number;
  averageExpense: number;
  percentage: number;
  monthlyTotal?: number;
  monthlyCount?: number;
}

// Categories Datasource
export class CategoriesDataSource {
  /**
   * Get all categories
   * @param groupId - Required: The group ID to fetch categories for
   * @param includeInactive - Whether to include inactive categories
   */
  static async getCategories(
    groupId: string,
    includeInactive: boolean = false
  ): Promise<Category[]> {
    return withRetry(() =>
      api.get<Category[]>("/categories", { groupId, includeInactive })
    );
  }

  /**
   * Get a specific category by ID
   * @param groupId - Required: The group ID to verify access
   * @param id - The category ID
   */
  static async getCategoryById(groupId: string, id: string): Promise<Category> {
    return withRetry(() => api.get<Category>(`/categories/${id}`, { groupId }));
  }

  /**
   * Create a new category
   * @param groupId - Required: The group ID to create category for
   * @param categoryData - The category data
   */
  static async createCategory(
    groupId: string,
    categoryData: CreateCategoryData
  ): Promise<Category> {
    return withRetry(() =>
      api.post<Category>("/categories", { ...categoryData, groupId })
    );
  }

  /**
   * Update an existing category
   * @param groupId - Required: The group ID to verify access
   * @param id - The category ID
   * @param categoryData - The updated category data
   */
  static async updateCategory(
    groupId: string,
    id: string,
    categoryData: UpdateCategoryData
  ): Promise<Category> {
    return withRetry(() =>
      api.put<Category>(`/categories/${id}`, { ...categoryData, groupId })
    );
  }

  /**
   * Delete a category
   * @param groupId - Required: The group ID to verify access
   * @param id - The category ID
   */
  static async deleteCategory(
    groupId: string,
    id: string
  ): Promise<{
    success: boolean;
    message: string;
    affectedExpenses?: number;
  }> {
    return withRetry(() =>
      api.delete<{
        success: boolean;
        message: string;
        affectedExpenses?: number;
      }>(`/categories/${id}?groupId=${groupId}`)
    );
  }

  /**
   * Add a subcategory to an existing category
   * @param groupId - Required: The group ID to verify access
   * @param categoryId - The parent category ID
   * @param subcategory - The subcategory data
   */
  static async addSubcategory(
    groupId: string,
    categoryId: string,
    subcategory: Omit<Subcategory, "_id">
  ): Promise<Category> {
    return withRetry(() =>
      api.post<Category>(`/categories/${categoryId}/subcategories`, {
        ...subcategory,
        groupId,
      })
    );
  }

  /**
   * Update a subcategory
   * @param groupId - Required: The group ID to verify access
   * @param categoryId - The parent category ID
   * @param subcategoryId - The subcategory ID
   * @param subcategory - The updated subcategory data
   */
  static async updateSubcategory(
    groupId: string,
    categoryId: string,
    subcategoryId: string,
    subcategory: Partial<Subcategory>
  ): Promise<Category> {
    return withRetry(() =>
      api.put<Category>(
        `/categories/${categoryId}/subcategories/${subcategoryId}`,
        { ...subcategory, groupId }
      )
    );
  }

  /**
   * Delete a subcategory
   * @param groupId - Required: The group ID to verify access
   * @param categoryId - The parent category ID
   * @param subcategoryId - The subcategory ID
   */
  static async deleteSubcategory(
    groupId: string,
    categoryId: string,
    subcategoryId: string
  ): Promise<Category> {
    return withRetry(() =>
      api.delete<Category>(
        `/categories/${categoryId}/subcategories/${subcategoryId}?groupId=${groupId}`
      )
    );
  }

  /**
   * Get category statistics
   * @param groupId - Required: The group ID to fetch stats for
   * @param timeframe - Time period for statistics
   */
  static async getCategoryStats(
    groupId: string,
    timeframe?: "week" | "month" | "year" | "all"
  ): Promise<CategoryStats[]> {
    return withRetry(() =>
      api.get<CategoryStats[]>("/categories/stats", {
        groupId,
        timeframe: timeframe || "all",
      })
    );
  }

  /**
   * Get categories with expense counts
   * @param groupId - Required: The group ID to fetch categories for
   */
  static async getCategoriesWithCounts(
    groupId: string
  ): Promise<Array<Category & { expenseCount: number; totalAmount: number }>> {
    return withRetry(() =>
      api.get<Array<Category & { expenseCount: number; totalAmount: number }>>(
        "/categories/with-counts",
        { groupId }
      )
    );
  }

  /**
   * Search categories by name
   * @param groupId - Required: The group ID to search within
   * @param query - Search query
   */
  static async searchCategories(
    groupId: string,
    query: string
  ): Promise<Category[]> {
    return withRetry(() =>
      api.get<Category[]>("/categories/search", { groupId, q: query })
    );
  }

  /**
   * Toggle category active status
   * @param groupId - Required: The group ID to verify access
   * @param id - The category ID
   */
  static async toggleCategoryStatus(
    groupId: string,
    id: string
  ): Promise<Category> {
    return withRetry(() =>
      api.patch<Category>(`/categories/${id}/toggle-status`, { groupId })
    );
  }

  /**
   * Bulk delete categories
   * @param groupId - Required: The group ID to verify access
   * @param ids - Array of category IDs to delete
   */
  static async bulkDeleteCategories(
    groupId: string,
    ids: string[]
  ): Promise<{
    success: boolean;
    deleted: number;
    failed: string[];
    totalAffectedExpenses: number;
  }> {
    return withRetry(() =>
      api.post("/categories/bulk-delete", { groupId, ids })
    );
  }

  /**
   * Reorder categories (for drag and drop functionality)
   * @param groupId - Required: The group ID to verify access
   * @param categoryIds - Ordered array of category IDs
   */
  static async reorderCategories(
    groupId: string,
    categoryIds: string[]
  ): Promise<{ success: boolean }> {
    return withRetry(() =>
      api.put("/categories/reorder", { groupId, categoryIds })
    );
  }

  /**
   * Get popular categories (most used)
   * @param groupId - Required: The group ID to fetch popular categories for
   * @param limit - Maximum number of categories to return
   */
  static async getPopularCategories(
    groupId: string,
    limit: number = 5
  ): Promise<CategoryStats[]> {
    return withRetry(() =>
      api.get<CategoryStats[]>("/categories/popular", { groupId, limit })
    );
  }

  /**
   * Import categories from a predefined list or CSV
   * @param groupId - Required: The group ID to import categories into
   * @param categories - Array of categories to import
   */
  static async importCategories(
    groupId: string,
    categories: CreateCategoryData[]
  ): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    return withRetry(() =>
      api.post("/categories/import", { groupId, categories })
    );
  }

  /**
   * Export categories to JSON format
   * @param groupId - Required: The group ID to export categories from
   */
  static async exportCategories(groupId: string): Promise<Category[]> {
    return withRetry(() =>
      api.get<Category[]>("/categories/export", { groupId })
    );
  }
}

export default CategoriesDataSource;
