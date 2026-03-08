"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useCategories } from "@/contexts/CategoriesContext";
import { useGroup } from "@/contexts/GroupContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { debounce } from "@/lib/utils/performance";
import {
  normalizeExpenseSplit,
  calculateEqualSplit,
} from "@/lib/utils/expense";
import {
  Modal,
  FilterPanel,
  UserBadge,
  StatusBadge,
  LoadingSpinner,
  InputField,
  DateField,
  CheckboxField,
  FormGroup,
  TextareaField,
  EmptyState,
  Badge,
  ExportButton,
  SearchableSelect,
  ExpenseDetailsModal,
  ExpensesSkeleton,
} from "@/shared/components";
import { TableCard } from "@/shared/components/Card/TableCard";
import {
  formatCurrency,
  formatDate,
  fetchData,
  buildUrlWithParams,
  PaginationData,
} from "@/lib/utils";

interface Expense {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  paidBy: string;
  isSplit: boolean;
  splitBetween?: string[];
  splitDetails?: {
    type?: string;
    splits?: Array<{
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
  categoryDetails?: {
    name: string;
  }[];
}

interface Subcategory {
  name: string;
  description: string;
}

function ExpensesContent() {
  const searchParams = useSearchParams();
  const { notifyError, notifyDeleted, notifyAdded, notifyUpdated } =
    useOperationNotification();
  const { categories } = useCategories(); // Use categories context
  const { activeGroup, getGroupMembers } = useGroup(); // Get active group and members helper
  const confirmation = useConfirmation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    paidBy: "",
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc",
  });

