/**
 * Dashboard Data Hook
 *
 * Handles all data fetching, mutations, and state management for the dashboard.
 * Extracted from page.tsx to separate data concerns from UI.
 * Uses datasource layer for all API calls per Architecture guidelines.
 *
 * @module useDashboard
 */

import { useState, useEffect, useCallback } from "react";
import { useGroup } from "@/contexts/GroupContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOperationNotification } from "@/contexts/NotificationContext";
import {
  normalizeExpenseSplit,
  calculateEqualSplit,
} from "@/lib/utils/expense";
import {
  SettlementsDataSource,
  ExpensesDataSource,
  DashboardDataSource,
  ApiError,
} from "@/datasource";
import { simplifyBalances } from "@/lib/utils/settlements";

// ============================================
// Types
// ============================================

export interface DashboardData {
  totalExpenses: number;
  totalExpenseCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  categoriesCount: number;
  settlementAmount: number;
  settlementMessage: string;
  users: Array<{
    id: string;
    name: string;
  }>;
  recentExpenses: {
    _id: string;
    amount: number;
    description: string;
    date: string;
    category: string;
    paidBy: string;
    isSplit?: boolean;
    categoryName?: string;
  }[];
}

export interface Settlement {
  _id: string;
  fromUser: string;
  toUser: string;
  fromUserName?: string;
  toUserName?: string;
  amount: number;
  description?: string;
  date: string;
}

export interface SettlementData {
  balances: Array<{
    fromUser: string;
    toUser: string;
    amount: number;
    status: "owes" | "settled";
  }>;
  summary: {
    totalOwed: number;
    totalSettled: number;
    totalTransactions: number;
    activeBalances: number;
  };
}

export interface ExpenseFormState {
  name: string;
  amount: string;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  paidBy: string;
  splitBetween: string[];
  isSplit: boolean;
  splitMode: "equal" | "manual";
  splitAmounts: Record<string, string>;
  manualSplitRecords: Array<{ id: string; userId: string; amount: string }>;
}

export interface SettlementFormState {
  from: string;
  to: string;
  amount: string;
  date: string;
  description: string;
  status: "pending" | "completed";
}

const INITIAL_EXPENSE_FORM: ExpenseFormState = {
  name: "",
  amount: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  category: "",
  subcategory: "",
  paidBy: "",
  splitBetween: [],
  isSplit: false,
  splitMode: "equal",
  splitAmounts: {},
  manualSplitRecords: [{ id: "1", userId: "", amount: "" }],
};

const INITIAL_SETTLEMENT_FORM: SettlementFormState = {
  from: "",
  to: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  status: "pending",
};

const EMPTY_SETTLEMENT_DATA: SettlementData = {
  balances: [],
  summary: {
    totalOwed: 0,
    totalSettled: 0,
    totalTransactions: 0,
    activeBalances: 0,
  },
};

// ============================================
// Hook
// ============================================

