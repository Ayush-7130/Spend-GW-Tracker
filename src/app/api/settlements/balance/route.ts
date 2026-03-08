import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { withGroupAuth, GroupRequestContext } from "@/lib/api-middleware";
import { ObjectId } from "mongodb";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/settlements/balance
 *
 * Calculate balances for all users in a group
 * Supports N users with optimal transaction calculation
 * Requires group membership
 */
export const GET = withGroupAuth(
  async (request: NextRequest, context: GroupRequestContext) => {
    try {
      const { group } = context;
      const client = await clientPromise;
      const db = client.db("spend-tracker");

      // Get all split expenses for this group
      const splitExpenses = await db
        .collection("expenses")
        .find({ groupId: group._id, isSplit: true })
        .toArray();

      // Get all completed settlements for this group
      const settlements = await db
        .collection("settlements")
        .find({ groupId: group._id, status: "completed" })
        .toArray();

      // ──────────────────────────────────────────────────────────────
      // Step 1: Compute each user's NET balance from expenses + settlements
      // Positive net = others owe this user (creditor)
      // Negative net = this user owes others (debtor)
      // ──────────────────────────────────────────────────────────────
      const netBalances: { [userId: string]: number } = {};

      const addNet = (userId: string, amount: number) => {
        netBalances[userId] = (netBalances[userId] || 0) + amount;
      };

      // Process split expenses: payer gets credit, each splitter gets debt
      // IMPORTANT: Always use String() to normalise ObjectId vs string userId values
      for (const expense of splitExpenses) {
        const paidById = String(expense.paidBy || expense.createdBy);

        if (expense.splitDetails?.splits) {
          for (const split of expense.splitDetails.splits) {
            const splitUserId = String(split.userId);
            if (splitUserId !== paidById) {
              addNet(paidById, split.amount); // creditor
              addNet(splitUserId, -split.amount); // debtor
            }
          }
        } else if (
          expense.splitBetween &&
          Array.isArray(expense.splitBetween)
        ) {
          const splitCount = expense.splitBetween.length;
          const sharePerPerson = expense.amount / splitCount;

          for (const memberId of expense.splitBetween) {
            const memberIdStr = String(memberId);
            if (memberIdStr !== paidById) {
              addNet(paidById, sharePerPerson);
              addNet(memberIdStr, -sharePerPerson);
            }
          }
        }
      }

      // Subtract completed settlements: fromUser paid toUser
      for (const settlement of settlements) {
        addNet(String(settlement.fromUser), settlement.amount); // fromUser reduced their debt
        addNet(String(settlement.toUser), -settlement.amount); // toUser reduced their credit
      }

      // ──────────────────────────────────────────────────────────────
      // Step 2: Resolve user names
      // ──────────────────────────────────────────────────────────────
      const allUserIds = Array.from(
        new Set([
          ...Object.keys(netBalances),
          ...group.members.map((m: any) => String(m.userId)),
        ])
      ).filter(Boolean);

      const objectIds = allUserIds
        .map((id) => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        })
        .filter((id): id is ObjectId => id !== null);

      const users = await db
        .collection("users")
        .find({ _id: { $in: objectIds } })
        .toArray();

      const userNameMap = new Map(
        users.map((u) => [u._id?.toString(), u.name])
      );

      // ──────────────────────────────────────────────────────────────
      // Step 3: Debt simplification — minimize number of transactions
      //
      // With N users only at most N-1 transactions are needed.
      // Algorithm: greedily match the largest creditor with the largest
      // debtor until all balances are zero.
      // ──────────────────────────────────────────────────────────────
      const creditors: Array<{ userId: string; amount: number }> = [];
      const debtors: Array<{ userId: string; amount: number }> = [];

      for (const [userId, net] of Object.entries(netBalances)) {
        const rounded = Math.round(net * 100) / 100;
        if (rounded > 0.01) {
          creditors.push({ userId, amount: rounded });
        } else if (rounded < -0.01) {
          debtors.push({ userId, amount: -rounded }); // store as positive
        }
      }

      // Sort descending by amount for greedy matching
      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      const activeBalances: Array<{
        fromUserId: string;
        fromUserName: string;
        toUserId: string;
        toUserName: string;
        amount: number;
        status: "owes" | "settled";
      }> = [];

      // Build user balance detail map
      const userBalanceMap = new Map<
        string,
        {
          userId: string;
          userName: string;
          netBalance: number;
          owes: Array<{ userId: string; userName: string; amount: number }>;
          owedBy: Array<{ userId: string; userName: string; amount: number }>;
        }
      >();

      // Initialize for all group members
      for (const member of group.members) {
        const uid = String(member.userId);
        userBalanceMap.set(uid, {
          userId: uid,
          userName: userNameMap.get(uid) || uid,
          netBalance: Math.round((netBalances[uid] || 0) * 100) / 100,
          owes: [],
          owedBy: [],
        });
      }

      // Greedy debt simplification
      let ci = 0,
        di = 0;
      while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];
        const transfer = Math.min(creditor.amount, debtor.amount);

        if (transfer < 0.01) {
          ci++;
          di++;
          continue;
        }

        const fromUserId = debtor.userId;
        const toUserId = creditor.userId;
        const fromUserName = userNameMap.get(fromUserId) || fromUserId;
        const toUserName = userNameMap.get(toUserId) || toUserId;
        const roundedTransfer = Math.round(transfer * 100) / 100;

        activeBalances.push({
          fromUserId,
          fromUserName,
          toUserId,
          toUserName,
          amount: roundedTransfer,
          status: "owes",
        });

        // Update per-user detail
        const fromBal = userBalanceMap.get(fromUserId);
        const toBal = userBalanceMap.get(toUserId);
        if (fromBal) {
          fromBal.owes.push({
            userId: toUserId,
            userName: toUserName,
            amount: roundedTransfer,
          });
        }
        if (toBal) {
          toBal.owedBy.push({
            userId: fromUserId,
            userName: fromUserName,
            amount: roundedTransfer,
          });
        }

        creditor.amount -= transfer;
        debtor.amount -= transfer;
        if (creditor.amount < 0.01) ci++;
        if (debtor.amount < 0.01) di++;
      }

      // Calculate summary statistics
      const totalOwed = activeBalances.reduce((sum, b) => sum + b.amount, 0);
      const totalSettled = settlements.reduce(
        (sum: number, s: any) => sum + (s.amount || 0),
        0
      );

      // Convert user balance map to array
      const userBalances = Array.from(userBalanceMap.values()).map((ub) => ({
        ...ub,
        netBalance: Math.round(ub.netBalance * 100) / 100,
      }));

      const response = NextResponse.json({
        success: true,
        data: {
          balances: activeBalances,
          userBalances, // Individual user balance details
          summary: {
            groupId: group._id,
            totalOwed: Math.round(totalOwed * 100) / 100,
            totalSettled: Math.round(totalSettled * 100) / 100,
            totalTransactions: settlements.length,
            activeBalances: activeBalances.length,
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
    } catch (error) {
      console.error("Balance calculation error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to calculate balances" },
        { status: 500 }
      );
    }
  }
);
