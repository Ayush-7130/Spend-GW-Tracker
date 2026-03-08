import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { NotificationService } from "@/lib/notifications";
import { invalidateCache } from "@/lib/cache";

// Prevent caching of authenticated data
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * DELETE /api/settlements/[id]
 * Delete a specific settlement
 * Requires group membership
 *
 * FIX C27: Direct handler wrapper with proper parameter handling
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  return withGroupAuth(
    async (_req: NextRequest, groupContext: GroupRequestContext) => {
      try {
        const { user, group } = groupContext;

        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Validate that id is a valid ObjectId
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: "Invalid settlement ID" },
            { status: 400 }
          );
        }

        // Get the settlement before deleting to send notification
        const settlement = await db
          .collection("settlements")
          .findOne({ _id: new ObjectId(id), groupId: group._id });

        if (!settlement) {
          return NextResponse.json(
            { success: false, error: "Settlement not found" },
            { status: 404 }
          );
        }

        const result = await db
          .collection("settlements")
          .deleteOne({ _id: new ObjectId(id), groupId: group._id });

        if (result.deletedCount === 0) {
          return NextResponse.json(
            { success: false, error: "Settlement not found" },
            { status: 404 }
          );
        }

        // Send notification about settlement deletion
        try {
          const notificationService = NotificationService.getInstance();
          const currentUser = await db
            .collection("users")
            .findOne({ _id: new ObjectId(user.id) });

          if (currentUser) {
            const otherUserName =
              settlement.fromUser === currentUser.name
                ? settlement.toUser
                : settlement.fromUser;
            const otherUser = await db
              .collection("users")
              .findOne({ name: otherUserName });

            if (otherUser && otherUser._id.toString() !== user.id) {
              await notificationService.sendNotification(
                otherUser._id.toString(),
                {
                  type: "settlement_deleted",
                  actorName: currentUser.name,
                  entityName:
                    settlement.description ||
                    `Settlement from ${settlement.fromUser} to ${settlement.toUser}`,
                  amount: settlement.amount,
                },
                group._id
              );
            }
          }
        } catch {
          // Continue without failing the deletion
        }

        // Invalidate settlement cache
        invalidateCache.settlement();

        return NextResponse.json({
          success: true,
          message: "Settlement deleted successfully",
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}

/**
 * GET /api/settlements/[id]
 * Get a specific settlement by ID (READ-ONLY)
 * Requires group membership
 *
 * FIX C27: Direct handler wrapper with proper parameter handling
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  return withGroupAuth(
    async (_req: NextRequest, groupContext: GroupRequestContext) => {
      try {
        const { group } = groupContext;

        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Validate that id is a valid ObjectId
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: "Invalid settlement ID" },
            { status: 400 }
          );
        }

        // Get the settlement (read-only operation)
        const settlement = await db
          .collection("settlements")
          .findOne({ _id: new ObjectId(id), groupId: group._id });

        if (!settlement) {
          return NextResponse.json(
            { success: false, error: "Settlement not found" },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: settlement,
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}

/**
 * PATCH /api/settlements/[id]
 * Update a specific settlement
 * Requires group membership
 *
 * FIX C27: Direct handler wrapper with proper parameter handling
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const { id } = resolvedParams;

  return withGroupAuth(
    async (req: NextRequest, groupContext: GroupRequestContext) => {
      try {
        const { user, group } = groupContext;

        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Validate that id is a valid ObjectId
        if (!ObjectId.isValid(id)) {
          return NextResponse.json(
            { success: false, error: "Invalid settlement ID" },
            { status: 400 }
          );
        }

        const body = await request.json();
        const { fromUser, toUser, amount, description, date, status } = body;

        // Validate required fields
        if (!fromUser || !toUser || !amount) {
          return NextResponse.json(
            {
              success: false,
              error: "Missing required fields: fromUser, toUser, amount",
            },
            { status: 400 }
          );
        }

        // Validate status enum
        if (status && !["pending", "completed", "cancelled"].includes(status)) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Invalid status. Must be: pending, completed, or cancelled",
            },
            { status: 400 }
          );
        }

        // Build update object
        const updateData: any = {
          fromUser,
          toUser,
          amount: parseFloat(amount),
          description: description || "",
          date: date ? new Date(date) : new Date(),
          status: status || "completed", // Use canonical enum
          updatedBy: user.id,
          updatedAt: new Date(),
        };

        const result = await db
          .collection("settlements")
          .updateOne(
            { _id: new ObjectId(id), groupId: group._id },
            { $set: updateData }
          );

        if (result.matchedCount === 0) {
          return NextResponse.json(
            { success: false, error: "Settlement not found" },
            { status: 404 }
          );
        }

        // Send notification about settlement update
        try {
          const notificationService = NotificationService.getInstance();
          const currentUser = await db
            .collection("users")
            .findOne({ _id: new ObjectId(user.id) });

          if (currentUser) {
            const otherUserName =
              fromUser === currentUser.name ? toUser : fromUser;
            const otherUser = await db
              .collection("users")
              .findOne({ name: otherUserName });

            if (otherUser && otherUser._id.toString() !== user.id) {
              await notificationService.sendNotification(
                otherUser._id.toString(),
                {
                  type: "settlement_updated",
                  actorName: currentUser.name,
                  entityName:
                    description || `Settlement from ${fromUser} to ${toUser}`,
                  amount: parseFloat(amount),
                },
                group._id
              );
            }
          }
        } catch {
          // Continue without failing the update
        }

        // Invalidate settlement cache
        invalidateCache.settlement();

        return NextResponse.json({
          success: true,
          message: "Settlement updated successfully",
        });
      } catch {
        return NextResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}
