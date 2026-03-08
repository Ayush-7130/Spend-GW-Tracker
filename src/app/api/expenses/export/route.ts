/**
 * Expenses Export API Route
 *
 * GET: Export expenses to CSV format
 * - Respects all filter parameters (date range, category, user, search)
 * - Returns CSV file for download
 * - Requires authentication and group membership
 * - CRITICAL: Group-scoped to prevent cross-group data leakage
 */

import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import {
  exportExpensesToCSV,
  getExpenseExportFilename,
} from "@/lib/utils/export";
import { ObjectId } from "mongodb";

// Prevent caching of exported data
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET: Export expenses to CSV (group-scoped)
export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const searchParams = request.nextUrl.searchParams;

      // Get filter parameters
      const userFilter = searchParams.get("user") || "all";
      const categoryFilter = searchParams.get("category");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const search = searchParams.get("search");

      // Build query - MUST include groupId filter for data isolation
      const db = await dbManager.getDatabase();
      const query: any = {
        groupId: new ObjectId(group._id), // CRITICAL: Filter by active group
      };

      // User filter
      if (userFilter !== "all") {
        query.paidBy = userFilter;
      }

      // Category filter
      if (categoryFilter && categoryFilter !== "all") {
        query.category = categoryFilter;
      }

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

      // Search filter (escape regex special characters to prevent injection)
      if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.description = { $regex: escapedSearch, $options: "i" };
      }

      // Fetch expenses (filtered by group)
      const expenses = await db
        .collection("expenses")
        .find(query)
        .sort({ date: -1 })
        .toArray();

      // Transform data for export
      const exportData = expenses.map((expense) => ({
        _id: expense._id.toString(),
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        categoryName: expense.categoryName,
        paidBy: expense.paidBy,
        isSplit: expense.isSplit,
        splitDetails: expense.splitDetails,
      }));

      // Generate CSV
      const csvContent = exportExpensesToCSV(exportData);

      // Generate filename
      const filename = getExpenseExportFilename({
        user: userFilter !== "all" ? userFilter : undefined,
      });

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
        JSON.stringify({ success: false, error: "Failed to export expenses" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ) as any;
    }
  }
);
