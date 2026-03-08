/**
 * API Middleware and Utilities
 *
 * Common middleware functions and utilities for Next.js API routes.
 * Provides authentication, error handling, request validation, and response formatting.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  sanitizeInput,
  sanitizeSearchQuery,
  isValidObjectId,
} from "@/lib/utils/security";
import { Group } from "@/lib/database";
import { validateGroupAccess } from "@/lib/utils/group";

// ===========================================================================
// TYPES
// ===========================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface ApiHandler<T = any> {
  (req: NextRequest, context?: any): Promise<NextResponse<ApiResponse<T>>>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  currentGroupId?: string; // Active group context
}

export interface RequestContext {
  user?: AuthenticatedUser;
  params?: Record<string, string>;
}

export interface GroupRequestContext extends RequestContext {
  user: AuthenticatedUser;
  group: Group; // Validated group document
  params?: Record<string, string>;
}

// ===========================================================================
// RESPONSE FORMATTERS
// ===========================================================================

/**
 * Format success response with optimized headers
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  cacheOptions?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    etag?: string;
  }
): NextResponse<ApiResponse<T>> {
  const response = NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );

  // Add cache control headers if provided
  if (cacheOptions) {
    const { maxAge = 60, staleWhileRevalidate = 30, etag } = cacheOptions;
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );

    if (etag) {
      response.headers.set("ETag", etag);
    }
  }

  return response;
}

/**
 * Format error response
 */
export function errorResponse(
  error: string | Error,
  status: number = 500,
  errors?: Record<string, string>
): NextResponse<ApiResponse> {
  const errorMessage = error instanceof Error ? error.message : error;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      errors,
    },
    { status }
  );
}

/**
 * Format validation error response
 */
export function validationErrorResponse(
  errors: Record<string, string>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      errors,
    },
    { status: 400 }
  );
}

/**
 * Format not found response
 */
export function notFoundResponse(
  message: string = "Resource not found"
): NextResponse<ApiResponse> {
  return errorResponse(message, 404);
}

/**
 * Format unauthorized response
 */
export function unauthorizedResponse(
  message: string = "Unauthorized access"
): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

/**
 * Format forbidden response
 */
export function forbiddenResponse(
  message: string = "Access forbidden"
): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

// ===========================================================================
// ERROR HANDLING MIDDLEWARE
// ===========================================================================

/**
 * Wrap API handler with error handling
 * Catches all errors and returns formatted error responses
 */
export function withErrorHandling<T = any>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Handle known error types
      if (error instanceof ValidationError) {
        return validationErrorResponse(error.errors);
      }

      if (error instanceof NotFoundError) {
        return notFoundResponse(error.message);
      }

      if (error instanceof UnauthorizedError) {
        return unauthorizedResponse(error.message);
      }

      if (error instanceof ForbiddenError) {
        return forbiddenResponse(error.message);
      }

      // Handle unknown errors
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";

      return errorResponse(message, 500);
    }
  };
}

// ===========================================================================
// AUTHENTICATION MIDDLEWARE
// ===========================================================================

/**
 * Require authentication for API route
 * Returns 401 if user is not authenticated
 */
export function withAuth<T = any>(
  handler: (
    req: NextRequest,
    context: RequestContext
  ) => Promise<NextResponse<ApiResponse<T>>>
): ApiHandler<T> {
  return withErrorHandling(async (req: NextRequest, routeContext?: any) => {
    // Get user from JWT token
    const jwtPayload = await getUserFromRequest(req);

    if (!jwtPayload) {
      return unauthorizedResponse("Authentication required");
    }

    // Fetch user from database to get current group and actual user name
    // This ensures we always have the latest currentGroupId and correct name
    const { dbManager } = await import("@/lib/database");
    const userDoc = await dbManager.getUserById(jwtPayload.userId);

    if (!userDoc) {
      return unauthorizedResponse("User not found");
    }

    const user: AuthenticatedUser = {
      id: jwtPayload.userId,
      email: jwtPayload.email,
      name: userDoc.name, // Use actual name from database, not fabricated from email
      currentGroupId: userDoc.currentGroupId, // Get from database, not JWT
    };

    const context: RequestContext = {
      user,
      params: routeContext?.params,
    };

    return handler(req, context);
  });
}

/**
 * Group authentication middleware options
 */
