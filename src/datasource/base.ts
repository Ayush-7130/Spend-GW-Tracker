// Base API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

import logger from "@/lib/logger";

// API Error class for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Base API configuration
const API_BASE_URL = "/api";

// HTTP methods enum
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

// Cache control presets for common use cases
export const CacheOptions = {
  // Default: browser-controlled caching
  default: {} as RequestInit,
  // No caching - always fetch fresh data
  noCache: {
    cache: "no-store" as RequestCache,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  } as RequestInit,
  // Short cache - for data that changes frequently
  shortCache: {
    cache: "no-cache" as RequestCache,
  } as RequestInit,
};

// Base fetch wrapper with error handling
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  cacheOption: keyof typeof CacheOptions = "default"
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Apply cache options
  const cacheConfig = CacheOptions[cacheOption];

  const defaultOptions: RequestInit = {
    credentials: "include", // CRITICAL: Always include cookies for auth
    ...cacheConfig,
    headers: {
      "Content-Type": "application/json",
      ...(cacheConfig.headers || {}),
      ...options.headers,
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const response = await fetch(url, mergedOptions);

    // Handle 401 - Token expired, redirect to login
    if (response.status === 401) {
      // Check if we have cookies before redirecting
      const hasCookies =
        typeof document !== "undefined" &&
        document.cookie.includes("refreshToken");

      if (!hasCookies) {
        // Public routes that should not redirect to login
        const publicRoutes = [
          "/login",
          "/signup",
          "/auth/forgot-password",
          "/auth/reset-password",
          "/auth/verify-email",
        ];

        const isPublicRoute = publicRoutes.some((route) =>
          window.location.pathname.startsWith(route)
        );

        // Redirect to login if not already on a public route
        if (typeof window !== "undefined" && !isPublicRoute) {
          window.location.href = "/login";
        }

        throw new ApiError("Authentication required", 401);
      }

      // Token expired - redirect to login
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login";
      }
      throw new ApiError("Session expired. Please login again.", 401);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiError = new ApiError(
        errorData.message ||
          errorData.error ||
          `HTTP error! status: ${response.status}`,
        response.status,
        errorData // This includes the full error response with errors field
      );

      // Log error for debugging (use warn for client errors, error for server errors)
      const logLevel = response.status >= 500 ? "error" : "warn";
      const logMessage = `API request ${logLevel === "error" ? "failed" : "rejected"} [${response.status}]`;

      if (logLevel === "error") {
        logger.error(logMessage, apiError, {
          endpoint,
          status: response.status,
          message: apiError.message,
          errors: errorData.errors,
        });
      } else {
        logger.warn(logMessage, {
          endpoint,
          status: response.status,
          message: apiError.message,
          errors: errorData.errors,
        });
      }

      throw apiError;
    }

    const responseData = await response.json();

    // ARCHITECTURE FIX: Extract data from ApiResponse wrapper
    // All API endpoints return { success: boolean, data?: T, error?: string }
    // Datasources expect only the T payload, not the wrapper
    if (
      responseData &&
      typeof responseData === "object" &&
      "success" in responseData
    ) {
      // This is an ApiResponse wrapper - extract the data
      if (responseData.success && "data" in responseData) {
        return responseData.data;
      }
      // API returned error in success wrapper
      throw new ApiError(
        responseData.error || responseData.message || "API request failed",
        response.status,
        responseData
      );
    }

    // Legacy or non-standard response - return as-is
    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors or JSON parsing errors
    logger.error("API request error", error, { endpoint });
    throw new ApiError(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}

// Helper functions for different HTTP methods
export const api = {
  get: <T = any>(
    endpoint: string,
    params?: Record<string, any>,
    cacheOption: keyof typeof CacheOptions = "default"
  ): Promise<T> => {
    const searchParams = params ? `?${new URLSearchParams(params)}` : "";
    return apiRequest<T>(
      `${endpoint}${searchParams}`,
      {
        method: HttpMethod.GET,
      },
      cacheOption
    );
  },

  // Get with no-cache option for fresh data
  getFresh: <T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> => {
    return api.get<T>(endpoint, params, "noCache");
  },

  post: <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.POST,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.PUT,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T = any>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.DELETE,
    });
  },

  patch: <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.PATCH,
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

// Request retry utility
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Don't retry on 2xx (app-level error on a successful HTTP response) or 4xx (auth/validation)
    if (
      error instanceof ApiError &&
      error.statusCode &&
      ((error.statusCode >= 200 && error.statusCode < 300) ||
        (error.statusCode >= 400 && error.statusCode < 500))
    ) {
      throw error;
    }

    if (retries > 0) {
      if (process.env.NODE_ENV === "development") {
        logger.warn(`Retrying request (${retries} attempts remaining)...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    logger.error("Request failed after all retry attempts", error);
    throw error;
  }
}
