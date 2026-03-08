import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { NotificationService } from "@/lib/notifications";
import clientPromise from "@/lib/mongodb";
import { invalidateCache } from "@/lib/cache";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // Parse pagination params
      const url = new URL(request.url);
      const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
      const limit = Math.min(
        100,
        Math.max(1, parseInt(url.searchParams.get("limit") || "50"))
      );
      const skip = (page - 1) * limit;

      const filter = { groupId: group._id };

      // Run count and paginated query in parallel
      const [settlements, total] = await Promise.all([
        db
          .collection("settlements")
          .find(filter)
          .sort({ date: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("settlements").countDocuments(filter),
      ]);

      // Collect unique user IDs from settlements to resolve names
      const userIds = new Set<string>();
      settlements.forEach((s: any) => {
        if (s.fromUser) userIds.add(s.fromUser);
        if (s.toUser) userIds.add(s.toUser);
      });

      // Batch-fetch user names
      const userObjectIds = [...userIds]
        .filter((id) => ObjectId.isValid(id))
        .map((id) => new ObjectId(id));
      const usersFromDb =
        userObjectIds.length > 0
          ? await db
              .collection("users")
              .find(
                { _id: { $in: userObjectIds } },
                { projection: { _id: 1, name: 1 } }
              )
              .toArray()
          : [];
      const userNameMap = new Map<string, string>();
      usersFromDb.forEach((u: any) =>
        userNameMap.set(u._id.toString(), u.name)
      );

      // FIX M51: Map to explicit DTO to avoid ObjectId/Date serialization issues
      const serializedSettlements = settlements.map((settlement: any) => ({
        _id: settlement._id.toString(),
        expenseId: settlement.expenseId?.toString() || null,
        groupId: settlement.groupId.toString(),
        fromUser: settlement.fromUser,
        toUser: settlement.toUser,
        fromUserName:
          userNameMap.get(settlement.fromUser) || settlement.fromUser,
        toUserName: userNameMap.get(settlement.toUser) || settlement.toUser,
        amount: settlement.amount,
        description: settlement.description || "",
        date:
          settlement.date instanceof Date
            ? settlement.date.toISOString()
            : settlement.date,
        status: settlement.status,
        createdBy: settlement.createdBy,
        createdAt:
          settlement.createdAt instanceof Date
            ? settlement.createdAt.toISOString()
            : settlement.createdAt,
        updatedAt:
          settlement.updatedAt instanceof Date
            ? settlement.updatedAt.toISOString()
            : settlement.updatedAt,
        settledAt:
          settlement.settledAt instanceof Date
            ? settlement.settledAt.toISOString()
            : settlement.settledAt,
      }));

      const response = NextResponse.json({
        success: true,
        data: {
          settlements: serializedSettlements,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });

      // Prevent any caching
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");

      return response;
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to fetch settlements" },
        { status: 500 }
      );
    }
  }
);

export const POST = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { user, group } = context;

      const body = await request.json();
      const { expenseId, fromUser, toUser, amount, description, date, status } =
        body;

      // Validate required fields (expenseId is optional for manual settlements)
      if (!fromUser || !toUser || !amount) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields: fromUser, toUser, amount",
          },
          { status: 400 }
        );
      }

      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // Get user details from database
      const currentUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(user.id) });
      if (!currentUser) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Create new settlement record
      const settlement: any = {
        fromUser,
        toUser,
        amount: parseFloat(amount),
        description: description || "",
        date: date ? new Date(date) : new Date(),
        status: status || "completed", // Default to 'completed' (canonical enum: pending|completed|cancelled)
        groupId: group._id,
        createdBy: user.id,
        createdAt: new Date(),
      };

      // Only add expenseId if it's provided (for settlements tied to specific expenses)
      if (expenseId) {
        settlement.expenseId = new ObjectId(expenseId);
      }

      const result = await db.collection("settlements").insertOne(settlement);

      // Send notification to the other user involved in the settlement
      try {
        const notificationService = NotificationService.getInstance();

        // FIX M52: Assume fromUser/toUser are user IDs (not names)
        // Determine the other user ID (the one who is not the current user)
        const otherUserId = fromUser === user.id ? toUser : fromUser;

        const settlementDescription =
          description || `Settlement: ₹${parseFloat(amount).toFixed(2)}`;

        if (otherUserId !== user.id) {
          await notificationService.sendNotification(
            otherUserId,
            {
              type: "settlement_added",
              actorName: currentUser.name,
              entityName: settlementDescription,
              amount: parseFloat(amount),
            },
            group._id
          );
        }
      } catch {
        // Continue without failing the settlement creation
      }

      // Invalidate settlement cache
      invalidateCache.settlement();

      return NextResponse.json({
        success: true,
        data: {
          settlementId: result.insertedId,
          settlement: { ...settlement, _id: result.insertedId },
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to create settlement" },
        { status: 500 }
      );
    }
  }
);
