/**
 * Client-side balance simplification utilities.
 *
 * Even though the balance API performs greedy debt simplification,
 * we apply a second pass on the client to guarantee that:
 *   1. Duplicate from→to pairs are merged (sum of amounts).
 *   2. Opposing pairs (A→B and B→A) are netted.
 *   3. The minimum number of transactions (at most N-1 for N users)
 *      is returned via a greedy creditor/debtor matching algorithm.
 */

export interface SimplifiedBalance {
  fromUser: string;
  toUser: string;
  amount: number;
  status: "owes" | "settled";
}

/**
 * Simplify an array of balance entries into the minimum set of
 * transactions needed to settle all debts.  Runs in O(n log n).
 */
export function simplifyBalances(
  rawBalances: ReadonlyArray<{
    fromUser: string;
    toUser: string;
    amount: number;
    status?: string;
  }>
): SimplifiedBalance[] {
  if (!rawBalances || rawBalances.length === 0) return [];

  // ── Step 1: Build per-user net balance from the raw entries ──
  // Positive  = creditor (is owed money)
  // Negative  = debtor   (owes money)
  const userNet = new Map<string, number>();

  const addNet = (user: string, amount: number) => {
    userNet.set(user, (userNet.get(user) || 0) + amount);
  };

  for (const b of rawBalances) {
    if (!b.fromUser || !b.toUser || !b.amount) continue;
    addNet(b.fromUser, -b.amount); // debtor
    addNet(b.toUser, b.amount); // creditor
  }

  // ── Step 2: Split into creditors / debtors ──
  const creditors: Array<{ user: string; amount: number }> = [];
  const debtors: Array<{ user: string; amount: number }> = [];

  for (const [user, net] of userNet) {
    const rounded = Math.round(net * 100) / 100;
    if (rounded > 0.01) {
      creditors.push({ user, amount: rounded });
    } else if (rounded < -0.01) {
      debtors.push({ user, amount: -rounded }); // store positive
    }
  }

  // Sort descending for greedy matching (largest first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // ── Step 3: Greedy matching ──
  const result: SimplifiedBalance[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const transfer = Math.round(Math.min(c.amount, d.amount) * 100) / 100;

    if (transfer < 0.01) {
      ci++;
      di++;
      continue;
    }

    result.push({
      fromUser: d.user,
      toUser: c.user,
      amount: transfer,
      status: "owes",
    });

    c.amount = Math.round((c.amount - transfer) * 100) / 100;
    d.amount = Math.round((d.amount - transfer) * 100) / 100;

    if (c.amount < 0.01) ci++;
    if (d.amount < 0.01) di++;
  }

  return result;
}
