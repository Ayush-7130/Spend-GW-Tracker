/**
 * Expense Utility Functions
 *
 * Shared utilities for expense handling, particularly split calculations.
 * Single source of truth for expense split normalization and validation.
 *
 * @module expense-utils
 */

/**
 * Manual split record from the form
 */
export interface ManualSplitRecord {
  id: string;
  userId: string;
  amount: string;
}

/**
 * Expense form data structure
 * Common shape used by dashboard and expenses pages
 */
export interface ExpenseFormData {
  name: string;
  amount: string;
  description?: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string;
  splitBetween: string[];
  isSplit: boolean;
  splitMode: "equal" | "manual";
  splitAmounts: Record<string, string>;
  manualSplitRecords: ManualSplitRecord[];
}

/**
 * Normalized split result ready for API submission
 */
export interface NormalizedSplit {
  splitBetween: string[];
  splitAmounts: Record<string, number>;
  splitDetails?: {
    type: "equal" | "manual";
    splits: Array<{
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
}

/**
 * Split validation result
 */
export interface SplitValidationResult {
  valid: boolean;
  error?: string;
  normalized?: NormalizedSplit;
}

/**
 * CANONICAL: Normalize and validate expense split data
 *
 * Converts form split data (strings) to API-ready format (numbers).
 * Validates that split amounts sum to total expense amount.
 *
 * This function is the single source of truth for split calculations.
 * Both dashboard (page.tsx) and expenses/page.tsx should use this.
 *
 * @param formData - The expense form data
 * @param totalAmount - The total expense amount (parsed from formData.amount)
 * @returns Validation result with normalized split data if valid
 */
export function normalizeExpenseSplit(
  formData: Pick<
    ExpenseFormData,
    "isSplit" | "splitMode" | "splitAmounts" | "manualSplitRecords"
  >,
  totalAmount: number
): SplitValidationResult {
  // Not a split expense - return early
  if (!formData.isSplit) {
    return {
      valid: true,
      normalized: {
        splitBetween: [],
        splitAmounts: {},
      },
    };
  }

  let splitBetween: string[] = [];
  let splitAmounts: Record<string, number> = {};

  if (formData.splitMode === "equal") {
    // Equal split: use all users with non-zero amounts from splitAmounts
    splitBetween = Object.keys(formData.splitAmounts).filter(
      (userId) => parseFloat(formData.splitAmounts[userId] || "0") > 0
    );
    splitAmounts = Object.fromEntries(
      Object.entries(formData.splitAmounts).map(([userId, amt]) => [
        userId,
        parseFloat(amt || "0"),
      ])
    );
  } else {
    // Manual split: use manualSplitRecords
    const validRecords = formData.manualSplitRecords.filter(
      (r) => r.userId !== "" && r.amount !== "" && parseFloat(r.amount) > 0
    );
    splitBetween = validRecords.map((r) => r.userId);
    splitAmounts = Object.fromEntries(
      validRecords.map((r) => [r.userId, parseFloat(r.amount)])
    );
  }

  // Validate: at least one person must be in the split
  if (splitBetween.length === 0) {
    return {
      valid: false,
      error: "At least one person must be included in the split",
    };
  }

  // Validate: split amounts must sum to total (with tolerance for floating point)
  const splitTotal = Object.values(splitAmounts).reduce(
    (sum, amt) => sum + amt,
    0
  );
  const tolerance = 0.01; // Allow 1 paise difference for rounding

  if (Math.abs(splitTotal - totalAmount) > tolerance) {
    return {
      valid: false,
      error: `Split amounts (₹${splitTotal.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)})`,
    };
  }

  // Build splitDetails for API
  const splitDetails = {
    type: formData.splitMode,
    splits: splitBetween.map((userId) => ({
      userId,
      userName: userId, // Backend will resolve actual names
      amount: splitAmounts[userId] || 0,
    })),
  };

  return {
    valid: true,
    normalized: {
      splitBetween,
      splitAmounts,
      splitDetails,
    },
  };
}

/**
 * Calculate equal split amounts for all members
 *
 * Distributes total amount equally among members, handling rounding
 * by adding remainder to the first person's share.
 *
 * @param totalAmount - Total expense amount
 * @param memberIds - Array of member user IDs
 * @returns Record mapping userId -> split amount as string
 */
export function calculateEqualSplit(
  totalAmount: number,
  memberIds: string[]
): Record<string, string> {
  if (memberIds.length === 0) {
    return {};
  }

  const perPerson = totalAmount / memberIds.length;
  const roundedPerPerson = Math.floor(perPerson * 100) / 100; // Floor to 2 decimal places
  const remainder = totalAmount - roundedPerPerson * memberIds.length;

  const splitAmounts: Record<string, string> = {};

  memberIds.forEach((userId, index) => {
    // Add remainder to first person to ensure total matches
    const amount =
      index === 0 ? roundedPerPerson + remainder : roundedPerPerson;
    splitAmounts[userId] = amount.toFixed(2);
  });

  return splitAmounts;
}

/**
 * Create initial expense form state
 * Provides consistent defaults for expense forms across the app.
 */
export function createInitialExpenseFormData(
  overrides?: Partial<ExpenseFormData>
): ExpenseFormData {
  const today = new Date().toISOString().split("T")[0];

  return {
    name: "",
    amount: "",
    description: "",
    date: today,
    category: "",
    subcategory: "",
    paidBy: "",
    splitBetween: [],
    isSplit: false,
    splitMode: "equal",
    splitAmounts: {},
    manualSplitRecords: [{ id: "1", userId: "", amount: "" }],
    ...overrides,
  };
}

/**
 * Build expense data object ready for API submission
 *
 * Converts form data to the format expected by the API.
 *
 * @param formData - The expense form data
 * @param normalizedSplit - The validated/normalized split data
 * @returns Expense data object for API submission
 */
export function buildExpenseApiData(
  formData: ExpenseFormData,
  normalizedSplit: NormalizedSplit
): Record<string, unknown> {
  const totalAmount = parseFloat(formData.amount);

  const expenseData: Record<string, unknown> = {
    description: formData.name, // API expects 'description', not 'name'
    amount: totalAmount,
    date: formData.date,
    category: formData.category,
    subcategory: formData.subcategory || "",
    paidBy: formData.paidBy,
    isSplit: formData.isSplit,
    splitBetween: normalizedSplit.splitBetween,
  };

  // Add splitDetails for split expenses
  if (formData.isSplit && normalizedSplit.splitDetails) {
    expenseData.splitDetails = normalizedSplit.splitDetails;
  }

  return expenseData;
}
