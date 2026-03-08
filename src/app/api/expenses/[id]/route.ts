import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { notificationService } from "@/lib/notifications";
import { dbManager } from "@/lib/database";
import { invalidateCache } from "@/lib/cache";
import type { GroupMember } from "@/lib/database";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withGroupAuth(
    async (req: NextRequest, context: GroupRequestContext) => {
      try {
        const { user, group } = context;
        const body = await req.json(); // FIX: Use req instead of request
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
        if (!amount || !description || !date || !category || !paidBy) {
          return NextResponse.json(
            { success: false, error: "Required fields missing" },
            { status: 400 }
          );
        }

        // Validate split logic - supports dynamic group members
        if (isSplit && splitDetails) {
          if (!splitDetails.splits || !Array.isArray(splitDetails.splits)) {
            return NextResponse.json(
              {
                success: false,
                error: "Split details must include an array of splits",
              },
              { status: 400 }
            );
          }
          const totalSplit = splitDetails.splits.reduce(
            (sum: number, s: any) => sum + (s.amount || 0),
            0
          );
          if (Math.abs(totalSplit - amount) > 0.01) {
            return NextResponse.json(
              {
                success: false,
                error: "Split amounts must equal total amount",
              },
              { status: 400 }
            );
          }
          // Validate each split has required fields
          for (const split of splitDetails.splits) {
            if (
              !split.userId ||
              !split.userName ||
              typeof split.amount !== "number"
            ) {
              return NextResponse.json(
                {
                  success: false,
                  error: "Each split must have userId, userName, and amount",
                },
                { status: 400 }
              );
            }
          }
        }

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: "Invalid expense ID format" },
            { status: 400 }
          );
        }

        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Get existing expense for audit trail and ownership check
        const existingExpense = await db
          .collection("expenses")
          .findOne({ _id: new ObjectId(id), groupId: group._id });

        if (!existingExpense) {
          return NextResponse.json(
            { success: false, error: "Expense not found" },
            { status: 404 }
          );
        }

        // Check ownership (user can only edit their own expenses or group admin can edit any)
        const isGroupAdmin = group.members.some(
          (m: GroupMember) => m.userId === user.id && m.role === "admin"
        );
        if (!isGroupAdmin && existingExpense.createdBy !== user.id) {
          return NextResponse.json(
            { success: false, error: "You can only edit your own expenses" },
            { status: 403 }
          );
        }

        const updateData = {
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
          updatedAt: new Date(),
        };

        // FIX M64: Use findOneAndUpdate to avoid second lookup
        const result = await db
          .collection("expenses")
          .findOneAndUpdate(
            { _id: new ObjectId(id), groupId: group._id },
            { $set: updateData },
            { returnDocument: "after" }
          );

        if (!result) {
          return NextResponse.json(
            { success: false, error: "Expense not found" },
            { status: 404 }
          );
        }

        // Log activity with changes

        // Invalidate expense list cache
        invalidateCache.expense();

        // Send notification to other group members (group-scoped)
        const currentUser = await dbManager.getUserById(user.id);
        if (currentUser) {
          await notificationService.broadcastNotification(
            user.id,
            {
              type: "expense_updated",
              actorName: currentUser.name,
              entityName: description,
              entityId: id,
              amount: parseFloat(amount),
              isSplit: isSplit,
            },
            group._id
          ); // FIX: Add groupId parameter
        }

        return NextResponse.json({
          success: true,
          message: "Expense updated successfully",
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to update expense" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return withGroupAuth(
    async (req: NextRequest, context: GroupRequestContext) => {
      try {
        const { user, group } = context;
        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Validate ObjectId
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: "Invalid expense ID format" },
            { status: 400 }
          );
        }

        // FIX M64: Get existing expense and check ownership before deleting
        const existingExpense = await db
          .collection("expenses")
          .findOne({ _id: new ObjectId(id), groupId: group._id });

        if (!existingExpense) {
          return NextResponse.json(
            { success: false, error: "Expense not found" },
            { status: 404 }
          );
        }

        // Check ownership (user can only delete their own expenses or group admin can delete any)
        const isGroupAdmin = group.members.some(
          (m: GroupMember) => m.userId === user.id && m.role === "admin"
        );
        if (!isGroupAdmin && existingExpense.createdBy !== user.id) {
          return NextResponse.json(
            { success: false, error: "You can only delete your own expenses" },
            { status: 403 }
          );
        }

        // Now delete the expense (already validated ownership)
        const result = await db.collection("expenses").deleteOne({
          _id: new ObjectId(id),
          groupId: group._id,
        });

        if (result.deletedCount === 0) {
          return NextResponse.json(
            { success: false, error: "Expense not found" },
            { status: 404 }
          );
        }

        // Invalidate expense list cache
        invalidateCache.expense();

        // Log activity

        // Send notification to other group members (group-scoped)
        const currentUser = await dbManager.getUserById(user.id);
        if (currentUser) {
          await notificationService.broadcastNotification(
            user.id,
            {
              type: "expense_deleted",
              actorName: currentUser.name,
              entityName: existingExpense.description || "Expense",
            },
            group._id
          ); // FIX: Add groupId parameter
        }

        return NextResponse.json({
          success: true,
          message: "Expense deleted successfully",
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Failed to delete expense" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}
