import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { ObjectId } from "mongodb";

// groupIdSource: "request" tells withGroupAuth to read the groupId from the
// query string (?groupId=...) rather than from the user's server-stored
// currentGroupId. This allows the client to explicitly select which group's
// dashboard to display, and validateGroupAccess still enforces membership.

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const { searchParams } = new URL(request.url);
      const userIdParam = searchParams.get("userId"); // Optional: filter by specific user ID
      // Convert "all" to null for aggregation logic
      const userId = userIdParam === "all" || !userIdParam ? null : userIdParam;

      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // CRITICAL FIX: Ensure groupId is a string to match how expenses are stored
      // The expense API stores groupId as group._id (string), so we must use string comparison
      const groupIdFilter = group._id; // group._id is already a string from validateGroupAccess

      // Build match filter for expenses
      const expenseMatch: any = { groupId: groupIdFilter };

      // FIX M47: Use aggregation pipeline to avoid O(N) array scans
      // Build aggregation pipeline for user-specific filtering
      let totalExpenses = 0;
      let totalExpenseCount = 0;

      if (!userId) {
        // For all users, sum all expenses in this group
        const totalExpensesResult = await db
          .collection("expenses")
          .aggregate([
            { $match: expenseMatch },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        totalExpenses = totalExpensesResult[0]?.totalAmount || 0;
        totalExpenseCount = totalExpensesResult[0]?.count || 0;
      } else {
        // FIX M47: Use aggregation with $cond for user-specific calculations
        const userExpensesResult = await db
          .collection("expenses")
          .aggregate([
            { $match: expenseMatch },
            {
              $addFields: {
                userShare: {
                  $cond: [
                    // Check if user paid or is in split
                    {
                      $or: [
                        { $eq: ["$createdBy", userId] },
                        { $eq: ["$paidBy", userId] },
                        {
                          $and: [
                            { $eq: ["$isSplit", true] },
                            {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: {
                                        $ifNull: ["$splitDetails.splits", []],
                                      },
                                      as: "split",
                                      cond: { $eq: ["$$split.userId", userId] },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        {
                          $and: [
                            { $eq: ["$isSplit", true] },
                            {
                              $in: [userId, { $ifNull: ["$splitBetween", []] }],
                            },
                          ],
                        },
                      ],
                    },
                    // Calculate share based on split type
                    {
                      $cond: [
                        // Check if new split format exists
                        {
                          $and: [
                            { $eq: ["$isSplit", true] },
                            { $isArray: "$splitDetails.splits" },
                          ],
                        },
                        // Use new split format
                        {
                          $let: {
                            vars: {
                              userSplit: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$splitDetails.splits",
                                      as: "split",
                                      cond: { $eq: ["$$split.userId", userId] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: { $ifNull: ["$$userSplit.amount", 0] },
                          },
                        },
                        // Use legacy format or full amount
                        {
                          $cond: [
                            {
                              $and: [
                                { $eq: ["$isSplit", true] },
                                { $isArray: "$splitBetween" },
                              ],
                            },
                            {
                              $divide: ["$amount", { $size: "$splitBetween" }],
                            },
                            "$amount",
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            {
              $match: {
                userShare: { $gt: 0 },
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$userShare" },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        totalExpenses = userExpensesResult[0]?.totalAmount || 0;
        totalExpenseCount = userExpensesResult[0]?.count || 0;
      }

      // Get this month's expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      let thisMonthTotal = 0;
      let thisMonthCount = 0;

      const thisMonthMatch: any = {
        groupId: group._id,
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      };

      if (!userId) {
        // For all users, sum all this month's expenses
        const thisMonthResult = await db
          .collection("expenses")
          .aggregate([
            { $match: thisMonthMatch },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$amount" },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        thisMonthTotal = thisMonthResult[0]?.totalAmount || 0;
        thisMonthCount = thisMonthResult[0]?.count || 0;
      } else {
        // FIX M47: Use same aggregation pipeline for monthly calculation
        const thisMonthUserResult = await db
          .collection("expenses")
          .aggregate([
            { $match: thisMonthMatch },
            {
              $addFields: {
                userShare: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ["$createdBy", userId] },
                        { $eq: ["$paidBy", userId] },
                        {
                          $and: [
                            { $eq: ["$isSplit", true] },
                            {
                              $gt: [
                                {
                                  $size: {
                                    $filter: {
                                      input: {
                                        $ifNull: ["$splitDetails.splits", []],
                                      },
                                      as: "split",
                                      cond: { $eq: ["$$split.userId", userId] },
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        {
                          $and: [
                            { $eq: ["$isSplit", true] },
                            {
                              $in: [userId, { $ifNull: ["$splitBetween", []] }],
                            },
                          ],
                        },
                      ],
                    },
                    {
                      $cond: [
                        {
                          $and: [
                            { $eq: ["$isSplit", true] },
                            { $isArray: "$splitDetails.splits" },
                          ],
                        },
                        {
                          $let: {
                            vars: {
                              userSplit: {
                                $arrayElemAt: [
                                  {
                                    $filter: {
                                      input: "$splitDetails.splits",
                                      as: "split",
                                      cond: { $eq: ["$$split.userId", userId] },
                                    },
                                  },
                                  0,
                                ],
                              },
                            },
                            in: { $ifNull: ["$$userSplit.amount", 0] },
                          },
                        },
                        {
                          $cond: [
                            {
                              $and: [
                                { $eq: ["$isSplit", true] },
                                { $isArray: "$splitBetween" },
                              ],
                            },
                            {
                              $divide: ["$amount", { $size: "$splitBetween" }],
                            },
                            "$amount",
                          ],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
            {
              $match: {
                userShare: { $gt: 0 },
              },
            },
            {
              $group: {
                _id: null,
                totalAmount: { $sum: "$userShare" },
                count: { $sum: 1 },
              },
            },
          ])
          .toArray();

        thisMonthTotal = thisMonthUserResult[0]?.totalAmount || 0;
        thisMonthCount = thisMonthUserResult[0]?.count || 0;
      }

      // Get categories count for this group
      const categoriesCount = await db
        .collection("categories")
        .countDocuments({ groupId: group._id });

      // Calculate settlement for N users
      let settlementAmount = 0;
      let settlementMessage = "All settled up!";
      const settlementDetails: Array<{
        fromUser: string;
        toUser: string;
        amount: number;
      }> = [];

      if (userId) {
        // FIX NEW-3: Use aggregation pipeline instead of loading all data into memory
        // This prevents memory exhaustion for groups with thousands of expenses
        // Benefits:
        // - Database does computation (more efficient)
        // - Only net balances transferred over network
        // - Memory usage stays constant regardless of data size

        // Calculate balances using aggregation pipeline
        const expenseBalances = await db
          .collection("expenses")
          .aggregate([
            { $match: { groupId: group._id, isSplit: true } },
            { $unwind: "$splitDetails.splits" },
            {
              $project: {
                paidBy: { $ifNull: ["$createdBy", "$paidBy"] },
                splitUserId: "$splitDetails.splits.userId",
                splitAmount: "$splitDetails.splits.amount",
              },
            },
            {
              $match: {
                $expr: { $ne: ["$paidBy", "$splitUserId"] }, // Exclude self-owed amounts
              },
            },
            {
              $group: {
                _id: {
                  from: "$splitUserId",
                  to: "$paidBy",
                },
                amount: { $sum: "$splitAmount" },
              },
            },
          ])
          .toArray();

        // Get completed settlements aggregation
        const settlementBalances = await db
          .collection("settlements")
          .aggregate([
            { $match: { groupId: group._id, status: "completed" } },
            {
              $group: {
                _id: {
                  from: "$fromUser",
                  to: "$toUser",
                },
                amount: { $sum: "$amount" },
              },
            },
          ])
          .toArray();

        // Calculate net balances between all users
        const balances: { [key: string]: number } = {};

        // Add expense balances
        for (const balance of expenseBalances) {
          const key = `${balance._id.from}_to_${balance._id.to}`;
          balances[key] = balance.amount;
        }

        // Subtract settlement amounts
        for (const settlement of settlementBalances) {
          const key = `${settlement._id.from}_to_${settlement._id.to}`;
          balances[key] = (balances[key] || 0) - settlement.amount;
        }

        // Calculate net balance for the specific user
        let userOwes = 0;
        let userIsOwed = 0;
        const userOwesDetails: Array<{ toUser: string; amount: number }> = [];
        const userIsOwedDetails: Array<{ fromUser: string; amount: number }> =
          [];

        for (const [key, amount] of Object.entries(balances)) {
          if (Math.abs(amount) < 0.01) continue; // Skip negligible amounts

          const [fromUser, toUser] = key.split("_to_");

          if (fromUser === userId && amount > 0) {
            // Current user owes someone
            userOwes += amount;
            userOwesDetails.push({ toUser, amount });
          } else if (toUser === userId && amount > 0) {
            // Someone owes current user
            userIsOwed += amount;
            userIsOwedDetails.push({ fromUser, amount });
          }
        }

        const netBalance = userIsOwed - userOwes;

        if (Math.abs(netBalance) < 0.01) {
          settlementMessage = "All settled up!";
          settlementAmount = 0;
        } else if (netBalance > 0) {
          settlementAmount = netBalance;
          settlementMessage = `You are owed ₹${netBalance.toFixed(2)} in total`;
          // Add individual details
          for (const detail of userIsOwedDetails) {
            settlementDetails.push({
              fromUser: detail.fromUser,
              toUser: userId,
              amount: detail.amount,
            });
          }
        } else {
          settlementAmount = Math.abs(netBalance);
          settlementMessage = `You owe ₹${Math.abs(netBalance).toFixed(2)} in total`;
          // Add individual details
          for (const detail of userOwesDetails) {
            settlementDetails.push({
              fromUser: userId,
              toUser: detail.toUser,
              amount: detail.amount,
            });
          }
        }
      } else {
        // For all users view, show group settlement summary
        settlementMessage = "View individual user for settlement details";
      }

      // Get recent expenses (last 5)
      let recentExpenses;

      if (!userId) {
        // For all users, show all recent expenses in this group
        recentExpenses = await db
          .collection("expenses")
          .aggregate([
            {
              $match: { groupId: group._id },
            },
            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "name",
                as: "categoryDetails",
              },
            },
            {
              $sort: { date: -1 },
            },
            {
              $limit: 5,
            },
            {
              $project: {
                amount: 1,
                description: 1,
                date: 1,
                category: 1,
                paidBy: 1,
                createdBy: 1,
                isSplit: 1,
                splitBetween: 1,
                splitDetails: 1, // Include splitDetails for modal display
                categoryName: { $arrayElemAt: ["$categoryDetails.name", 0] },
              },
            },
          ])
          .toArray();
      } else {
        // For individual user, show expenses they're involved in
        const allRecentExpenses = await db
          .collection("expenses")
          .aggregate([
            {
              $match: { groupId: group._id },
            },
            {
              $lookup: {
                from: "categories",
                localField: "category",
                foreignField: "name",
                as: "categoryDetails",
              },
            },
            {
              $sort: { date: -1 },
            },
            {
              $project: {
                amount: 1,
                description: 1,
                date: 1,
                category: 1,
                paidBy: 1,
                createdBy: 1,
                isSplit: 1,
                splitBetween: 1,
                splitDetails: 1, // Include splitDetails for modal display
                categoryName: { $arrayElemAt: ["$categoryDetails.name", 0] },
              },
            },
          ])
          .toArray();

        // Filter expenses where user is involved (paid or part of split)
        recentExpenses = allRecentExpenses
          .filter((expense) => {
            return (
              expense.createdBy === userId ||
              expense.paidBy === userId ||
              (expense.isSplit && expense.splitBetween?.includes(userId))
            );
          })
          .slice(0, 5);
      }

      // Get users list from group members with populated names
      // FIX: Fetch actual user names from the users collection
      const memberUserIds = group.members
        .map((member: any) => {
          try {
            return new ObjectId(member.userId);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);

      const usersCollection = await db
        .collection("users")
        .find({
          _id: { $in: memberUserIds },
        })
        .toArray();

      // Deduplicate by userId — a user who left and rejoined may have multiple entries
      // in the members array (one 'left' from an older code path that pushed instead of
      // updating in-place).  We use a Map so the 'active' entry always wins.
      const memberMap = new Map<string, any>();
      for (const member of group.members) {
        const uid = member.userId?.toString?.() ?? String(member.userId);
        const existing = memberMap.get(uid);
        if (!existing) {
          memberMap.set(uid, member);
        } else {
          // Prefer active over left; if both same status, keep the most-recent (last-in-array) entry
          const existingActive =
            !existing.status || existing.status === "active";
          const currentActive = !member.status || member.status === "active";
          if (!existingActive && currentActive) {
            memberMap.set(uid, member); // replace left entry with active entry
          } else if (existingActive === currentActive) {
            memberMap.set(uid, member); // same status — keep most-recent (last in array)
          }
          // else: existing is active, current is left — keep existing
        }
      }

      // Only expose ACTIVE members. Left members should not appear in user lists,
      // expense dropdowns, or settlement calculations.
      const users = Array.from(memberMap.values())
        .filter((member: any) => !member.status || member.status === "active")
        .map((member: any) => {
          const uid = member.userId?.toString?.() ?? String(member.userId);
          const userDoc = usersCollection.find(
            (u: any) => u._id.toString() === uid
          );
          return {
            id: uid,
            name: userDoc?.name || uid,
            email: userDoc?.email || "",
            role: member.role,
            status: member.status || "active",
          };
        });

      const dashboardData = {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalExpenseCount,
        thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
        thisMonthCount,
        categoriesCount,
        settlementAmount: Math.round(settlementAmount * 100) / 100,
        settlementMessage,
        settlementDetails, // Include detailed settlement breakdown
        users,
        recentExpenses,
      };

      // Return response with no-cache headers
      const response = NextResponse.json({
        success: true,
        data: dashboardData,
      });

      // Prevent any caching
      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0"
      );
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");

      return response;
    } catch (error) {
      console.error("Dashboard API error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch dashboard data" },
        { status: 500 }
      );
    }
  },
  { groupIdSource: "request" }
);