export function useDashboard() {
  const { activeGroup, isLoading: groupsLoading } = useGroup();
  const { categories } = useCategories();
  const { user } = useAuth();
  const { notifyAdded, notifyError } = useOperationNotification();

  // Data state
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [settlementData, setSettlementData] = useState<SettlementData | null>(
    null
  );
  const [recentSettlements, setRecentSettlements] = useState<Settlement[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("all");

  // Form state
  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormState>(INITIAL_EXPENSE_FORM);
  const [settlementForm, setSettlementForm] = useState<SettlementFormState>(
    INITIAL_SETTLEMENT_FORM
  );
  const [manualSplitEdit, setManualSplitEdit] = useState(false);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchDashboardData = useCallback(
    async (userId: string = "all") => {
      if (!activeGroup?._id) return;

      try {
        setLoading(true);
        // Use datasource layer instead of direct fetch for consistency
        const dashboardResponse = await DashboardDataSource.getDashboardData(
          activeGroup._id,
          userId
        );
        setDashboardData(dashboardResponse);
        setError(null);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Failed to load dashboard data";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [activeGroup?._id]
  );

  // Using datasource layer for settlement data
  const fetchSettlementData = useCallback(async () => {
    if (!activeGroup?._id) return;

    try {
      const [balanceData, recentData] = await Promise.all([
        SettlementsDataSource.getBalances(activeGroup._id).catch(() => null),
        SettlementsDataSource.getRecentSettlements(activeGroup._id, 5).catch(
          () => []
        ),
      ]);

      if (balanceData) {
        // The API returns { balances: [...], userBalances: [...], summary: {...} } after unwrapping
        const balanceResponse = balanceData as any;
        const apiBalances = balanceResponse.balances || [];
        const summaryData = balanceResponse.summary || {};

        // Map API field names then simplify (merge duplicates, N-1 optimisation)
        const mapped = apiBalances.map((b: any) => ({
          fromUser: b.fromUserName || b.fromUser || "",
          toUser: b.toUserName || b.toUser || "",
          amount: b.amount || 0,
          status: (b.status || "owes") as "owes" | "settled",
        }));
        const simplified = simplifyBalances(mapped);

        setSettlementData({
          balances: simplified,
          summary: {
            totalOwed: summaryData.totalOwed || 0,
            totalSettled: summaryData.totalSettled || 0,
            totalTransactions: summaryData.totalTransactions || 0,
            activeBalances: summaryData.activeBalances || 0,
          },
        });
      } else {
        setSettlementData(EMPTY_SETTLEMENT_DATA);
      }

      setRecentSettlements(recentData as Settlement[]);
    } catch {
      // Log error via logger instead of console
      setSettlementData(EMPTY_SETTLEMENT_DATA);
      setRecentSettlements([]);
    }
  }, [activeGroup?._id]);

  // Effect: Fetch data when user/group changes
  useEffect(() => {
    if (activeGroup) {
      setLoading(true);
      fetchDashboardData(selectedUser);
      if (selectedUser === "all") {
        fetchSettlementData();
      }
    } else if (!groupsLoading) {
      setLoading(false);
      setDashboardData(null);
      setSettlementData(null);
    }
  }, [
    selectedUser,
    activeGroup,
    groupsLoading,
    fetchDashboardData,
    fetchSettlementData,
  ]);

  // ============================================
  // Mutations
  // ============================================

  const addExpense = useCallback(async (): Promise<boolean> => {
    setOperationLoading(true);

    try {
      const totalAmount = parseFloat(expenseForm.amount);
      const splitResult = normalizeExpenseSplit(expenseForm, totalAmount);

      if (!splitResult.valid) {
        setError(splitResult.error || "Invalid split configuration");
        setOperationLoading(false);
        return false;
      }

      if (!activeGroup?._id) {
        setError("No active group selected");
        setOperationLoading(false);
        return false;
      }

      // Build splitDetails with proper user names
      let splitDetailsWithNames = splitResult.normalized?.splitDetails;
      if (
        expenseForm.isSplit &&
        splitDetailsWithNames &&
        dashboardData?.users
      ) {
        splitDetailsWithNames = {
          ...splitDetailsWithNames,
          splits: splitDetailsWithNames.splits?.map((split) => {
            const user = dashboardData.users.find((u) => u.id === split.userId);
            return {
              ...split,
              userName: user?.name || split.userId, // Use actual user name from dashboard data
            };
          }),
        };
      }

      // Use datasource layer for expense creation
      await ExpensesDataSource.createExpense(activeGroup._id, {
        description: expenseForm.name,
        amount: totalAmount,
        date: expenseForm.date,
        category: expenseForm.category,
        subcategory: expenseForm.subcategory || undefined,
        paidBy: expenseForm.paidBy,
        isSplit: expenseForm.isSplit,
        splitBetween: splitResult.normalized?.splitBetween,
        // CRITICAL FIX: Pass splitDetails with proper user names to API
        ...(expenseForm.isSplit &&
          splitDetailsWithNames && {
            splitDetails: splitDetailsWithNames,
          }),
      });

      setExpenseForm(INITIAL_EXPENSE_FORM);
      setManualSplitEdit(false);
      fetchDashboardData(selectedUser);
      if (selectedUser === "all") {
        fetchSettlementData();
      }
      notifyAdded("Expense");
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to add expense";
      setError(message);
      return false;
    } finally {
      setOperationLoading(false);
    }
  }, [
    expenseForm,
    selectedUser,
    activeGroup?._id,
    fetchDashboardData,
    fetchSettlementData,
    notifyAdded,
    dashboardData,
  ]);

  const recordSettlement = useCallback(async (): Promise<boolean> => {
    // Validation - check for empty fields first
    if (!settlementForm.from || !settlementForm.to) {
      const message = "Please select both 'From' and 'To' users";
      setError(message);
      notifyError("Validation Error", message);
      return false;
    }

    if (settlementForm.from === settlementForm.to) {
      const message = "From and To users cannot be the same person";
      setError(message);
      notifyError("Validation Error", message);
      return false;
    }

    const amount = parseFloat(settlementForm.amount);
    if (isNaN(amount) || amount <= 0) {
      const message = "Please enter a valid amount greater than 0";
      setError(message);
      notifyError("Validation Error", message);
      return false;
    }

    if (!activeGroup?._id) {
      const message = "No active group selected";
      setError(message);
      notifyError("Error", message);
      return false;
    }

    setOperationLoading(true);

    try {
      // Send user IDs directly - the API resolves names
      const settlementData = {
        fromUser: settlementForm.from,
        toUser: settlementForm.to,
        amount: amount,
        date: settlementForm.date,
        description: settlementForm.description,
      };

      // Use datasource layer for settlement creation
      await SettlementsDataSource.createSettlement(
        activeGroup._id,
        settlementData
      );

      setSettlementForm(INITIAL_SETTLEMENT_FORM);
      await fetchDashboardData(selectedUser);
      await fetchSettlementData();
      setError(null);
      notifyAdded("Settlement");
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Error recording settlement";
      setError(message);
      notifyError("Record Settlement", message);
      return false;
    } finally {
      setOperationLoading(false);
    }
  }, [
    settlementForm,
    activeGroup?._id,
    selectedUser,
    fetchDashboardData,
    fetchSettlementData,
    notifyAdded,
    notifyError,
  ]);

  // ============================================
  // Form Helpers
  // ============================================

  const updateExpenseForm = useCallback(
    (updates: Partial<ExpenseFormState>) => {
      setExpenseForm((prev) => {
        const newState = { ...prev, ...updates };

        // Auto-calculate equal split when amount changes
        if (
          updates.amount !== undefined &&
          prev.isSplit &&
          !manualSplitEdit &&
          activeGroup?.members
        ) {
          const memberIds = activeGroup.members.map((m) => m.userId);
          newState.splitAmounts = calculateEqualSplit(
            parseFloat(updates.amount || "0"),
            memberIds
          );
        }

        return newState;
      });
    },
    [manualSplitEdit, activeGroup]
  );

  const updateSettlementForm = useCallback(
    (updates: Partial<SettlementFormState>) => {
      setSettlementForm((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  const resetExpenseForm = useCallback(() => {
    setExpenseForm(INITIAL_EXPENSE_FORM);
    setManualSplitEdit(false);
  }, []);

  const resetSettlementForm = useCallback(() => {
    setSettlementForm(INITIAL_SETTLEMENT_FORM);
  }, []);

  const prefillQuickSettle = useCallback(() => {
    if (!settlementData?.balances?.length) return false;

    const outstandingBalance = settlementData.balances.find(
      (b) => b.status === "owes"
    );
    if (!outstandingBalance) return false;

    const getIdFromName = (name: string) => name.toLowerCase();

    setSettlementForm({
      from: getIdFromName(outstandingBalance.fromUser),
      to: getIdFromName(outstandingBalance.toUser),
      amount: outstandingBalance.amount.toString(),
      date: new Date().toISOString().split("T")[0],
      description: "Settlement for outstanding balance",
      status: "pending",
    });

    return true;
  }, [settlementData]);

  // ============================================
  // Display Helpers
  // ============================================

  const getUserDisplayName = useCallback(() => {
    if (selectedUser === "all") return "All Users";
    if (selectedUser === "me" && user) return "Me";

    const member = dashboardData?.users?.find((u) => u.id === selectedUser);
    if (member?.name) return member.name;

    return selectedUser.charAt(0).toUpperCase() + selectedUser.slice(1);
  }, [selectedUser, user, dashboardData]);

  const getStatsTitle = useCallback(
    (baseTitle: string) => {
      if (baseTitle.includes("This Month")) {
        const currentMonth = new Date().toLocaleDateString("en-IN", {
          month: "short",
        });
        const monthTitle = baseTitle.replace(
          "This Month",
          `${currentMonth} ${new Date().getFullYear()}`
        );
        if (selectedUser === "all") {
          return monthTitle.replace("My ", "Total ");
        }
        return monthTitle;
      }

      if (selectedUser === "all") {
        return baseTitle.replace("My ", "Total ");
      }
      return baseTitle;
    },
    [selectedUser]
  );

  const getMonthIcon = useCallback(() => {
    const currentMonth = new Date().getMonth();
    const monthIcons = [
      "bi-snow",
      "bi-heart",
      "bi-flower1",
      "bi-brightness-high",
      "bi-flower2",
      "bi-sun",
      "bi-brightness-high-fill",
      "bi-thermometer-sun",
      "bi-leaf",
      "bi-tree",
      "bi-cloud-rain",
      "bi-snow2",
    ];
    return monthIcons[currentMonth] || "bi-calendar-month";
  }, []);

  // ============================================
  // Return
  // ============================================

  return {
    // Context data
    categories,
    activeGroup,
    user,
    groupsLoading,

    // Dashboard data
    dashboardData,
    settlementData,
    recentSettlements,

    // State
    loading,
    operationLoading,
    error,
    selectedUser,
    setSelectedUser,
    setError,

    // Form state
    expenseForm,
    settlementForm,
    manualSplitEdit,
    setManualSplitEdit,

    // Data operations
    fetchDashboardData,
    fetchSettlementData,
    addExpense,
    recordSettlement,

    // Form operations
    updateExpenseForm,
    updateSettlementForm,
    resetExpenseForm,
    resetSettlementForm,
    prefillQuickSettle,

    // Display helpers
    getUserDisplayName,
    getStatsTitle,
    getMonthIcon,
  };
}

// Re-export types for convenience
export type {
  ExpenseFormState as ExpenseForm,
  SettlementFormState as SettlementForm,
};
