import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";

// Prevent caching of analytics data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const { searchParams } = new URL(request.url);
      const period = searchParams.get("period") || "month";
      const customStart = searchParams.get("startDate");
      const customEnd = searchParams.get("endDate");

      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // Generate complete date range helper function
      const generateDateRange = (start: Date, end: Date) => {
        const dates = [];
        const current = new Date(start);
        while (current <= end) {
          dates.push(current.toISOString().split("T")[0]);
          current.setDate(current.getDate() + 1);
        }
        return dates;
      };

      // Calculate date range based on period
      let startDate: Date, endDate: Date;
      const now = new Date();

      switch (period) {
        case "week":
          // Start 6 days ago, end today (inclusive of current date)
          startDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate() - 6
          );
          // FIX M43/M69: Set end-of-day
          endDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999
          );
          break;
        case "quarter":
          const quarterStart = Math.floor(now.getMonth() / 3) * 3;
          startDate = new Date(now.getFullYear(), quarterStart, 1);
          // FIX M43/M69: Set end-of-day for quarter end
          endDate = new Date(
            now.getFullYear(),
            quarterStart + 3,
            0,
            23,
            59,
            59,
            999
          );
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          // FIX M43/M69: Set end-of-day for year end
          endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
          break;
        case "custom":
          if (customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
            // FIX M43/M69: Set end date to end of day with milliseconds
            endDate.setHours(23, 59, 59, 999);
          } else {
            // Default to current month if custom dates not provided
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            // FIX M43/M69: Set end-of-day for month end
            endDate = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59,
              999
            );
          }
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          // FIX M43/M69: Set end-of-day for month end
          endDate = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );
          break;
      }

      // Get daily spending trends
      const dailyTrends = await db
        .collection("expenses")
        .aggregate([
          {
            $match: {
              groupId: group._id,
              date: {
                $gte: startDate,
                $lte: endDate,
              },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: "%Y-%m-%d", date: "$date" },
              },
              totalAmount: { $sum: "$amount" },
            },
          },
          {
            $sort: { _id: 1 },
          },
        ])
        .toArray();

      // Get category-wise data based on selected period for stacked chart
      const categoryData = await db
        .collection("expenses")
        .aggregate([
          {
            $match: {
              groupId: group._id,
              date: {
                $gte: startDate,
                $lte: endDate,
              },
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
              _id: {
                period: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: [period, "week"] },
                        then: {
                          $dateToString: { format: "%Y-%m-%d", date: "$date" },
                        },
                      },
                      {
                        case: { $eq: [period, "month"] },
                        then: {
                          $dateToString: { format: "%Y-%m-%d", date: "$date" },
                        },
                      },
                      {
                        case: { $eq: [period, "quarter"] },
                        then: {
                          $dateToString: { format: "%Y-%m", date: "$date" },
                        },
                      },
                      {
                        case: { $eq: [period, "year"] },
                        then: {
                          $dateToString: { format: "%Y-%m", date: "$date" },
                        },
                      },
                    ],
                    default: {
                      $dateToString: { format: "%Y-%m-%d", date: "$date" },
                    },
                  },
                },
                category: {
                  $ifNull: [
                    { $arrayElemAt: ["$categoryDetails.name", 0] },
                    "Uncategorized",
                  ],
                },
              },
              amount: { $sum: "$amount" },
            },
          },
          {
            $sort: { "_id.period": 1 },
          },
        ])
        .toArray();

      // Process category data for chart
      const periodsSet = new Set<string>();
      const categoriesSet = new Set<string>();
      const categoryAmounts: { [key: string]: { [key: string]: number } } = {};

      interface CategoryDataItem {
        _id: { period: string; category: string };
        amount: number;
      }

      categoryData.forEach((item) => {
        const categoryItem = item as CategoryDataItem;
        const periodKey = categoryItem._id.period;
        const category = categoryItem._id.category;

        periodsSet.add(periodKey);
        categoriesSet.add(category);

        if (!categoryAmounts[category]) {
          categoryAmounts[category] = {};
        }
        categoryAmounts[category][periodKey] = categoryItem.amount;
      });

      // Generate complete period range for category chart (same as daily trends)
      let completePeriods: string[];
      if (period === "week" || period === "month" || period === "custom") {
        // For daily granularity, use the same date range as daily trends
        completePeriods = generateDateRange(startDate, endDate);
      } else if (period === "quarter" || period === "year") {
        // For monthly granularity, generate month range
        completePeriods = [];
        const current = new Date(
          startDate.getFullYear(),
          startDate.getMonth(),
          1
        );
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        while (current <= end) {
          completePeriods.push(
            current.toISOString().split("T")[0].substring(0, 7)
          ); // YYYY-MM format
          current.setMonth(current.getMonth() + 1);
        }
      } else {
        completePeriods = Array.from(periodsSet).sort();
      }

      const categories = Array.from(categoriesSet);
      const chartData = categories.map((category) =>
        completePeriods.map(
          (periodKey) => categoryAmounts[category]?.[periodKey] || 0
        )
      );

      // Format period labels based on period type
      const formatPeriodLabel = (periodKey: string) => {
        if (period === "week" || period === "month" || period === "custom") {
          const date = new Date(periodKey);
          return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          });
        } else if (period === "quarter" || period === "year") {
          const date = new Date(periodKey + "-01");
          return date.toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit",
          });
        }
        return periodKey;
      };

      // Get period totals for users with proper split logic
      const allExpenses = await db
        .collection("expenses")
        .find({
          groupId: group._id, // CRITICAL: Group filter for data isolation
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        })
        .toArray();

      // Calculate totals per user - supports dynamic group members
      const userTotals: Record<string, { personal: number; split: number }> =
        {};

      // Initialize totals for all group members
      for (const member of group.members) {
        const memberName = (member as any).name;
        if (memberName) {
          userTotals[memberName] = { personal: 0, split: 0 };
        }
      }

      for (const expense of allExpenses) {
        if (expense.isSplit && expense.splitDetails?.splits) {
          // For split expenses, use individual split amounts
          for (const split of expense.splitDetails.splits) {
            if (userTotals[split.userName]) {
              userTotals[split.userName].split += split.amount || 0;
            }
          }
        } else if (!expense.isSplit) {
          // For non-split expenses, add to personal based on who paid
          if (userTotals[expense.paidBy]) {
            userTotals[expense.paidBy].personal += expense.amount;
          }
        }
      }

      // Calculate total spent by each user
      const userSpending = Object.entries(userTotals).map(([name, totals]) => ({
        name,
        personal: totals.personal,
        split: totals.split,
        total: totals.personal + totals.split,
      }));

      const totalSplit = userSpending.reduce((sum, u) => sum + u.split, 0);

      // Calculate settlement using the same logic as settlements balance API
      // Get all split expenses (filter by date range and group)
      const splitExpenses = await db
        .collection("expenses")
        .find({
          groupId: group._id, // CRITICAL: Group filter for data isolation
          isSplit: true,
          date: {
            $gte: startDate.toISOString().split("T")[0],
            $lte: endDate.toISOString().split("T")[0],
          },
        })
        .toArray();

      // Get all settlements (filter by date range and group)
      const settlements = await db
        .collection("settlements")
        .find({
          groupId: group._id, // CRITICAL: Group filter for data isolation
          date: {
            $gte: startDate.toISOString().split("T")[0],
            $lte: endDate.toISOString().split("T")[0],
          },
        })
        .toArray();

      // Calculate balances for each user pair
      const balances: { [key: string]: number } = {};

      // Process split expenses based on existing expense structure
      for (const expense of splitExpenses) {
        if (expense.splitDetails?.splits) {
          // NEW FORMAT: Use dynamic splits array
          const payerId = expense.paidBy?.toString();
          const payer = group.members.find(
            (m: any) =>
              m.userId?.toString() === payerId || m.name === expense.paidBy
          );
          const payerName = (payer as any)?.name || expense.paidBy;

          expense.splitDetails.splits.forEach((split: any) => {
            if (split.userName !== payerName && split.amount > 0) {
              const key = `${split.userName}_to_${payerName}`;
              balances[key] = (balances[key] || 0) + split.amount;
            }
          });
        } else {
          // Fallback: if no splitDetails, assume equal split among all members
          const payerId = expense.paidBy?.toString();
          const payer = group.members.find(
            (m: any) =>
              m.userId?.toString() === payerId || m.name === expense.paidBy
          );
          const payerName = (payer as any)?.name || expense.paidBy;
          const amountPerPerson = expense.amount / group.members.length;

          for (const member of group.members) {
            const memberName = (member as any).name;
            if (memberName && memberName !== payerName) {
              const key = `${memberName}_to_${payerName}`;
              balances[key] = (balances[key] || 0) + amountPerPerson;
            }
          }
        }
      }

      // Subtract settlements from balances
      for (const settlement of settlements) {
        const key = `${settlement.fromUser}_to_${settlement.toUser}`;
        balances[key] = (balances[key] || 0) - settlement.amount;
      }

      // Calculate net settlement requirements (simplified for N members)
      // For now, just show the largest net debt
      let settlementRequired = 0;
      let settlementMessage = "All settled up!";

      const balanceEntries = Object.entries(balances)
        .filter(([, amount]) => Math.abs(amount) > 0.01)
        .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

      if (balanceEntries.length > 0) {
        const [key, amount] = balanceEntries[0];
        const [from, , to] = key.split("_");
        settlementRequired = Math.round(Math.abs(amount) * 100) / 100;
        settlementMessage = `${from} owes ${to} ₹${settlementRequired.toFixed(2)}`;
      }

      const dateRange = generateDateRange(startDate, endDate);
      const dailyAmountsMap = new Map(
        dailyTrends.map((d) => [d._id, d.totalAmount])
      );

      const completeDaily = {
        dates: dateRange,
        amounts: dateRange.map(
          (date) => Math.round((dailyAmountsMap.get(date) || 0) * 100) / 100
        ),
      };

      const timelineData = {
        dailyTrends: completeDaily,
        categoryMonthly: {
          categories,
          periods: completePeriods.map(formatPeriodLabel),
          data: chartData.map((categoryData) =>
            categoryData.map((amount) => Math.round(amount * 100) / 100)
          ),
        },
        periodTotals: {
          users: userSpending.map((u) => ({
            name: u.name,
            personal: Math.round(u.personal * 100) / 100,
            split: Math.round(u.split * 100) / 100,
            total: Math.round(u.total * 100) / 100,
          })),
          splitTotal: Math.round(totalSplit * 100) / 100,
          settlementRequired: settlementRequired,
          settlementMessage,
        },
      };

      return NextResponse.json({
        success: true,
        data: timelineData,
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to fetch timeline data" },
        { status: 500 }
      );
    }
  }
);
