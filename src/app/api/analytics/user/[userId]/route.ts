import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";

// Prevent caching of analytics data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  return withGroupAuth(
    async (req: NextRequest, context: GroupRequestContext) => {
      try {
        const { group } = context;

        if (!userId) {
          return NextResponse.json(
            { success: false, error: "User ID is required" },
            { status: 400 }
          );
        }

        // Validate that the user is a member of the current group
        const isMember = group.members.some(
          (m: any) => m.userId.toString() === userId
        );

        if (!isMember) {
          return NextResponse.json(
            { success: false, error: "User is not a member of this group" },
            { status: 403 }
          );
        }

        // Get month parameter if provided (format: YYYY-MM)
        const { searchParams } = new URL(request.url);
        const monthFilter = searchParams.get("month");

        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Build date filter for monthly view
        let dateFilter = {};
        if (monthFilter) {
          // Parse month format like "Nov '24" or "2024-11"
          let year: number, month: number;

          if (monthFilter.includes("-")) {
            // Format: YYYY-MM
            [year, month] = monthFilter.split("-").map(Number);
          } else {
            // Format: "Nov '24" - need to parse
            const monthMap: Record<string, number> = {
              Jan: 1,
              Feb: 2,
              Mar: 3,
              Apr: 4,
              May: 5,
              Jun: 6,
              Jul: 7,
              Aug: 8,
              Sep: 9,
              Oct: 10,
              Nov: 11,
              Dec: 12,
            };
            const parts = monthFilter.split(" ");
            const monthName = parts[0];
            const yearPart = parts[1].replace("'", "");
            month = monthMap[monthName];
            year = parseInt(yearPart) + (yearPart.length === 2 ? 2000 : 0);
          }

          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0, 23, 59, 59, 999);

          dateFilter = {
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          };
        }

        // Get user's category distribution (expenses paid by user + their share of split expenses)
        const paidExpenses = await db
          .collection("expenses")
          .aggregate([
            {
              $match: {
                groupId: group._id,
                paidBy: userId,
                ...dateFilter,
              },
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
              $group: {
                _id: "$category",
                amount: { $sum: "$amount" },
                count: { $sum: 1 },
                categoryName: {
                  $first: { $arrayElemAt: ["$categoryDetails.name", 0] },
                },
              },
            },
          ])
          .toArray();

        // Get user's share of split expenses
        const splitExpenses = await db
          .collection("expenses")
          .find({
            groupId: group._id,
            isSplit: true,
            ...dateFilter,
          })
          .toArray();

        // Calculate user's split amounts by category
        const splitByCategory: Record<
          string,
          { amount: number; count: number; categoryName: string }
        > = {};

        for (const expense of splitExpenses) {
          if (expense.splitDetails?.splits) {
            const userSplit = expense.splitDetails.splits.find(
              (split: any) => split.userId?.toString() === userId
            );

            if (userSplit && userSplit.amount > 0) {
              const categoryId =
                expense.category?.toString() || "uncategorized";

              if (!splitByCategory[categoryId]) {
                // Lookup category name
                const categoryDoc = await db
                  .collection("categories")
                  .findOne({ _id: expense.category });
                splitByCategory[categoryId] = {
                  amount: 0,
                  count: 0,
                  categoryName: categoryDoc?.name || "Uncategorized",
                };
              }

              splitByCategory[categoryId].amount += userSplit.amount;
              splitByCategory[categoryId].count += 1;
            }
          }
        }

        // Combine paid and split expenses by category
        const categoryMap: Record<
          string,
          { amount: number; count: number; name: string }
        > = {};

        // Add paid expenses
        for (const cat of paidExpenses) {
          const catId = cat._id?.toString() || "uncategorized";
          categoryMap[catId] = {
            amount: cat.amount,
            count: cat.count,
            name: cat.categoryName || "Uncategorized",
          };
        }

        // Add split expenses
        for (const [catId, data] of Object.entries(splitByCategory)) {
          if (categoryMap[catId]) {
            categoryMap[catId].amount += data.amount;
            categoryMap[catId].count += data.count;
          } else {
            categoryMap[catId] = {
              amount: data.amount,
              count: data.count,
              name: data.categoryName,
            };
          }
        }

        const categoryDistribution = Object.values(categoryMap).sort(
          (a, b) => b.amount - a.amount
        );

        // Get monthly spending trends (last 12 months)
        const now = new Date();
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

        // Get expenses paid by user
        const paidTrends = await db
          .collection("expenses")
          .aggregate([
            {
              $match: {
                groupId: group._id,
                paidBy: userId,
                date: {
                  $gte: oneYearAgo,
                  $lte: now,
                },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m", date: "$date" },
                },
                amount: { $sum: "$amount" },
              },
            },
            {
              $sort: { _id: 1 },
            },
          ])
          .toArray();

        // Get user's split expenses for trends
        const allSplitExpenses = await db
          .collection("expenses")
          .find({
            groupId: group._id,
            isSplit: true,
            date: {
              $gte: oneYearAgo,
              $lte: now,
            },
          })
          .toArray();

        // Calculate user's split amounts by month
        const splitTrendsByMonth: Record<string, number> = {};

        for (const expense of allSplitExpenses) {
          if (expense.splitDetails?.splits) {
            const userSplit = expense.splitDetails.splits.find(
              (split: any) => split.userId?.toString() === userId
            );

            if (userSplit && userSplit.amount > 0) {
              const monthKey = new Date(expense.date)
                .toISOString()
                .substring(0, 7); // YYYY-MM
              splitTrendsByMonth[monthKey] =
                (splitTrendsByMonth[monthKey] || 0) + userSplit.amount;
            }
          }
        }

        // Combine paid and split trends
        const trendMap: Record<string, number> = {};

        for (const trend of paidTrends) {
          trendMap[trend._id] = trend.amount;
        }

        for (const [month, amount] of Object.entries(splitTrendsByMonth)) {
          trendMap[month] = (trendMap[month] || 0) + amount;
        }

        const monthlyTrends = Object.entries(trendMap)
          .map(([month, amount]) => ({ _id: month, amount }))
          .sort((a, b) => a._id.localeCompare(b._id));

        // Get category breakdown with percentages
        const totalAmount = categoryDistribution.reduce(
          (sum, cat) => sum + cat.amount,
          0
        );
        const categoryBreakdown = categoryDistribution.map((cat) => ({
          category: cat.name,
          amount: Math.round(cat.amount * 100) / 100,
          count: cat.count,
          percentage:
            totalAmount > 0
              ? Math.round((cat.amount / totalAmount) * 10000) / 100
              : 0,
        }));

        // Get recent split expenses involving this user
        const recentSplitExpenses = await db
          .collection("expenses")
          .find({
            groupId: group._id,
            isSplit: true,
          })
          .sort({ date: -1 })
          .limit(50)
          .toArray();

        const userSplitExpenses = recentSplitExpenses
          .filter((exp) => {
            if (exp.paidBy?.toString() === userId) return true;
            if (exp.splitDetails?.splits) {
              return exp.splitDetails.splits.some(
                (s: any) => s.userId?.toString() === userId
              );
            }
            return false;
          })
          .slice(0, 10)
          .map((exp) => {
            const userSplit = exp.splitDetails?.splits?.find(
              (s: any) => s.userId?.toString() === userId
            );
            const userPaid = exp.paidBy?.toString() === userId ? exp.amount : 0;
            const userShare = userSplit?.amount || 0;

            return {
              _id: exp._id.toString(),
              description: exp.description,
              amount: Math.round(exp.amount * 100) / 100,
              date: exp.date.toISOString().split("T")[0],
              userShare: Math.round(userShare * 100) / 100,
              userPaid: Math.round(userPaid * 100) / 100,
            };
          });

        // Calculate balance information
        // Get all split expenses for balance calculation
        const allExpenses = await db
          .collection("expenses")
          .find({
            groupId: group._id,
            isSplit: true,
          })
          .toArray();

        // Get all settlements
        const settlements = await db
          .collection("settlements")
          .find({
            groupId: group._id,
          })
          .toArray();

        // Calculate balances: who owes whom
        const balances: Record<string, number> = {}; // key: "fromUserId_to_toUserId"

        // Process split expenses
        for (const expense of allExpenses) {
          if (expense.splitDetails?.splits) {
            const payerId = expense.paidBy?.toString();

            for (const split of expense.splitDetails.splits) {
              const splitUserId = split.userId?.toString();
              if (splitUserId && splitUserId !== payerId && split.amount > 0) {
                // This person owes the payer
                const key = `${splitUserId}_to_${payerId}`;
                balances[key] = (balances[key] || 0) + split.amount;
              }
            }
          }
        }

        // Subtract settlements
        for (const settlement of settlements) {
          const fromId = settlement.fromUser?.toString();
          const toId = settlement.toUser?.toString();
          if (fromId && toId) {
            const key = `${fromId}_to_${toId}`;
            balances[key] = (balances[key] || 0) - settlement.amount;
          }
        }

        // Calculate net balances for this user
        let userOwed = 0; // Others owe this user
        let userOwing = 0; // This user owes others

        for (const [key, amount] of Object.entries(balances)) {
          if (amount <= 0.01) continue; // Skip negligible balances

          const [from, , to] = key.split("_");

          if (from === userId) {
            // This user owes someone
            userOwing += amount;
          } else if (to === userId) {
            // Someone owes this user
            userOwed += amount;
          }
        }

        const netBalance = userOwed - userOwing;
        let status = "Settled";

        if (Math.abs(netBalance) > 0.01) {
          if (netBalance > 0) {
            status = `Owed ₹${Math.abs(netBalance).toFixed(2)}`;
          } else {
            status = `Owes ₹${Math.abs(netBalance).toFixed(2)}`;
          }
        }

        // Build individual balances with other group members
        const individualBalances: Record<
          string,
          { amount: number; name: string }
        > = {};

        for (const [key, amount] of Object.entries(balances)) {
          if (Math.abs(amount) <= 0.01) continue;

          const [from, , to] = key.split("_");

          if (from === userId) {
            // This user owes 'to' person
            const otherMember = group.members.find(
              (m: any) => m.userId.toString() === to
            );
            if (otherMember) {
              individualBalances[to] = {
                amount: -amount,
                name: (otherMember as any).name || "Unknown",
              };
            }
          } else if (to === userId) {
            // 'from' person owes this user
            const otherMember = group.members.find(
              (m: any) => m.userId.toString() === from
            );
            if (otherMember) {
              individualBalances[from] = {
                amount: amount,
                name: (otherMember as any).name || "Unknown",
              };
            }
          }
        }

        // Calculate total paid by user
        const totalPaidResult = await db
          .collection("expenses")
          .aggregate([
            {
              $match: {
                paidBy: userId,
                groupId: group._id,
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: "$amount" },
              },
            },
          ])
          .toArray();

        const userTotalPaid = totalPaidResult[0]?.total || 0;

        // Get user name for response
        const userMember = group.members.find(
          (m: any) => m.userId.toString() === userId
        );
        const userName = (userMember as any)?.name || "Unknown";

        const userData = {
          user: userName,
          userId: userId,
          categoryDistribution: {
            labels: categoryDistribution.map((cat) => cat.name),
            amounts: categoryDistribution.map(
              (cat) => Math.round(cat.amount * 100) / 100
            ),
          },
          monthlyTrends: {
            months: monthlyTrends.map((m) => {
              const date = new Date(m._id + "-01");
              return date.toLocaleDateString("en-IN", {
                month: "short",
                year: "2-digit",
              });
            }),
            amounts: monthlyTrends.map((m) => Math.round(m.amount * 100) / 100),
          },
          categoryBreakdown,
          splitExpenses: userSplitExpenses,
          balance: {
            totalPaid: Math.round(userTotalPaid * 100) / 100,
            totalOwed: Math.round(userOwed * 100) / 100,
            totalOwing: Math.round(userOwing * 100) / 100,
            netBalance: Math.round(netBalance * 100) / 100,
            status,
            balances: individualBalances,
          },
        };

        return NextResponse.json({
          success: true,
          data: userData,
        });
      } catch (error) {
        console.error("Analytics user error:", error);
        return NextResponse.json(
          { success: false, error: "Failed to fetch user analytics data" },
          { status: 500 }
        );
      }
    }
  )(request, undefined as any);
}