  // Add Expense Dialog states
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] =
    useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    subcategory: "",
    paidBy: "",
    splitBetween: [] as string[],
    isSplit: false,
    splitMode: "equal" as "equal" | "manual", // New: split mode selection
    splitAmounts: {} as Record<string, string>, // For equal split: userId -> amount mapping
    manualSplitRecords: [{ id: "1", userId: "", amount: "" }] as Array<{
      id: string;
      userId: string;
      amount: string;
    }>, // For manual split: dynamic records
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manualSplitEdit, setManualSplitEdit] = useState(false);
  // userSearchQuery not read directly - only setter used to reset state
  const [, setUserSearchQuery] = useState("");
  const [groupMembers, setGroupMembers] = useState<
    Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
      joinedAt: Date;
      status?: string;
      leftAt?: Date;
    }>
  >([]);

  // Get users from active group members (either from activeGroup or fetched members)
  const users =
    (activeGroup?.members || groupMembers)?.map((member) => ({
      id: member.userId,
      name: ("name" in member ? member.name : member.userId) || member.userId, // Use name if available, fallback to userId
      status: member.status || "active",
    })) || [];

  // Fetch group members if not available from context - uses shared helper to avoid duplication
  useEffect(() => {
    const fetchMembers = async () => {
      if (activeGroup && !activeGroup.members) {
        const members = await getGroupMembers(activeGroup._id);
        setGroupMembers(members as typeof groupMembers);
      }
    };
    fetchMembers();
  }, [activeGroup, getGroupMembers]);

  // Sort handlers - currently not used but kept for future implementation
  // const { handleSort, getSortIcon } = createSortHandler(sortConfig, (config) => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     sortBy: config.sortBy,
  //     sortOrder: config.sortOrder,
  //   }));
  // });

  // Categories are now managed by CategoriesContext - no need to fetch here

  useEffect(() => {
    // Show success message if redirected from add expense
    if (searchParams.get("success") === "added") {
      setTimeout(() => {
        notifyAdded("Expense");
      }, 100);
    }
    // eslint-disable-next-line -- only run when searchParams changes
  }, [searchParams]); // Only depend on searchParams

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const url = buildUrlWithParams("/api/expenses", {
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      category: filters.category,
      paidBy: filters.paidBy,
      startDate: filters.startDate,
      endDate: filters.endDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    const result = await fetchData<{
      expenses: Expense[];
      pagination: PaginationData;
    }>(url);
    if (result.success && result.data) {
      setExpenses(result.data.expenses);
      setPagination(result.data.pagination);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, filters]);

  // Debounced fetch for search to avoid excessive API calls
  const debouncedFetchExpenses = useMemo(
    () => debounce(fetchExpenses, 300),
    [fetchExpenses]
  );

  useEffect(() => {
    // Use debounced fetch for search queries, immediate fetch for other filters
    if (filters.search) {
      debouncedFetchExpenses();
    } else {
      fetchExpenses();
    }
  }, [fetchExpenses, debouncedFetchExpenses, filters.search]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Selection handlers - currently not used but kept for future implementation
  // const handleSelectExpense = (expenseId: string) => {
  //   setSelectedExpenses((prev) =>
  //     prev.includes(expenseId)
  //       ? prev.filter((id) => id !== expenseId)
  //       : [...prev, expenseId]
  //   );
  // };

  // const handleSelectAll = () => {
  //   setSelectedExpenses(
  //     selectedExpenses.length === expenses.length
  //       ? []
  //       : expenses.map((exp) => exp._id)
  //   );
  // };

  // Bulk delete handler - commented out for future use
  // const handleBulkDelete = async () => {
  //   const result = await bulkDelete(
  //     selectedExpenses,
  //     "/api/expenses",
  //     "expenses"
  //   );
  //   if (result.success) {
  //     setSelectedExpenses([]);
  //     fetchExpenses();
  //     notifyDeleted(`${selectedExpenses.length} expense(s)`);
  //   } else if (result.error && result.error !== "Cancelled by user") {
  //     notifyError("Delete", result.error);
  //   }
  // };

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await confirmation.confirm({
      title: "Delete Expense",
      message:
        "Are you sure you want to delete this expense? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    setOperationLoading(true);

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete expense");
      }

      fetchExpenses();
      notifyDeleted("Expense");
    } catch (error) {
      notifyError(
        "Delete",
        error instanceof Error ? error.message : "Failed to delete expense"
      );
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);

    // Build splitAmounts and manualSplitRecords from splitBetween or legacy splitDetails
    const splitAmounts: Record<string, string> = {};
    const manualSplitRecords: Array<{
      id: string;
      userId: string;
      amount: string;
    }> = [];

    if (expense.isSplit && expense.splitBetween) {
      // New format: use splitBetween array
      expense.splitBetween.forEach((userId, index) => {
        const amount = (expense.amount / expense.splitBetween!.length).toFixed(
          2
        );
        splitAmounts[userId] = amount;
        manualSplitRecords.push({
          id: (index + 1).toString(),
          userId,
          amount,
        });
      });
      // Add an empty record at the end for potential additions
      manualSplitRecords.push({
        id: Date.now().toString(),
        userId: "",
        amount: "",
      });
    } else if (expense.isSplit && expense.splitDetails?.splits) {
      // New format: convert splitDetails.splits to splitAmounts
      expense.splitDetails.splits.forEach((split, index) => {
        const amount = split.amount.toString();
        splitAmounts[split.userId] = amount;
        manualSplitRecords.push({
          id: (index + 1).toString(),
          userId: split.userId,
          amount,
        });
      });
      // Add an empty record at the end
      manualSplitRecords.push({
        id: Date.now().toString(),
        userId: "",
        amount: "",
      });
    }

    // If no split records, start with one empty record
    if (manualSplitRecords.length === 0) {
      manualSplitRecords.push({ id: "1", userId: "", amount: "" });
    }

    setNewExpense({
      name: expense.description,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date.split("T")[0], // Convert to YYYY-MM-DD format
      category: expense.category,
      subcategory: expense.subcategory || "",
      paidBy: expense.paidBy,
      splitBetween:
        expense.splitBetween || (expense.isSplit ? users.map((u) => u.id) : []),
      isSplit: expense.isSplit,
      splitMode: expense.isSplit ? "manual" : "equal", // Default to manual for existing splits
      splitAmounts,
      manualSplitRecords,
    });
    // If editing an expense with split, mark as manually edited
    setManualSplitEdit(expense.isSplit);
    setUserSearchQuery(""); // Reset search
    setShowAddExpenseDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddExpenseDialog(false);
    setEditingExpense(null);
    setSubmitError(null);
    setManualSplitEdit(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setOperationLoading(true);

    try {
      const totalAmount = parseFloat(newExpense.amount);

      // Use canonical split normalization utility
      const splitResult = normalizeExpenseSplit(newExpense, totalAmount);

      if (!splitResult.valid) {
        setSubmitError(splitResult.error || "Invalid split configuration");
        setOperationLoading(false);
        return;
      }

      const expenseData: any = {
        description: newExpense.name, // API expects 'description', not 'name'
        amount: totalAmount,
        date: newExpense.date,
        category: newExpense.category,
        subcategory: newExpense.subcategory || "",
        paidBy: newExpense.paidBy,
        isSplit: newExpense.isSplit,
        splitBetween: splitResult.normalized?.splitBetween,
      };

      // Add splitDetails for split expenses
      if (newExpense.isSplit && splitResult.normalized?.splitDetails) {
        expenseData.splitDetails = splitResult.normalized.splitDetails;
      }

      // Determine if this is an edit or create operation
      const isEditing = editingExpense !== null;
      const url = isEditing
        ? `/api/expenses/${editingExpense._id}`
        : "/api/expenses";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });

      // Check if response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${isEditing ? "update" : "add"} expense`
        );
      }

      // Close dialog and reset form
      handleCloseDialog();
      setNewExpense({
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
      });
      setManualSplitEdit(false);
      setUserSearchQuery("");

      // Refresh the expenses list
      await fetchExpenses();

      // Show success notification
      if (isEditing) {
        notifyUpdated("Expense");
      } else {
        notifyAdded("Expense");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${editingExpense ? "update" : "add"} expense`;
      setSubmitError(errorMessage);
      notifyError(editingExpense ? "Update" : "Create", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };
  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-list-ul me-2"></i>
              Expenses
            </h1>
            <button
              onClick={() => {
                setEditingExpense(null);
                setNewExpense({
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
                });
                setManualSplitEdit(false);
                setUserSearchQuery("");
                setShowAddExpenseDialog(true);
              }}
              className="btn btn-primary"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Expense
            </button>
          </div>

          {/* Filters */}
          <FilterPanel
            filters={[
              {
                key: "search",
                type: "text",
                label: "Search",
                placeholder: "Search description...",
                colSize: 3,
              },
              {
                key: "category",
                type: "select",
                label: "Category",
                options: categories.map((cat) => ({
                  label: cat.name,
                  value: cat._id,
                })),
                colSize: 2,
              },
              {
                key: "paidBy",
                type: "select",
                label: "Paid By",
                options: users.map((user) => ({
                  label: user.name,
                  value: user.id,
                })),
                colSize: 2,
              },
              {
                key: "startDate",
                type: "date",
                label: "Start Date",
                colSize: 2,
              },
              {
                key: "endDate",
                type: "date",
                label: "End Date",
                colSize: 2,
              },
            ]}
            values={filters}
            onChange={handleFilterChange}
            onClear={() => {
              setFilters({
                search: "",
                category: "",
                paidBy: "",
                startDate: "",
                endDate: "",
                sortBy: "date",
                sortOrder: "desc",
              });
            }}
          />

          {/* Expenses Table */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="bi bi-table me-2"></i>
                Expense List
              </h5>
              <ExportButton
                endpoint="/api/expenses/export"
                params={filters}
                label="Export"
                variant="outline-secondary"
                icon="bi-download"
                size="sm"
              />
            </div>
            {loading ? (
              <ExpensesSkeleton />
            ) : expenses.length === 0 ? (
              <div className="card">
                <div className="card-body">
                  <EmptyState
                    icon="📋"
                    title="No expenses found"
                    description="Create your first expense to start tracking your spending."
                    size="medium"
                    actions={[
                      {
                        label: "Add Expense",
                        onClick: () => {
                          setEditingExpense(null);
                          setNewExpense({
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
                            manualSplitRecords: [
                              { id: "1", userId: "", amount: "" },
                            ],
                          });
                          setUserSearchQuery("");
                          setShowAddExpenseDialog(true);
                        },
                        variant: "primary",
                        icon: "plus",
                      },
                    ]}
                  />
                </div>
              </div>
            ) : (
              <>
                <TableCard<Expense>
                  data={expenses}
                  columns={[
                    {
                      key: "date",
                      label: "Date",
                      render: (expense: Expense) => (
                        <span style={{ color: "var(--text-secondary)" }}>
                          {formatDate(expense.date)}
                        </span>
                      ),
                    },
                    {
                      key: "description",
                      label: "Description",
                      render: (expense: Expense) => (
                        <div>
                          <strong>{expense.description}</strong>
                          {expense.subcategory && (
                            <small
                              className="d-block"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {expense.subcategory}
                            </small>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "category",
                      label: "Category",
                      render: (expense: Expense) => (
                        <Badge variant="secondary">
                          {expense.categoryDetails?.[0]?.name ||
                            categories.find(
                              (cat) => cat._id === expense.category
                            )?.name ||
                            expense.category}
                        </Badge>
                      ),
                    },
                    {
                      key: "amount",
                      label: "Amount",
                      render: (expense: Expense) => (
                        <div>
                          <strong>{formatCurrency(expense.amount)}</strong>
                          {expense.isSplit && (
                            <small
                              className="d-block"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Split expense
                            </small>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "paidBy",
                      label: "Paid By",
                      render: (expense: Expense) => {
                        const paidByUser = users.find(
                          (u) => u.id === expense.paidBy
                        );
                        return (
                          <div className="d-flex align-items-center gap-1 flex-wrap">
                            <UserBadge
                              user={paidByUser?.name || expense.paidBy}
                            />
                            {paidByUser?.status === "left" && (
                              <span
                                className="badge bg-secondary"
                                style={{ fontSize: "0.65rem" }}
                                title="This member has left the group"
                              >
                                <i
                                  className="bi bi-box-arrow-left me-1"
                                  aria-hidden="true"
                                ></i>
                                Left
                              </span>
                            )}
                          </div>
                        );
                      },
                    },
                    {
                      key: "split",
                      label: "Split",
                      render: (expense: Expense) => (
                        <StatusBadge
                          status={expense.isSplit ? "split" : "personal"}
                          type="split"
                        />
                      ),
                    },
                  ]}
                  actions={[
                    {
                      label: "",
                      icon: "bi-eye",
                      onClick: (expense: Expense) =>
                        setSelectedExpenseForDetails(expense),
                      variant: "primary",
                    },
                    {
                      label: "",
                      icon: "bi-pencil",
                      onClick: (expense: Expense) => handleEditExpense(expense),
                      variant: "secondary",
                    },
                    {
                      label: "",
                      icon: "bi-trash",
                      onClick: (expense: Expense) =>
                        handleDeleteExpense(expense._id),
                      variant: "danger",
                    },
                  ]}
                  mobileCardRender={(expense: Expense) => ({
                    title: expense.description,
                    subtitle: formatDate(expense.date),
                    amount: formatCurrency(expense.amount),
                    meta:
                      expense.categoryDetails?.[0]?.name || expense.category,
                    badge: (() => {
                      const paidByUser = users.find(
                        (u) => u.id === expense.paidBy
                      );
                      return (
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            flexWrap: "wrap",
                            alignItems: "center",
                          }}
                        >
                          <UserBadge
                            user={paidByUser?.name || expense.paidBy}
                          />
                          {paidByUser?.status === "left" && (
                            <span
                              className="badge bg-secondary"
                              style={{ fontSize: "0.65rem" }}
                              title="This member has left the group"
                            >
                              <i
                                className="bi bi-box-arrow-left me-1"
                                aria-hidden="true"
                              ></i>
                              Left
                            </span>
                          )}
                          {expense.isSplit && (
                            <StatusBadge status="split" type="split" />
                          )}
                        </div>
                      );
                    })(),
                    splitInfo: expense.isSplit ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>Split expense</span>
                      </div>
                    ) : undefined,
                  })}
                  emptyMessage="No expenses found"
                  loading={loading}
                />

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                  <div className="pagination-controls d-flex justify-content-between align-items-center mt-3">
                    <div className="pagination-info text-muted">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} expenses
                    </div>
                    <div className="pagination-buttons d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page - 1,
                          }))
                        }
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </button>
                      <span className="btn btn-sm btn-outline-secondary disabled">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page + 1,
                          }))
                        }
                        disabled={pagination.page === pagination.pages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Modal
        show={showAddExpenseDialog}
        onClose={handleCloseDialog}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
        loading={operationLoading}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCloseDialog}
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              form="expense-form"
              className="btn btn-primary d-inline-flex align-items-center justify-content-center"
              disabled={operationLoading}
              aria-label={editingExpense ? "Update Expense" : "Add Expense"}
              style={{ minWidth: "130px" }}
            >
              {operationLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  {editingExpense ? "Updating..." : "Adding..."}
                </>
              ) : editingExpense ? (
                "Update Expense"
              ) : (
                "Add Expense"
              )}
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleAddExpense}>
          {submitError && (
            <div className="alert alert-danger" role="alert">
              {submitError}
            </div>
          )}
          <InputField
            label="Expense Name"
            type="text"
            value={newExpense.name}
            onChange={(value) => setNewExpense({ ...newExpense, name: value })}
            required
            id="expense-name"
          />
          <InputField
            label="Amount"
            type="number"
            step="0.01"
            value={newExpense.amount}
            onChange={(amount) => {
              const updates: any = {
                ...newExpense,
                amount,
              };

              // Only auto-split if split is enabled and user hasn't manually edited
              if (
                newExpense.isSplit &&
                !manualSplitEdit &&
                amount &&
                activeGroup?.members
              ) {
                const memberIds = activeGroup.members.map((m) => m.userId);
                updates.splitAmounts = calculateEqualSplit(
                  parseFloat(amount),
                  memberIds
                );
              }

              setNewExpense(updates);
            }}
            required
            id="expense-amount"
          />
          <div className="mb-3">
            <label htmlFor="expense-category" className="form-label">
              Category <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              options={
                Array.isArray(categories)
                  ? categories.map((category) => ({
                      value: category._id,
                      label: category.name,
                    }))
                  : []
              }
              value={newExpense.category}
              onChange={(value) =>
                setNewExpense({
                  ...newExpense,
                  category: value as string,
                  subcategory: "",
                })
              }
              placeholder="Search and select a category..."
              searchPlaceholder="Type to search categories..."
              id="expense-category"
              clearable={true}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="expense-subcategory" className="form-label">
              Sub-category (Optional)
            </label>
            <SearchableSelect
              options={
                newExpense.category
                  ? (() => {
                      const selectedCategory = categories.find(
                        (cat) => cat._id === newExpense.category
                      );
                      return (
                        selectedCategory?.subcategories?.map(
                          (subcategory: Subcategory) => ({
                            value: subcategory.name,
                            label: subcategory.name,
                          })
                        ) || []
                      );
                    })()
                  : []
              }
              value={newExpense.subcategory}
              onChange={(value) =>
                setNewExpense({
                  ...newExpense,
                  subcategory: value as string,
                })
              }
              disabled={!newExpense.category}
              placeholder="Search and select a sub-category..."
              searchPlaceholder="Type to search sub-categories..."
              id="expense-subcategory"
              clearable={true}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="expense-paidBy" className="form-label">
              Paid By <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              options={users.map((user) => ({
                value: user.id,
                label: user.name,
              }))}
              value={newExpense.paidBy}
              onChange={(value) =>
                setNewExpense({ ...newExpense, paidBy: value as string })
              }
              placeholder="Search and select who paid..."
              searchPlaceholder="Type to search users..."
              id="expense-paidBy"
              clearable={true}
            />
          </div>
          <CheckboxField
            label="Split this expense between users"
            checked={newExpense.isSplit}
            onChange={(isSplit) => {
              const splitBetween = isSplit ? users.map((u) => u.id) : [];
              let splitAmounts: Record<string, string> = {};

              if (isSplit && newExpense.amount && users.length > 0) {
                splitAmounts = calculateEqualSplit(
                  parseFloat(newExpense.amount),
                  users.map((u) => u.id)
                );
              }

              setNewExpense({
                ...newExpense,
                isSplit,
                splitBetween,
                splitAmounts,
                splitMode: "equal", // Default to equal when enabling split
                manualSplitRecords: [{ id: "1", userId: "", amount: "" }], // Reset manual split records
              });
              // Reset manual edit flag and search query when toggling split
              setManualSplitEdit(false);
              setUserSearchQuery("");
            }}
            id="expense-split"
          />

          {newExpense.isSplit && users.length > 0 && (
            <FormGroup title="Split Configuration">
              {/* Split Mode Selection */}
              <div className="mb-3">
                <label htmlFor="splitModeEqual" className="form-label">
                  Split Mode
                </label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="splitMode"
                      id="splitModeEqual"
                      checked={newExpense.splitMode === "equal"}
                      onChange={() => {
                        // Calculate equal split using shared utility
                        let splitAmounts: Record<string, string> = {};
                        if (newExpense.amount && users.length > 0) {
                          splitAmounts = calculateEqualSplit(
                            parseFloat(newExpense.amount),
                            users.map((u) => u.id)
                          );
                        }
                        setNewExpense({
                          ...newExpense,
                          splitMode: "equal",
                          splitAmounts,
                        });
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="splitModeEqual"
                    >
                      Equal Split
                      <small className="d-block text-muted">
                        Amount will be divided equally among all group members
                      </small>
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="splitMode"
                      id="splitModeManual"
                      checked={newExpense.splitMode === "manual"}
                      onChange={() => {
                        setNewExpense({
                          ...newExpense,
                          splitMode: "manual",
                        });
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="splitModeManual"
                    >
                      Manual Split
                      <small className="d-block text-muted">
                        Select users and specify amounts for each
                      </small>
                    </label>
                  </div>
                </div>
              </div>

              {/* Equal Split - Simple text message */}
              {newExpense.splitMode === "equal" && (
                <div
                  className="alert alert-info d-flex align-items-center"
                  role="alert"
                >
                  <i className="bi bi-info-circle me-2"></i>
                  <div>
                    Each user will have{" "}
                    <strong>
                      ₹
                      {users.length > 0
                        ? (
                            parseFloat(newExpense.amount || "0") / users.length
                          ).toFixed(2)
                        : "0.00"}
                    </strong>{" "}
                    split amount
                  </div>
                </div>
              )}

              {/* Manual Split - Dynamic user selection */}
              {newExpense.splitMode === "manual" && (
                <div className="mb-3">
                  <span
                    className="form-label fw-semibold"
                    role="heading"
                    aria-level={6}
                  >
                    Manual Split Records
                  </span>
                  <div className="split-records-container">
                    {newExpense.manualSplitRecords.map((record, index) => {
                      const availableUsers = users.filter(
                        (user) =>
                          !newExpense.manualSplitRecords.some(
                            (r) => r.userId === user.id && r.id !== record.id
                          ) || user.id === record.userId
                      );

                      const canDelete =
                        record.userId !== "" || record.amount !== "";

                      return (
                        <div
                          key={record.id}
                          className="card mb-2"
                          style={{
                            backgroundColor: "var(--card-bg)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          <div className="card-body p-3">
                            <div className="row g-2 align-items-end">
                              <div className="col-md-6">
                                <label
                                  htmlFor={`user-select-${record.id}`}
                                  className="form-label"
                                >
                                  Select User
                                </label>
                                <SearchableSelect
                                  options={availableUsers.map((user) => ({
                                    value: user.id,
                                    label: user.name,
                                  }))}
                                  value={record.userId}
                                  onChange={(value) => {
                                    const newRecords = [
                                      ...newExpense.manualSplitRecords,
                                    ];
                                    newRecords[index].userId = value as string;

                                    // Auto-add new record if this is the last one and it's being filled
                                    if (
                                      index ===
                                        newExpense.manualSplitRecords.length -
                                          1 &&
                                      value !== ""
                                    ) {
                                      newRecords.push({
                                        id: Date.now().toString(),
                                        userId: "",
                                        amount: "",
                                      });
                                    }

                                    setNewExpense({
                                      ...newExpense,
                                      manualSplitRecords: newRecords,
                                    });
                                  }}
                                  placeholder="Search and select user..."
                                  searchPlaceholder="Type to search users..."
                                  id={`user-select-${record.id}`}
                                  clearable={true}
                                />
                              </div>

                              <div className="col-md-4">
                                <InputField
                                  label="Amount"
                                  type="number"
                                  step="0.01"
                                  value={record.amount}
                                  onChange={(value) => {
                                    const newRecords = [
                                      ...newExpense.manualSplitRecords,
                                    ];
                                    newRecords[index].amount = value as string;

                                    // Auto-add new record if this is the last one and it's being filled
                                    if (
                                      index ===
                                        newExpense.manualSplitRecords.length -
                                          1 &&
                                      value !== "" &&
                                      record.userId !== ""
                                    ) {
                                      newRecords.push({
                                        id: Date.now().toString(),
                                        userId: "",
                                        amount: "",
                                      });
                                    }

                                    setNewExpense({
                                      ...newExpense,
                                      manualSplitRecords: newRecords,
                                    });
                                  }}
                                  placeholder="0.00"
                                  id={`amount-${record.id}`}
                                />
                              </div>

                              <div className="col-md-2 d-flex justify-content-end">
                                {canDelete && (
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => {
                                      const newRecords =
                                        newExpense.manualSplitRecords.filter(
                                          (r) => r.id !== record.id
                                        );
                                      // Ensure at least one record exists
                                      if (newRecords.length === 0) {
                                        newRecords.push({
                                          id: Date.now().toString(),
                                          userId: "",
                                          amount: "",
                                        });
                                      }
                                      setNewExpense({
                                        ...newExpense,
                                        manualSplitRecords: newRecords,
                                      });
                                    }}
                                    title="Delete this split record"
                                    aria-label="Delete split record"
                                  >
                                    <i
                                      className="bi bi-trash"
                                      aria-hidden="true"
                                    ></i>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total validation */}
                  <div className="mt-2">
                    <small style={{ color: "var(--text-secondary)" }}>
                      Total split: ₹
                      {newExpense.manualSplitRecords
                        .filter((r) => r.userId !== "" && r.amount !== "")
                        .reduce(
                          (sum, r) => sum + parseFloat(r.amount || "0"),
                          0
                        )
                        .toFixed(2)}
                      {newExpense.amount &&
                        ` / ₹${parseFloat(newExpense.amount).toFixed(2)}`}
                      {newExpense.amount &&
                        Math.abs(
                          newExpense.manualSplitRecords
                            .filter((r) => r.userId !== "" && r.amount !== "")
                            .reduce(
                              (sum, r) => sum + parseFloat(r.amount || "0"),
                              0
                            ) - parseFloat(newExpense.amount || "0")
                        ) > 0.01 && (
                          <span style={{ color: "var(--status-error)" }}>
                            {" "}
                            - Amounts don&apos;t match!
                          </span>
                        )}
                    </small>
                  </div>
                </div>
              )}
            </FormGroup>
          )}
          <DateField
            label="Date"
            value={newExpense.date}
            onChange={(value) => setNewExpense({ ...newExpense, date: value })}
            required
            id="expense-date"
          />
          <TextareaField
            label="Description (Optional)"
            rows={3}
            value={newExpense.description}
            onChange={(value) =>
              setNewExpense({
                ...newExpense,
                description: value,
              })
            }
            id="expense-description"
          />
        </form>
      </Modal>

      <ConfirmationDialog
        show={confirmation.show}
        title={confirmation.config?.title || ""}
        message={confirmation.config?.message || ""}
        confirmText={confirmation.config?.confirmText}
        cancelText={confirmation.config?.cancelText}
        type={confirmation.config?.type}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

      {operationLoading && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{
            backgroundColor: "var(--overlay-light)",
            zIndex: 9999,
            backdropFilter: "blur(1px)",
          }}
        >
          <div className="processing-popup rounded p-3 shadow">
            <LoadingSpinner
              config={{
                size: "medium",
                text: "Processing...",
                showText: true,
                variant: "primary",
              }}
            />
          </div>
        </div>
      )}

      {/* Expense Details Modal */}
      <ExpenseDetailsModal
        expense={selectedExpenseForDetails}
        onClose={() => setSelectedExpenseForDetails(null)}
        users={users}
        categories={categories}
        infoCardColumns={2}
      />
    </MainLayout>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="max-w-7xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Expenses</h1>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </MainLayout>
      }
    >
      <ExpensesContent />
    </Suspense>
  );
}
