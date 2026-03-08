import { api, withRetry } from "./base";

// User interface (simplified - no groups in JWT)
export interface User {
  _id: string;
  id: string; // Alias for _id for convenience
  name: string;
  email: string;
  role: "user" | "admin";
  // Groups are NO LONGER stored in User object - fetch separately via GroupContext
  createdAt: string;
  updatedAt: string;
}

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaToken?: string; // Optional MFA token
}

export interface LoginResponse {
  user?: User;
  token?: string;
  requiresMfa?: boolean; // Flag for MFA requirement
  message?: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupResponse {
  user: User;
}

// Authentication Datasource
export class AuthDataSource {
  /**
   * Login user with enhanced security (MFA support)
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    // api.post now returns unwrapped data directly
    const data = await withRetry(() =>
      api.post<LoginResponse>("/auth/login", credentials)
    );

    // Store Remember Me preference in appropriate storage
    // This helps the client know which storage strategy to use
    if (typeof window !== "undefined") {
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      storage.setItem("rememberMe", credentials.rememberMe ? "true" : "false");

      // Clear the other storage to avoid conflicts
      const otherStorage = credentials.rememberMe
        ? sessionStorage
        : localStorage;
      otherStorage.removeItem("rememberMe");
    }
    return data;
  }

  /**
   * Sign up new user
   */
  static async signup(userData: SignupRequest): Promise<SignupResponse> {
    // api.post now returns unwrapped data directly
    return withRetry(() => api.post<SignupResponse>("/auth/signup", userData));
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ success: boolean; message: string }> {
    // api.post now returns unwrapped data directly
    const data = await withRetry(() =>
      api.post<{ success: boolean; message: string }>("/auth/logout")
    );

    // Clear Remember Me preference from both storages
    if (typeof window !== "undefined") {
      localStorage.removeItem("rememberMe");
      sessionStorage.removeItem("rememberMe");
    }

    return data;
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User> {
    // Don't use retry for auth checks as 401 errors are expected when not authenticated
    // api.get now returns unwrapped data: { user: User }
    const data = await api.get<{ user: User }>("/auth/me");
    return data.user;
  }
}

// Notifications interface
export interface Notification {
  _id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

// Notifications Datasource
export class NotificationsDataSource {
  /**
   * Get user notifications
   */
  static async getNotifications(
    page: number = 1,
    limit: number = 20,
    groupId?: string
  ): Promise<NotificationsResponse> {
    // api.get now returns unwrapped data directly
    return withRetry(() =>
      api.get<NotificationsResponse>("/notifications", {
        page,
        limit,
        ...(groupId ? { groupId } : {}),
      })
    );
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(
    notificationId: string
  ): Promise<{ success: boolean; message: string }> {
    // api.patch now returns unwrapped data directly
    return withRetry(() =>
      api.patch<{ success: boolean; message: string }>("/notifications", {
        notificationId,
        markAsRead: true,
        setTTL: true,
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    // api.patch now returns unwrapped data directly
    return withRetry(() =>
      api.patch<{ success: boolean; message: string }>("/notifications", {
        markAllAsRead: true,
        setTTL: true,
      })
    );
  }
}
