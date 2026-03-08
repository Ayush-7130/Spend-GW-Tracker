/**
 * Auth Refresh API Endpoint
 *
 * POST /api/auth/refresh
 * Refreshes the access token and updates session activity
 *
 * NOTE: This does NOT extend the session expiry time.
 * Sessions have a fixed expiry set at login time.
 * This endpoint only updates the lastActivity timestamp for monitoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import clientPromise from "@/lib/mongodb";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Verify the refresh token and get user
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get the refresh token from cookie
    const refreshToken = request.cookies.get("refreshToken")?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "No refresh token provided" },
        { status: 401 }
      );
    }

    // Update session activity timestamp
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    const result = await db.collection("sessions").updateOne(
      {
        userId: user.userId,
        token: refreshToken,
        isActive: true,
      },
      {
        $set: {
          lastActivity: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Session not found or expired" },
        { status: 401 }
      );
    }

    // Return success with user data
    // The access token cookie is still valid, no need to regenerate
    return NextResponse.json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error("Token refresh error", error);
    return NextResponse.json(
      { success: false, error: "Failed to refresh token" },
      { status: 500 }
    );
  }
}
