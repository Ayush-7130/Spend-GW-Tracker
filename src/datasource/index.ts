// Re-export all datasources for easy importing
export {
  default as AnalyticsDataSource,
  type AnalyticsOverview,
  type TimelineData,
  type CategoryTrend,
  type UserAnalytics,
  type ComparisonData,
  type AdvancedFilters,
} from "./analytics";
export {
  AuthDataSource,
  NotificationsDataSource,
  type User,
  type LoginRequest,
  type LoginResponse,
  type SignupRequest,
  type SignupResponse,
  type Notification,
  type NotificationsResponse,
} from "./auth";
export {
  default as CategoriesDataSource,
  type Category,
  type Subcategory,
  type CreateCategoryData,
  type UpdateCategoryData,
  type CategoryStats,
} from "./categories";
export {
  default as DashboardDataSource,
  type DashboardData,
} from "./dashboard";
export {
  default as ExpensesDataSource,
  type Expense,
  type CreateExpenseData,
  type UpdateExpenseData,
  type ExpenseFilters,
  type ExpenseListResponse,
} from "./expenses";
export {
  default as SettlementsDataSource,
  type Settlement,
  type CreateSettlementData,
  type UpdateSettlementData,
  type BalanceInfo,
  type SettlementSummary,
  type SettlementFilters,
  type SettlementListResponse,
} from "./settlements";
export { GroupsDataSource } from "./groups";

// Re-export base utilities
export {
  api,
  ApiError,
  HttpMethod,
  apiRequest,
  withRetry,
  CacheOptions,
  type ApiResponse,
} from "./base";

// Re-export ID normalization utilities for consistent _id/id handling
export {
  normalizeId,
  normalizeIds,
  normalizeGroupId,
  extractId,
  isSameId,
} from "@/lib/utils/normalize";

// Import for use in the combined class
import AnalyticsDataSource from "./analytics";
import { AuthDataSource, NotificationsDataSource } from "./auth";
import CategoriesDataSource from "./categories";
import DashboardDataSource from "./dashboard";
import ExpensesDataSource from "./expenses";
import SettlementsDataSource from "./settlements";
import { GroupsDataSource } from "./groups";

// Combined datasource class for convenience
export class DataSource {
  static Analytics = AnalyticsDataSource;
  static Auth = AuthDataSource;
  static Notifications = NotificationsDataSource;
  static Categories = CategoriesDataSource;
  static Dashboard = DashboardDataSource;
  static Expenses = ExpensesDataSource;
  static Settlements = SettlementsDataSource;
  static Groups = GroupsDataSource;
}
