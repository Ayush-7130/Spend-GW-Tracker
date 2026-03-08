import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { ObjectId } from "mongodb";

// Prevent caching of analytics data
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // Batch-fetch user names for all group members
      const memberUserIds = group.members.map((m: any) => m.userId.toString());
      const memberObjectIds = memberUserIds
        .map((id: string) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);
      const users = await db
        .collection("users")
        .find({ _id: { $in: memberObjectIds } }, { projection: { name: 1 } })
        .toArray();
      const userNameMap = new Map<string, string>();
      for (const user of users) {
        userNameMap.set(user._id.toString(), user.name || user._id.toString());
      }

      // Get total expenses by person in this group
      const expensesByPerson = await db
        .collection("expenses")
        .aggregate([
          {
            $match: { groupId: group._id },
          },
          {
            $group: {
              _id: "$paidBy",
              totalPaid: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      // Get split expenses and calculate settlement
      const splitExpenses = await db
        .collection("expenses")
        .find({
          groupId: group._id,
          isSplit: true,
        })
        .toArray();

      // Initialize dynamic per-member tracking
      const memberStats: Record<
        string,
        { personal: number; splitPaid: number; splitOwes: number }
      > = {};

      // Initialize for all group members
      for (const member of group.members) {
        const memberId = member.userId.toString();
        memberStats[memberId] = { personal: 0, splitPaid: 0, splitOwes: 0 };
      }

      let totalSplit = 0;

      // Calculate personal expenses from aggregation
      expensesByPerson.forEach((person) => {
        const userId = person._id?.toString();
        if (userId && memberStats[userId]) {
          memberStats[userId].personal = person.totalPaid;
        }
      });

      // Calculate split totals and individual shares
      splitExpenses.forEach((expense: any) => {
        totalSplit += expense.amount;

        const payerId = expense.paidBy?.toString();
        if (payerId && memberStats[payerId]) {
          memberStats[payerId].splitPaid += expense.amount;
        }

        // Handle new dynamic splits format
        if (expense.splitDetails?.splits) {
          expense.splitDetails.splits.forEach((split: any) => {
            const userId = split.userId?.toString();
            if (userId && memberStats[userId]) {
              memberStats[userId].splitOwes += split.amount || 0;
            }
          });
        }
      });

      // Subtract split expenses from personal totals and calculate net balances
      const netBalances: Record<string, number> = {};
      for (const [userId, stats] of Object.entries(memberStats)) {
        stats.personal -= stats.splitPaid;
        netBalances[userId] = stats.splitPaid - stats.splitOwes;
      }

      // Calculate settlement status (simplified for N members - show largest debt)
      const balanceEntries = Object.entries(netBalances).map(
        ([userId, balance]) => ({
          userId,
          balance,
          member: group.members.find(
            (m: any) => m.userId.toString() === userId
          ),
        })
      );

      balanceEntries.sort((a, b) => b.balance - a.balance);

      let settlementStatus = "Settled";
      const maxCreditor = balanceEntries[0];
      const maxDebtor = balanceEntries[balanceEntries.length - 1];

      if (
        maxCreditor &&
        maxDebtor &&
        Math.abs(maxCreditor.balance) > 0.01 &&
        Math.abs(maxDebtor.balance) > 0.01
      ) {
        const creditorName = userNameMap.get(maxCreditor.userId) || "Unknown";
        const debtorName = userNameMap.get(maxDebtor.userId) || "Unknown";
        const amount = Math.abs(maxDebtor.balance);
        settlementStatus = `${debtorName} owes ${creditorName} ₹${amount.toFixed(2)}`;
      }

      const settlement = {
        status: settlementStatus,
        balances: netBalances,
      };

      // Get this month's expenses (group-scoped)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // FIX M3: Set end-of-day to include all expenses on last day of month
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999
      );

      const thisMonthExpenses = await db
        .collection("expenses")
        .aggregate([
          {
            $match: {
              groupId: group._id, // CRITICAL: Group filter for data isolation
              date: {
                $gte: startOfMonth,
                $lte: endOfMonth,
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      const thisMonthTotal = thisMonthExpenses[0]?.total || 0;
      const thisMonthCount = thisMonthExpenses[0]?.count || 0;

      // Build dynamic member summaries
      const memberSummaries: Record<
        string,
        {
          personal: number;
          splitPaid: number;
          splitOwes: number;
          netBalance: number;
        }
      > = {};
      for (const [userId, stats] of Object.entries(memberStats)) {
        const memberKey = userNameMap.get(userId) || userId;
        memberSummaries[memberKey] = {
          personal: Math.round(stats.personal * 100) / 100,
          splitPaid: Math.round(stats.splitPaid * 100) / 100,
          splitOwes: Math.round(stats.splitOwes * 100) / 100,
          netBalance: Math.round(netBalances[userId] * 100) / 100,
        };
      }

      return NextResponse.json({
        success: true,
        data: {
          members: memberSummaries,
          totalSplit: Math.round(totalSplit * 100) / 100,
          thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
          thisMonthCount,
          settlement,
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to fetch summary" },
        { status: 500 }
      );
    }
  }
);
