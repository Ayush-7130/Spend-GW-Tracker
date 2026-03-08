/**
 * Login History API Route
 * Get user's login history for security audit
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";

// Prevent caching of sensitive security data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Get user's login history
const handleGetLoginHistory = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const { searchParams } = new URL(request.url);

      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const filter = searchParams.get("filter") || "all"; // all, success, failed

      const db = await dbManager.getDatabase();

      // Build query
      const query: any = { userId: user.id };

      if (filter === "success") {
        query.success = true;
      } else if (filter === "failed") {
        query.success = false;
      }

      // FIX M56, M57: Use aggregation to get all counts in one query with consistent userId
      const skip = (page - 1) * limit;

      // Use aggregation for efficient stats calculation
      const [statsResult] = await db
        .collection("loginHistory")
        .aggregate([
          { $match: { userId: user.id } },
          {
            $facet: {
              stats: [
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    successfulLogins: {
                      $sum: { $cond: [{ $eq: ["$success", true] }, 1, 0] },
                    },
                    failedAttempts: {
                      $sum: { $cond: [{ $eq: ["$success", false] }, 1, 0] },
                    },
                  },
                },
              ],
              filteredHistory: [
                ...(filter !== "all"
                  ? [{ $match: { success: filter === "success" } }]
                  : []),
                { $sort: { timestamp: -1 } },
                { $skip: skip },
                { $limit: limit },
              ],
            },
          },
        ])
        .toArray();

      const stats = statsResult?.stats?.[0] || {
        total: 0,
        successfulLogins: 0,
        failedAttempts: 0,
      };
      const history = statsResult?.filteredHistory || [];

      // Format response
      const formattedHistory = history.map((entry: any) => ({
        _id: entry._id.toString(),
        email: entry.email,
        success: entry.success,
        ipAddress: entry.ipAddress,
        device: entry.deviceInfo?.browser
          ? `${entry.deviceInfo.browser} on ${entry.deviceInfo.os || "Unknown OS"}`
          : "Unknown Device",
        browser: entry.deviceInfo?.browser || "Unknown Browser",
        os: entry.deviceInfo?.os || "Unknown OS",
        deviceType: entry.deviceInfo?.device || "desktop",
        location: entry.location
          ? `${entry.location.city || "Unknown"}, ${entry.location.country || "Unknown"}`
          : undefined,
        failureReason: entry.failureReason,
        timestamp: entry.timestamp,
      }));

      // Calculate filtered total for pagination
      const filteredTotal =
        filter === "success"
          ? stats.successfulLogins
          : filter === "failed"
            ? stats.failedAttempts
            : stats.total;

      return NextResponse.json({
        success: true,
        data: {
          history: formattedHistory,
          pagination: {
            page,
            limit,
            total: filteredTotal,
            totalPages: Math.ceil(filteredTotal / limit),
          },
          stats: {
            totalAttempts: stats.total,
            successfulLogins: stats.successfulLogins,
            failedAttempts: stats.failedAttempts,
          },
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve login history" },
        { status: 500 }
      );
    }
  },
});

export async function GET(request: NextRequest) {
  return handleGetLoginHistory(request);
}