export interface GroupAuthOptions {
  /** Require admin role for access */
  requireAdmin?: boolean;
  /** Where to get groupId - 'server' uses currentGroupId from database (default),
   *  'request' allows client-provided groupId from query/body/params */
  groupIdSource?: "server" | "request";
}

/**
 * Require authentication AND group membership for API route
 *
 * UNIFIED GROUP ACCESS MIDDLEWARE - Single source of truth for group authorization.
 *
 * Validates that:
 * - User is authenticated
 * - User has/provides a valid group ID
 * - User is a member of that group
 * - User has required role (if specified)
 *
 * Returns:
 * - 401 if not authenticated
 * - 400 if no group ID available
 * - 403 if not a member or lacks required role
 * - 404 if group not found
 *
 * GROUP ID SOURCE (groupIdSource option):
 * - 'server' (default): Uses user.currentGroupId from database
 *   - SECURITY: Safer against IDOR attacks - group access is server-controlled
 *   - Multi-tab consideration: Switching groups in one tab doesn't affect others
 * - 'request': Extracts groupId from query params, body, or route params
 *   - Use case: When client needs to specify which group to operate on
 *   - Still validates membership from database
 *
 * @param handler - Request handler with group context
 * @param options - Configuration options (boolean for backward compatibility)
 */
export function withGroupAuth<T = any>(
  handler: (
    req: NextRequest,
    context: GroupRequestContext
  ) => Promise<NextResponse<ApiResponse<T>>>,
  options?: boolean | GroupAuthOptions
): ApiHandler<T> {
  // Support legacy boolean parameter for backward compatibility
  const opts: GroupAuthOptions =
    typeof options === "boolean" ? { requireAdmin: options } : options || {};

  const { requireAdmin = false, groupIdSource = "server" } = opts;

  return withAuth(async (req: NextRequest, authContext: RequestContext) => {
    const { user, params } = authContext;

    if (!user) {
      return unauthorizedResponse("Authentication required");
    }

    // Resolve groupId based on source
    let groupId: string | null = null;

    if (groupIdSource === "server") {
      // Use server-controlled currentGroupId from user document
      groupId = user.currentGroupId || null;

      if (!groupId) {
        return errorResponse(
          "No active group selected. Please create or join a group first.",
          400
        );
      }
    } else {
      // Extract groupId from request (query, body, or params)
      groupId = req.nextUrl.searchParams.get("groupId");

      if (!groupId) {
        try {
          const body = await req.json();
          groupId = body.groupId || null;

          // Re-create request since body was consumed
          const newReq = new Request(req.url, {
            method: req.method,
            headers: req.headers,
            body: JSON.stringify(body),
          });
          Object.assign(req, newReq);
        } catch {
          // Body is not JSON or empty
        }
      }

      // Fallback to route params (e.g., /api/groups/[id])
      if (!groupId && params?.id) {
        groupId = params.id;
      }

      if (!groupId) {
        return errorResponse(
          "groupId is required. Provide it in query params or request body.",
          400
        );
      }
    }

    try {
      // Validate user's access to the group using centralized validation
      const group = await validateGroupAccess(groupId, user.id, requireAdmin);

      // Create group-aware context
      const groupContext: GroupRequestContext = {
        user,
        group,
        params,
      };

      return handler(req, groupContext);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Group access denied";

      // Translate error types to appropriate HTTP responses
      if (message.includes("not a member")) {
        return forbiddenResponse("You are not a member of this group");
      }

      if (message.includes("not an admin")) {
        return forbiddenResponse("Admin access required for this action");
      }

      if (message.includes("not found")) {
        return notFoundResponse("Group not found");
      }

      return errorResponse(message, 403);
    }
  });
}

/**
 * Require group admin access for API route
 *
 * Shorthand for withGroupAuth with requireAdmin=true
 */
export function withGroupAdmin<T = any>(
  handler: (
    req: NextRequest,
    context: GroupRequestContext
  ) => Promise<NextResponse<ApiResponse<T>>>
): ApiHandler<T> {
  return withGroupAuth(handler, { requireAdmin: true });
}

// ===========================================================================
// METHOD VALIDATION MIDDLEWARE
// ===========================================================================

/**
 * Validate HTTP method for API route
 * Returns 405 if method is not allowed
 */
