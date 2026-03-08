/**
 * Settlements Export API Route
 *
 * GET: Export settlements to CSV format
 * - Respects all filter parameters (date range, user)
 * - Returns CSV file for download
 * - Requires authentication and group membership
 * - CRITICAL: Group-scoped to prevent cross-group data leakage
 */

import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import {
  exportSettlementsToCSV,
  getSettlementExportFilename,
} from "@/lib/utils/export";
import { ObjectId } from "mongodb";

// Prevent caching of exported data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Export settlements to CSV (group-scoped)
export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const searchParams = request.nextUrl.searchParams;

      // Get filter parameters
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const userFilter = searchParams.get("user");

      // Build query - MUST include groupId filter for data isolation
      const db = await dbManager.getDatabase();
      const query: any = {
        groupId: new ObjectId(group._id), // CRITICAL: Filter by active group
      };

      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          query.date.$gte = new Date(startDate);
        }
        if (endDate) {
          query.date.$lte = new Date(endDate);
        }
      }

      // User filter (fromUser or toUser)
      if (userFilter && userFilter !== "all") {
        query.$or = [{ fromUser: userFilter }, { toUser: userFilter }];
      }

      // Fetch settlements (filtered by group)
      const settlements = await db
        .collection("settlements")
        .find(query)
        .sort({ date: -1 })
        .toArray();

      // Transform data for export
      const exportData = settlements.map((settlement) => ({
        _id: settlement._id.toString(),
        fromUser: settlement.fromUser,
        toUser: settlement.toUser,
        amount: settlement.amount,
        description: settlement.description,
        date: settlement.date,
        status: settlement.status || "completed",
      }));

      // Generate CSV
      const csvContent = exportSettlementsToCSV(exportData);

      // Generate filename
      const filename = getSettlementExportFilename();

      // Return CSV response
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache",
        },
      }) as any;
    } catch {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Failed to export settlements",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ) as any;
    }
  }
);
