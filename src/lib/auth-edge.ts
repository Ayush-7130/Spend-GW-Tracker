/**
 * Authentication utilities for Edge Runtime (Middleware)
 *
 * EDGE COMPATIBLE: Uses only Web APIs compatible with Vercel Edge Runtime.
 * Uses jose library instead of jsonwebtoken for Edge compatibility.
 *
 * SECURITY: Single token system with FIXED expiry (no sliding sessions)
 * - Token expiry set once at login, never extends
 * - Remember Me = false: 1 day fixed expiry
 * - Remember Me = true: 7 days fixed expiry
 */

import { NextRequest } from "next/server";

/**
 * JWT Secret for Edge Runtime token verification
 *
 * SECURITY: Must match JWT_SECRET used in auth.ts for token signing
 */
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

// JWT Payload interface
// MUST match the server-side JWTPayload in auth.ts
// Token is signed with { userId, email, tokenId } — no role/sessionId/currentGroupId
export interface JWTPayload {
  userId: string;
  email: string;
  tokenId?: string; // For token revocation tracking (matches auth.ts)
  iat?: number;
  exp?: number;
}

/**
 * Verify authentication token in Edge Runtime
 *
 * Uses jose library for JWT verification (Edge compatible).
 * Includes clock tolerance to handle minor server time differences.
 *
 * SECURITY: Verifies token signature and expiration only.
 * Middleware should also check database session status for revocation.
 *
 * @param token - JWT token string from cookie or header
 * @returns Decoded payload if valid, null if invalid/expired
 */
export async function verifyRefreshToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(JWT_SECRET);

    // Verify with 60-second clock tolerance for distributed systems
    // Prevents false negatives from minor clock drift between servers
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 60,
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      tokenId: payload.tokenId as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    // Invalid signature, expired token, or malformed JWT
    return null;
  }
}

/**
 * Get authentication token from HTTP request
 *
 * Extracts token from httpOnly cookie set during login.
 *
 * SECURITY: Token stored in httpOnly cookie prevents XSS attacks
 * from stealing authentication credentials via JavaScript.
 *
 * @param request - Next.js request object
 * @returns Token string or null if not present
 */
export function getRefreshTokenFromRequest(
  request: NextRequest
): string | null {
  return request.cookies.get("refreshToken")?.value || null;
}

/**
 * Re-export password validation from canonical location.
 * Uses isPasswordValid (boolean) for Edge runtime simplicity.
 *
 * For detailed validation with error messages, import isValidPassword from @/lib/utils/security
 */
export {
  isPasswordValid as isValidPassword,
  PASSWORD_REQUIREMENTS,
} from "@/lib/utils/security";
