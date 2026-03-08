// Shared API Types - Single Source of Truth

// All types derived from actual MongoDB schemas in database.ts

// BASE TYPES

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface SortConfig {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// USER TYPES

export type UserRole = "user" | "admin";

export interface UserGroupMembership {
  groupId: string;
  role: "admin" | "member";
  isDefault?: boolean;
}

export interface User {
  _id: string;
  id: string;
  email: string;
  name: string;
  role: UserRole;
  groups?: UserGroupMembership[];
  currentGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupResponse {
  user: User;
  token: string;
  expiresAt: Date;
}

export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// EXPENSE TYPES

export interface SplitDetail {
  type?: "equal" | "manual";
  splits: Array<{
    userId: string;
    userName: string;
    amount: number;
  }>;
}

export interface Expense {
  _id: string;
  groupId?: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string;
  isSplit: boolean;
  splitBetween?: string[];
  splitDetails?: SplitDetail;
  categoryDetails?: Array<{ name: string; _id?: string }>;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseRequest {
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string;
  isSplit: boolean;
  splitBetween?: string[];
  splitDetails?: SplitDetail;
}

export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  _id: string;
}

export interface ExpenseFilters extends FilterParams {
  category?: string;
  paidBy?: string;
}

export interface ExpensesResponse {
  expenses: Expense[];
  pagination: PaginationMeta;
}

// CATEGORY TYPES

export interface Subcategory {
  name: string;
  description: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  subcategories: Subcategory[];
  groupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  subcategories?: Subcategory[];
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  _id: string;
}

// SETTLEMENT TYPES

export type SettlementStatus = "pending" | "completed" | "cancelled";

export interface Settlement {
  _id: string;
  groupId?: string;
  expenseId?: string;
  fromUser: string;
  toUser: string;
  fromUserName?: string;
  toUserName?: string;
  amount: number;
  description: string;
  date: string;
  status: SettlementStatus;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSettlementRequest {
  expenseId?: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  date?: string;
  status?: SettlementStatus;
}

export interface UpdateSettlementRequest extends Partial<CreateSettlementRequest> {
  _id: string;
}

export interface Balance {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  status: "owes" | "settled";
}

export interface BalanceSummary {
  groupId?: string;
  totalOwed: number;
  totalSettled: number;
  totalTransactions: number;
  activeBalances: number;
}

export interface BalanceResponse {
  balances: Balance[];
  userBalances?: Array<{
    userId: string;
    userName: string;
    netBalance: number;
    owes: Array<{ userId: string; userName: string; amount: number }>;
    owedBy: Array<{ userId: string; userName: string; amount: number }>;
  }>;
  summary: BalanceSummary;
}

export interface SettlementFilters extends FilterParams {
  user?: string;
  status?: SettlementStatus;
}

export interface SettlementsResponse {
  settlements: Settlement[];
  pagination?: PaginationMeta;
}

// DASHBOARD TYPES

export interface DashboardStats {
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
  recentExpenses: Expense[];
  categoryBreakdown?: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

// ANALYTICS TYPES

export type TimeRange = "week" | "month" | "quarter" | "year" | "custom";

export interface TrendDataPoint {
  date: string;
  amount: number;
  count?: number;
}

export interface CategorySpending {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface UserSpending {
  user: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface AnalyticsOverview {
  totalSpending: number;
  averagePerDay: number;
  transactionCount: number;
  trends: TrendDataPoint[];
  categoryBreakdown: CategorySpending[];
  userBreakdown: UserSpending[];
}

export interface AnalyticsFilters {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  category?: string;
  user?: string;
}

// NOTIFICATION TYPES

export type NotificationType =
  | "expense_added"
  | "expense_updated"
  | "expense_deleted"
  | "settlement_added"
  | "settlement_updated"
  | "settlement_deleted"
  | "category_added"
  | "category_updated"
  | "category_deleted"
  | "password_changed"
  | "password_reset"
  | "new_login"
  | "failed_login_attempts"
  | "session_revoked"
  | "mfa_enabled"
  | "mfa_disabled"
  | "group_created"
  | "group_joined"
  | "join_request_approved"
  | "join_request_rejected"
  | "member_added"
  | "member_removed"
  | "admin_role_granted"
  | "admin_role_revoked";

export interface Notification {
  _id: string;
  userId: string;
  groupId?: string;
  type: NotificationType;
  message: string;
  entityId?: string;
  entityType?: "expense" | "settlement" | "category" | "security" | "group";
  read: boolean;
  readAt?: string;
  expiresAt?: string;
  metadata?: {
    deviceInfo?: string;
    location?: string;
    excludeSessionId?: string;
  };
  createdAt: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  message: string;
}

// ERROR TYPES

export interface ApiError {
  error: string;
  errors?: Record<string, string>;
  status: number;
}

export interface ValidationError {
  field: string;
  message: string;
}

// EXPORT TYPES

export type ExportFormat = "csv" | "excel" | "json" | "pdf";

export interface ExportRequest {
  format: ExportFormat;
  filters?: Record<string, unknown>;
  columns?: string[];
}

// TYPE GUARDS

export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

export function isErrorResponse(
  response: ApiResponse
): response is ApiResponse & { success: false; error: string } {
  return response.success === false && response.error !== undefined;
}

export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

// GROUP TYPES

export type GroupRole = "admin" | "member";

export interface GroupMember {
  userId: string;
  name?: string;
  email?: string;
  role: GroupRole;
  joinedAt: Date | string;
}

export interface GroupSettings {
  allowJoinRequests: boolean;
  requireApproval: boolean;
  notifyOnJoinRequest: boolean;
}

export interface Group {
  _id: string;
  name: string;
  description?: string;
  groupId: string;
  members: GroupMember[];
  memberCount?: number;
  pendingRequestsCount?: number;
  createdBy: string;
  createdAt: Date | string;
  updatedAt?: Date | string;
  settings?: GroupSettings;
}

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export interface GroupJoinRequest {
  _id: string;
  groupId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: JoinRequestStatus;
  requestedAt: Date | string;
  processedAt?: Date | string;
  processedBy?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface JoinGroupRequest {
  groupCode: string;
}

export interface SwitchGroupRequest {
  groupId: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  settings?: Partial<GroupSettings>;
}

export interface UpdateMemberRoleRequest {
  role: GroupRole;
}

export interface ProcessJoinRequestRequest {
  action: "approve" | "reject";
}

// UTILITY TYPES

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

export type PickMultiple<T, K extends keyof T> = Pick<T, K>;
