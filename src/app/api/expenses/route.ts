import { NextRequest, NextResponse } from "next/server";
import {
  withGroupAuth,
  successResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-middleware";
import clientPromise from "@/lib/mongodb";
import { notificationService } from "@/lib/notifications";
import { dbManager } from "@/lib/database";
import { invalidateCache } from "@/lib/cache";
import logger from "@/lib/logger";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/expenses
 *
 * Get expenses for the current group with pagination and filters
 * Requires group membership
 */
export const GET = withGroupAuth(async (request: NextRequest, context) => {
  try {
    const { group } = context;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const paidBy = searchParams.get("paidBy");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Build filter object - CRITICAL: Always filter by groupId
    interface FilterType {
      groupId: string;
      category?: string;
      paidBy?: string;
      description?: { $regex: string; $options: string };
      date?: { $gte?: Date; $lte?: Date };
    }
    const filter: FilterType = {
      groupId: group._id, // REQUIRED: Group scoping for data isolation
    };

    if (category) filter.category = category;
    if (paidBy) filter.paidBy = paidBy;
    if (search) {
      // FIX M5: Escape regex metacharacters to prevent injection
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.description = { $regex: escapedSearch, $options: "i" };
    }
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    // Optimized aggregation pipeline with projection
    const [expenses, total] = await Promise.all([
      db
        .collection("expenses")
        .aggregate([
          { $match: filter },
          // Project only necessary fields to reduce memory usage
          {
            $project: {
              _id: 1,
              groupId: 1,
              amount: 1,
              description: 1,
              date: 1,
              category: 1,
              subcategory: 1,
              paidBy: 1,
              isSplit: 1,
              splitDetails: 1,
              splitBetween: 1, // FIX: Include splitBetween field for UI compatibility
              createdBy: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "name",
              as: "categoryDetails",
              // Only fetch category name, not the entire document
              pipeline: [{ $project: { name: 1, _id: 1 } }],
            },
          },
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
        ])
        .toArray(),
      db.collection("expenses").countDocuments(filter),
    ]);

    // Ensure _id is converted to string
    const serializedExpenses = expenses.map((exp) => ({
      ...exp,
      _id: exp._id.toString(),
    }));

    const responseData = {
      expenses: serializedExpenses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };

    // Return with no-cache headers to prevent stale data
    const response = NextResponse.json({
      success: true,
      data: responseData,
    });

    // Prevent any caching
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error: unknown) {
    logger.error("Fetch expenses error", error, {
      context: "/api/expenses GET",
      userId: (error as any).userId,
    });
    return errorResponse("Failed to fetch expenses", 500);
  }
});

/**
 * POST /api/expenses
 *
 * Create a new expense in the current group
 * Requires group membership
 */
export const POST = withGroupAuth(async (request: NextRequest, context) => {
  try {
    const { user, group } = context;

    const body = await request.json();
    const {
      amount,
      description,
      date,
      category,
      subcategory,
      paidBy,
      isSplit = false,
      splitDetails = null,
    } = body;

    // Validation
    const errors: Record<string, string> = {};

    // FIX NEW-4: Validate amount is a valid number (not NaN or non-numeric)
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.amount = "Amount must be a valid number greater than 0";
    }
    if (!description) {
      errors.description = "Description is required";
    }
    if (!date) {
      errors.date = "Date is required";
    }
    if (!category) {
      errors.category = "Category is required";
    }
    if (!paidBy) {
      errors.paidBy = "Paid by is required";
    }

    // Validate split logic - supports dynamic group members
    if (isSplit && splitDetails) {
      if (!splitDetails.splits || !Array.isArray(splitDetails.splits)) {
        errors.split = "Split details must include an array of splits";
      } else {
        const totalSplit = splitDetails.splits.reduce(
          (sum: number, s: any) => sum + (s.amount || 0),
          0
        );
        if (Math.abs(totalSplit - amount) > 0.01) {
          errors.split = "Split amounts must equal total amount";
        }
        // Validate each split has required fields
        for (const split of splitDetails.splits) {
          if (
            !split.userId ||
            !split.userName ||
            typeof split.amount !== "number"
          ) {
            errors.split = "Each split must have userId, userName, and amount";
            break;
          }
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      return validationErrorResponse(errors);
    }

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    const expense = {
      groupId: group._id, // REQUIRED: Group scoping
      amount: parseFloat(amount),
      description,
      date: new Date(date),
      category,
      subcategory: subcategory || "",
      paidBy,
      isSplit,
      splitDetails: isSplit ? splitDetails : null,
      splitBetween:
        isSplit && splitDetails?.splits
          ? splitDetails.splits.map((s: any) => s.userId)
          : [], // FIX: Extract splitBetween array from splitDetails for UI compatibility
      createdBy: user.id, // Track who created the expense
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("expenses").insertOne(expense);
    const createdExpense = { ...expense, _id: result.insertedId.toString() };

    // Invalidate related caches
    invalidateCache.expense();

    // Send notification to other group members (group-scoped)
    const currentUser = await dbManager.getUserById(user.id);
    if (currentUser) {
      await notificationService.broadcastNotification(
        user.id,
        {
          type: "expense_added",
          actorName: currentUser.name,
          entityName: description,
          entityId: result.insertedId.toString(),
          amount: parseFloat(amount),
          isSplit: isSplit,
        },
        group._id
      ); // FIX: Add groupId parameter for group-scoped notifications
    }

    return successResponse(
      {
        expense: createdExpense,
      },
      "Expense created successfully",
      201
    );
  } catch (error: unknown) {
    logger.error("Create expense error", error, {
      context: "/api/expenses POST",
      userId: (error as any).userId,
    });
    return errorResponse("Failed to create expense", 500);
  }
});