export function withMethods<T = any>(
  allowedMethods: string[],
  handler: ApiHandler<T>
): ApiHandler<T> {
  return withErrorHandling(async (req: NextRequest, context?: any) => {
    if (!allowedMethods.includes(req.method)) {
      return NextResponse.json(
        {
          success: false,
          error: `Method ${req.method} not allowed`,
        },
        {
          status: 405,
          headers: {
            Allow: allowedMethods.join(", "),
          },
        }
      );
    }

    return handler(req, context);
  });
}

// ===========================================================================
// REQUEST BODY VALIDATION
// ===========================================================================

/**
 * Validate request body against schema
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ValidationSchema<T>
): Promise<{ valid: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const body = await req.json();
    const result = schema.validate(body);

    if (!result.valid) {
      return {
        valid: false,
        errors: result.errors,
      };
    }

    return {
      valid: true,
      data: result.data,
    };
  } catch {
    return {
      valid: false,
      errors: {
        body: "Invalid JSON body",
      },
    };
  }
}

// ===========================================================================
// CUSTOM ERROR CLASSES
// ===========================================================================

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ===========================================================================
// VALIDATION SCHEMA TYPE
// ===========================================================================

export interface ValidationSchema<T> {
  validate: (data: any) => {
    valid: boolean;
    data?: T;
    errors?: Record<string, string>;
  };
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Parse query parameters from request with optional sanitization
 */
export function getQueryParams(
  req: NextRequest,
  sanitize: boolean = true
): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = req.nextUrl.searchParams;

  searchParams.forEach((value, key) => {
    params[key] = sanitize ? sanitizeInput(value) : value;
  });

  return params;
}

/**
 * Get single query parameter with optional sanitization
 */
export function getQueryParam(
  req: NextRequest,
  param: string,
  defaultValue?: string,
  sanitize: boolean = true
): string | undefined {
  const value = req.nextUrl.searchParams.get(param) || defaultValue;
  return value && sanitize ? sanitizeInput(value) : value;
}

/**
 * Check if request has valid JSON body
 */
export async function hasValidJsonBody(req: NextRequest): Promise<boolean> {
  try {
    await req.json();
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize search query parameter
 */
export function getSanitizedSearchQuery(req: NextRequest): string {
  const search = req.nextUrl.searchParams.get("search");
  return search ? sanitizeSearchQuery(search) : "";
}

/**
 * Validate and get ObjectId parameter
 */
export function getValidObjectId(
  id: string | undefined,
  paramName: string = "id"
): string {
  if (!id) {
    throw new ValidationError({ [paramName]: `${paramName} is required` });
  }

  if (!isValidObjectId(id)) {
    throw new ValidationError({ [paramName]: `Invalid ${paramName} format` });
  }

  return id;
}

/**
 * Sanitize request body fields
 */
export function sanitizeBodyFields<T extends Record<string, any>>(
  body: T,
  fields: (keyof T)[]
): T {
  const sanitized = { ...body };

  fields.forEach((field) => {
    if (typeof sanitized[field] === "string") {
      sanitized[field] = sanitizeInput(sanitized[field] as string) as any;
    }
  });

  return sanitized;
}

/**
 * Create API route handler with common middleware
 * Combines error handling, method validation, and optional authentication
 */
export function createApiRoute<T = any>(options: {
  methods: string[];
  requireAuth?: boolean;
  handler: (
    req: NextRequest,
    context: RequestContext
  ) => Promise<NextResponse<ApiResponse<T>>>;
}): ApiHandler<T> {
  const { methods, requireAuth = false, handler } = options;

  let wrappedHandler = handler;

  // Apply authentication if required
  if (requireAuth) {
    wrappedHandler = withAuth(handler) as any;
  }

  // Apply method validation
  wrappedHandler = withMethods(methods, wrappedHandler as any) as any;

  return wrappedHandler as ApiHandler<T>;
}

// ===========================================================================
// EXPORTS
// ===========================================================================

const apiMiddleware = {
  // Response formatters
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,

  // Middleware
  withErrorHandling,
  withAuth,
  withGroupAuth, // Unified group access middleware with options for server/request groupId source
  withGroupAdmin, // Shorthand for withGroupAuth({ requireAdmin: true })
  withMethods,

  // Utilities
  validateBody,
  getQueryParams,
  getQueryParam,
  hasValidJsonBody,
  createApiRoute,

  // Error classes
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
};

export default apiMiddleware;
