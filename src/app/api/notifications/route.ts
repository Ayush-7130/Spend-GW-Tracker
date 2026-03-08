/**
 * Notifications API Routes
 *
 * Endpoints:
 * - GET   /api/notifications - Get user notifications (with optional groupId filter)
 * - PATCH /api/notifications - Mark notifications as read
 *
 * Authorization: Requires authentication
 *
 * SECURITY NOTE: Group filtering includes system/security notifications by design
 * See lib/notifications.ts getUserNotifications() for filtering logic
 */

import { NextRequest, NextResponse } from "next/server";
import { withAuth, successResponse, errorResponse } from "@/lib/api-middleware";
import { notificationService } from "@/lib/notifications";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET - Get user notifications
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Within withAuth, user is guaranteed to exist
    if (!user) {
      return errorResponse("User not authenticated", 401);
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const groupId = searchParams.get("groupId"); // Optional: filter by group

    // Get current session ID from refresh token
    const token = request.cookies.get("refreshToken")?.value;
    let sessionId: string | undefined;

    if (token) {
      try {
        const client = await clientPromise;
        const db = client.db("spend-tracker");
        const session = await db.collection("sessions").findOne({
          userId: user.id,
          token,
          isActive: true,
        });
        if (session) {
          sessionId = session._id.toString();
        }
      } catch {
        // Ignore session lookup errors - will show all notifications
      }
    }

    // Get notifications (excluding those meant for current session)
    // Optionally filter by groupId if provided
    // SECURITY NOTE: Service layer ensures userId is always included in query
    // Group filter includes system notifications by design (see getUserNotifications)
    const result = await notificationService.getUserNotifications(
      user.id,
      page,
      limit,
      sessionId,
      groupId || undefined // Filter by group if provided
    );

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    // Prevent any caching for notifications
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch {
    return errorResponse("Failed to get notifications", 500);
  }
});

// PATCH - Mark notification as read and set TTL
export const PATCH = withAuth(async (request: NextRequest, { user }) => {
  try {
    // Within withAuth, user is guaranteed to exist
    if (!user) {
      return errorResponse("User not authenticated", 401);
    }

    const body = await request.json();
    const { notificationId, markAsRead, markAllAsRead, setTTL } = body;

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    if (markAllAsRead) {
      // Mark all unread notifications as read and optionally set TTL
      const updateData: any = { read: true };
      if (setTTL) {
        // Set expiry to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        updateData.expiresAt = expiresAt;
      }

      const result = await db.collection("notifications").updateMany(
        {
          userId: user.id,
          read: false,
        },
        {
          $set: updateData,
        }
      );

      return successResponse(
        {
          message: `Marked ${result.modifiedCount} notifications as read`,
          modifiedCount: result.modifiedCount,
        },
        undefined,
        200
      );
    } else if (notificationId && markAsRead) {
      // Mark specific notification as read and optionally set TTL
      const updateData: any = { read: true };
      if (setTTL) {
        // Set expiry to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        updateData.expiresAt = expiresAt;
      }

      const result = await db.collection("notifications").updateOne(
        {
          _id: new ObjectId(notificationId),
          userId: user.id,
        },
        {
          $set: updateData,
        }
      );

      if (result.matchedCount === 0) {
        return errorResponse("Notification not found", 404);
      }

      return successResponse(
        {
          message: "Notification marked as read",
          modifiedCount: result.modifiedCount,
        },
        undefined,
        200
      );
    } else {
      return errorResponse("Invalid request parameters", 400);
    }
  } catch {
    return errorResponse("Failed to update notifications", 500);
  }
});
