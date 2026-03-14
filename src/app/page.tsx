"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { useDashboard } from "@/hooks/useDashboard";
import { calculateEqualSplit } from "@/lib/utils/expense";
import {
  StatsCard,
  LoadingSpinner,
  StatusBadge,
  Table,
  Modal,
  EmptyState,
  Badge,
  InputField,
  SelectField,
  TextareaField,
  DateField,
  SearchableSelect,
  ExpenseDetailsModal,
  UserBadge,
  PageHeader,
  DashboardSkeleton,
} from "@/shared/components";

// Type for subcategory display in forms
interface Subcategory {
  name: string;
  description: string;
}

export default function Home() {
  // Use consolidated dashboard hook for data and state management
  const {
    // Context data
    categories,
    activeGroup,
    user,

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

    // Form state
    expenseForm: newExpense,
    settlementForm: newSettlement,
    manualSplitEdit,
    setManualSplitEdit,

    // Data operations
    addExpense,
    recordSettlement,

    // Form operations
    updateExpenseForm: setNewExpense,
    updateSettlementForm: setNewSettlement,
    prefillQuickSettle,

    // Display helpers
    getUserDisplayName,
    getStatsTitle,
    getMonthIcon,

    // Data refresh
    fetchDashboardData,
  } = useDashboard();

  const router = useRouter();
  const confirmation = useConfirmation();

  // Local UI state (dialogs and dropdowns)
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] =
    useState<any>(null);

  // Initialize Bootstrap dropdowns after component mounts
  useEffect(() => {
    const initDropdowns = () => {
      if (typeof window !== "undefined" && (window as any).bootstrap) {
        const dropdownElementList = document.querySelectorAll(
          '[data-bs-toggle="dropdown"]'
        );
        dropdownElementList.forEach((dropdownToggleEl) => {
          if (
            !(window as any).bootstrap.Dropdown.getInstance(dropdownToggleEl)
          ) {
            new (window as any).bootstrap.Dropdown(dropdownToggleEl);
          }
        });
      } else {
        setTimeout(initDropdowns, 100);
      }
    };
    initDropdowns();
  }, [dashboardData]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showUserDropdown && !target.closest(".dropdown")) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showUserDropdown]);

  // Data fetching is now handled by useDashboard hook

  // Formatting utilities
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  // getUserDisplayName, getStatsTitle, getMonthIcon are now provided by useDashboard hook

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Form handlers use the hook's mutation functions
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await addExpense();
    if (success) {
      setShowAddExpenseDialog(false);
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await recordSettlement();
    if (success) {
      setShowSettlementDialog(false);
    }
  };

  const handleQuickSettle = () => {
    if (prefillQuickSettle()) {
      setShowSettlementDialog(true);
    }
  };

  if (loading && !dashboardData) {
    return (
      <MainLayout>
        <DashboardSkeleton />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={() => fetchDashboardData(selectedUser)}
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MainLayout>
        <EmptyState
          icon="💰"
          title="Welcome to Spend Tracker"
          description="Start tracking your expenses by adding your first expense below."
          size="large"
          actions={[
            {
              label: "Add First Expense",
              onClick: () => setShowAddExpenseDialog(true),
              variant: "primary",
              icon: "plus",
            },
          ]}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          <PageHeader
            title="Dashboard"
            icon="bi bi-house-door"
            actions={
              <div className="dropdown">
                <button
                  className="btn btn-primary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded={showUserDropdown}
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                >
                  <i className="bi bi-person me-1"></i>
                  {getUserDisplayName()}
                </button>
                <ul
                  className={`dropdown-menu py-2 ${showUserDropdown ? "show" : ""}`}
                  style={{ zIndex: 1050 }}
                >
                  <li>
                    <button
                      className={`dropdown-item py-1 ${selectedUser === "all" ? "active" : ""}`}
                      onClick={() => {
                        setSelectedUser("all");
                        setShowUserDropdown(false);
                      }}
                    >
                      <i className="bi bi-people me-2"></i>
                      All Users
                    </button>
                  </li>
                  {user && (
                    <li>
                      <button
                        className={`dropdown-item py-1 ${selectedUser === user.id ? "active" : ""}`}
                        onClick={() => {
                          setSelectedUser(user.id);
                          setShowUserDropdown(false);
                        }}
                      >
                        <i className="bi bi-person-check me-2"></i>
                        Me
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            }
          />

          {/* Quick Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <StatsCard
                title={getStatsTitle("My Total Expenses")}
                value={formatCurrency(dashboardData.totalExpenses)}
                subtitle={`${dashboardData.totalExpenseCount} transactions`}
                icon="bi bi-currency-rupee"
                variant="primary"
                loading={loading}
                onClick={() => router.push("/expenses")}
              />
            </div>

            <div className="col-md-4 mb-3">
              <StatsCard
                title={getStatsTitle("My This Month")}
                value={formatCurrency(dashboardData.thisMonthTotal)}
                subtitle={`${dashboardData.thisMonthCount} expenses`}
                icon={getMonthIcon()}
                variant="success"
                loading={loading}
              />
            </div>

            <div className="col-md-4 mb-3">
              <StatsCard
                title="Categories"
                value={dashboardData.categoriesCount}
                subtitle="configured"
                icon="bi bi-tags"
                variant="warning"
                loading={loading}
                onClick={() => router.push("/categories")}
              />
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="row mb-4">
            <div className="col-md-8 mb-3 mb-md-0">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <h5 className="mb-0">
                    {selectedUser === "all"
                      ? "Recent Expenses"
                      : "My Recent Expenses"}
                  </h5>
                  <Link
                    href="/expenses"
                    className="btn btn-sm btn-outline-primary"
                  >
                    View All
                  </Link>
                </div>
                <div className="card-body p-0">
                  {dashboardData.recentExpenses.length === 0 ? (
                    <EmptyState
                      icon="📋"
                      title="No expenses yet"
                      description="Add your first expense to get started tracking."
                      size="small"
                      actions={[
                        {
                          label: "Add Expense",
                          onClick: () => setShowAddExpenseDialog(true),
                          variant: "primary",
                          icon: "plus",
                        },
                      ]}
                      showBorder={false}
                    />
                  ) : (
                    <Table
                      config={{
                        columns: [
                          {
                            key: "date",
                            header: "Date",
                            accessor: "date",
                            render: (value) => formatDate(value),
                          },
                          {
                            key: "description",
                            header: "Description",
                            accessor: "description",
                          },
                          {
                            key: "category",
                            header: "Category",
                            render: (value, row) => {
                              // Get category name from categories context
                              const category = categories.find(
                                (c) => c._id === row.category
                              );
                              const categoryName =
                                category?.name ||
                                row.categoryName ||
                                row.category;
                              return (
                                <Badge variant="secondary">
                                  {categoryName}
                                </Badge>
                              );
                            },
                          },
                          {
                            key: "amount",
                            header: "Amount",
                            accessor: "amount",
                            render: (value) => formatCurrency(value),
                          },
                          {
                            key: "paidBy",
                            header: selectedUser === "all" ? "Paid By" : "Type",
                            render: (value, row) => {
                              if (selectedUser === "all") {
                                // Get user name from users list
                                const user = dashboardData?.users?.find(
                                  (u) => u.id === row.paidBy
                                ) as any;
                                const userName = user?.name || row.paidBy;
                                return (
                                  <div className="align-items-center gap-1 flex-wrap">
                                    <UserBadge user={userName} />
                                    {user?.status === "left" && (
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
                              }
                              return (
                                <StatusBadge
                                  status={row.isSplit ? "split" : "personal"}
                                  type="split"
                                />
                              );
                            },
                          },
                          {
                            key: "actions",
                            header: "",
                            render: (value, row) => (
                              <div className="d-flex align-items-center justify-content-end gap-2 flex-wrap">
                                <span style={{ cursor: "default" }}>
                                  <StatusBadge
                                    status={row.isSplit ? "split" : "personal"}
                                    type="split"
                                    variant="small"
                                  />
                                </span>
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() =>
                                    setSelectedExpenseForDetails(row)
                                  }
                                  title="View Details"
                                >
                                  <i className="bi bi-eye"></i>
                                </button>
                              </div>
                            ),
                          },
                        ],
                        data: dashboardData.recentExpenses,
                        keyExtractor: (expense) => expense._id,
                        responsive: true,
                        size: "small",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">Quick Actions</h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowAddExpenseDialog(true)}
                    >
                      <i
                        className="bi bi-plus-circle me-2"
                        style={{ color: "#fff" }}
                      ></i>
                      Add Expense
                    </button>
                    {selectedUser === "all" && (
                      <>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setShowSettlementDialog(true)}
                        >
                          <i className="bi bi-currency-exchange me-2"></i>
                          Record Settlement
                        </button>
                        {settlementData &&
                          settlementData.balances &&
                          settlementData.balances.length > 0 && (
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => handleQuickSettle()}
                            >
                              <i className="bi bi-lightning-fill me-2"></i>
                              Quick Settle All
                            </button>
                          )}
                      </>
                    )}
                    <Link
                      href="/categories"
                      className="btn btn-outline-secondary"
                    >
                      <i className="bi bi-tags me-2"></i>
                      Manage Categories
                    </Link>
                    <Link href="/analytics" className="btn btn-outline-info">
                      <i className="bi bi-graph-up me-2"></i>
                      View Analytics
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Status - Only show when All Users is selected */}
          {selectedUser === "all" && settlementData && (
            <div className="row mb-4">
              <div className="col-md-8 mb-3 mb-md-0">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 className="mb-0">
                      <i className="bi bi-currency-exchange me-2"></i>
                      Settlement Status
                    </h6>
                    <Link
                      href="/settlements"
                      className="btn btn-sm btn-outline-primary"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    {settlementData.balances &&
                    settlementData.balances.length > 0 ? (
                      <Table
                        config={{
                          columns: [
                            {
                              key: "fromUser",
                              header: "From",
                              accessor: "fromUser",
                              render: (value) => (
                                <Badge variant="primary">{value}</Badge>
                              ),
                            },
                            {
                              key: "toUser",
                              header: "To",
                              accessor: "toUser",
                              render: (value) => (
                                <Badge variant="success">{value}</Badge>
                              ),
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              accessor: "amount",
                              render: (value) => (
                                <small
                                  className="fw-bold"
                                  style={{ color: "var(--status-error)" }}
                                >
                                  ₹{value}
                                </small>
                              ),
                            },
                            {
                              key: "status",
                              header: "Status",
                              accessor: "status",
                              render: (value) => (
                                <StatusBadge
                                  status={value || "owes"}
                                  type="settlement"
                                  variant="small"
                                />
                              ),
                            },
                          ],
                          data: (settlementData.balances || [])
                            .filter((balance) => balance.status === "owes")
                            .slice(0, 3),
                          keyExtractor: (balance, index) =>
                            `balance-${balance.fromUser}-${balance.toUser}-${index ?? 0}`,
                          responsive: true,
                          size: "small",
                        }}
                      />
                    ) : (
                      <EmptyState
                        icon="✅"
                        title="All Settled Up!"
                        description="No outstanding balances between users."
                        size="small"
                        variant="default"
                        showBorder={false}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h6 className="mb-0">Settlement Summary</h6>
                  </div>
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                      <small>Outstanding:</small>
                      <small
                        className="fw-bold"
                        style={{ color: "var(--status-error)" }}
                      >
                        ₹{settlementData.summary.totalOwed}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Settled:</small>
                      <small
                        className="fw-bold"
                        style={{ color: "var(--status-success)" }}
                      >
                        ₹{settlementData.summary.totalSettled}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Transactions:</small>
                      <small className="fw-bold">
                        {settlementData.summary.totalTransactions}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <small>Active:</small>
                      <small
                        className="fw-bold"
                        style={{ color: "var(--status-warning)" }}
                      >
                        {settlementData.summary.activeBalances}
                      </small>
                    </div>
                    <div className="d-grid">
                      <Link
                        href="/settlements"
                        className="btn btn-primary btn-sm"
                      >
                        <i className="bi bi-currency-exchange me-1"></i>
                        Manage Settlements
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Settlements - Only show when All Users is selected */}
          {selectedUser === "all" && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 className="mb-0">
                      <i className="bi bi-clock-history me-2"></i>
                      Recent Settlements
                    </h6>
                    <Link
                      href="/settlements"
                      className="btn btn-sm btn-outline-primary"
                    >
                      View All Settlements
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    {recentSettlements.length === 0 ? (
                      <EmptyState
                        icon="💼"
                        title="No settlements yet"
                        description="Record your first settlement to track balance history."
                        size="small"
                        actions={[
                          {
                            label: "Record Settlement",
                            onClick: () => setShowSettlementDialog(true),
                            variant: "primary",
                            icon: "plus",
                          },
                        ]}
                        showBorder={false}
                      />
                    ) : (
                      <Table
                        config={{
                          columns: [
                            {
                              key: "date",
                              header: "Date",
                              accessor: "date",
                              render: (value) => (
                                <small>{formatDate(value)}</small>
                              ),
                            },
                            {
                              key: "fromUser",
                              header: "From",
                              accessor: "fromUser",
                              render: (value, row: any) => {
                                const displayName = row.fromUserName || value;
                                return (
                                  <div className="d-flex justify-content-end justify-content-md-start align-items-center">
                                    <div className="avatar-xs bg-success text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                      {displayName?.charAt(0) ?? "?"}
                                    </div>
                                    <small>{displayName}</small>
                                  </div>
                                );
                              },
                            },
                            {
                              key: "toUser",
                              header: "To",
                              accessor: "toUser",
                              render: (value, row: any) => {
                                const displayName = row.toUserName || value;
                                return (
                                  <div className="d-flex justify-content-end justify-content-md-start align-items-center">
                                    <div className="avatar-xs bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                      {displayName?.charAt(0) ?? "?"}
                                    </div>
                                    <small>{displayName}</small>
                                  </div>
                                );
                              },
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              accessor: "amount",
                              render: (value) => (
                                <small
                                  className="fw-bold"
                                  style={{ color: "var(--status-success)" }}
                                >
                                  ₹{value}
                                </small>
                              ),
                            },
                            {
                              key: "description",
                              header: "Description",
                              accessor: "description",
                              render: (value) => (
                                <small
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {value || "Settlement payment"}
                                </small>
                              ),
                            },
                          ],
                          data: recentSettlements,
                          keyExtractor: (settlement) => settlement._id,
                          responsive: true,
                          size: "small",
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .avatar-sm {
          width: 30px;
          height: 30px;
          font-size: 12px;
          font-weight: bold;
        }
        .avatar-xs {
          width: 24px;
          height: 24px;
          font-size: 10px;
          font-weight: bold;
        }
      `}</style>
      <style jsx global>{`
        /* Fix for modal scrollability - keep modal scrollable */
        .modal-dialog-scrollable .modal-body {
          overflow-y: auto !important;
          overflow-x: hidden;
        }

        /* Ensure split records container has space for dropdowns */
        .split-records-container {
          min-height: 60px;
        }
      `}</style>
      {/* Add Expense Dialog */}
      <Modal
        show={showAddExpenseDialog}
        onClose={() => {
          setShowAddExpenseDialog(false);
          setManualSplitEdit(false);
        }}
        title="Add New Expense"
        size="md"
        scrollable={true}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowAddExpenseDialog(false);
                setManualSplitEdit(false);
              }}
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary d-inline-flex align-items-center justify-content-center"
              form="add-expense-form"
              disabled={operationLoading}
              aria-label="Add Expense"
              style={{ minWidth: 0 }}
            >
              {operationLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </button>
          </>
        }
      >
        <form id="add-expense-form" onSubmit={handleAddExpense}>
          <InputField
            label="Expense Name"
            type="text"
            id="expense-name"
            value={newExpense.name}
            onChange={(value) =>
              setNewExpense({ ...newExpense, name: value as string })
            }
            required
            placeholder="Enter expense name"
          />
          <InputField
            label="Amount"
            type="number"
            id="expense-amount"
            value={newExpense.amount}
            onChange={(value) => {
              const amount = value as string;
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
            placeholder="0.00"
            step="0.01"
          />
          <div className="mb-3">
            <label htmlFor="expense-category" className="form-label">
              Category <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              options={
                Array.isArray(categories) && categories.length > 0
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
              placeholder={
                !Array.isArray(categories) || categories.length === 0
                  ? "No categories available. Please add categories first."
                  : "Search and select a category..."
              }
              searchPlaceholder="Type to search categories..."
              id="expense-category"
              clearable={true}
              noOptionsMessage={
                !Array.isArray(categories) || categories.length === 0
                  ? "No categories found. Create categories in the Categories page."
                  : "No matching categories found"
              }
            />
            {(!Array.isArray(categories) || categories.length === 0) && (
              <small className="text-muted d-block mt-1">
                <i className="bi bi-info-circle me-1"></i>
                You need to create categories before adding expenses.{" "}
                <Link href="/categories" className="text-primary">
                  Go to Categories
                </Link>
              </small>
            )}
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
                setNewExpense({ ...newExpense, subcategory: value as string })
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
              options={
                dashboardData?.users?.map((user) => ({
                  value: user.id,
                  label: user.name,
                })) || []
              }
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
          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="expense-split"
                checked={newExpense.isSplit}
                onChange={(e) => {
                  const isSplit = e.target.checked;
                  const users = dashboardData?.users || [];
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
                    splitMode: "equal", // Default to equal split
                    splitAmounts,
                    manualSplitRecords: [{ id: "1", userId: "", amount: "" }], // Reset manual split records
                  });
                  // Reset manual edit flag when toggling split
                  setManualSplitEdit(false);
                }}
              />
              <label className="form-check-label" htmlFor="expense-split">
                Split this expense between users
              </label>
            </div>
          </div>

          {/* Split Mode Selection */}
          {newExpense.isSplit && dashboardData?.users && (
            <>
              <div className="mb-3">
                <label
                  htmlFor="splitModeEqual"
                  className="form-label fw-semibold"
                >
                  Split Mode
                </label>
                <div className="d-flex gap-3">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="splitMode"
                      id="splitModeEqual"
                      value="equal"
                      checked={newExpense.splitMode === "equal"}
                      onChange={() => {
                        const users = dashboardData?.users || [];
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
                        setManualSplitEdit(false);
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="splitModeEqual"
                    >
                      <i className="bi bi-pie-chart me-1"></i>
                      Equal Split
                    </label>
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="splitMode"
                      id="splitModeManual"
                      value="manual"
                      checked={newExpense.splitMode === "manual"}
                      onChange={() => {
                        setNewExpense({
                          ...newExpense,
                          splitMode: "manual",
                        });
                        setManualSplitEdit(true);
                      }}
                    />
                    <label
                      className="form-check-label"
                      htmlFor="splitModeManual"
                    >
                      <i className="bi bi-pencil me-1"></i>
                      Manual Split
                    </label>
                  </div>
                </div>
                <small className="text-muted">
                  {newExpense.splitMode === "equal"
                    ? "Amount will be divided equally among all group members"
                    : "Select users and specify amounts for each"}
                </small>
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
                      {dashboardData.users.length > 0
                        ? (
                            parseFloat(newExpense.amount || "0") /
                            dashboardData.users.length
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
                  {/* Header row */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span
                      className="form-label fw-semibold mb-0"
                      role="heading"
                      aria-level={6}
                    >
                      Manual Split Records
                    </span>
                    <span
                      className="badge rounded-pill"
                      style={{
                        backgroundColor: "var(--bs-secondary-bg, #e9ecef)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {
                        newExpense.manualSplitRecords.filter(
                          (r) => r.userId !== ""
                        ).length
                      }{" "}
                      / {(dashboardData?.users || []).length} users
                    </span>
                  </div>

                  {/* Column headers */}
                  <div
                    className="d-flex align-items-center gap-2 px-2 mb-1"
                    aria-hidden="true"
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <div style={{ flex: "1 1 0" }}>User</div>
                    <div style={{ width: "76px" }}>Amount (₹)</div>
                    <div style={{ width: "32px" }}></div>
                  </div>

                  {/* Records list */}
                  <div className="split-records-container" role="list">
                    {newExpense.manualSplitRecords.map((record, index) => {
                      const isLastRow =
                        index === newExpense.manualSplitRecords.length - 1;
                      const isPlaceholder =
                        isLastRow &&
                        record.userId === "" &&
                        record.amount === "";
                      const availableUsers = (
                        dashboardData?.users || []
                      ).filter(
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
                          role="listitem"
                          className="d-flex flex-row align-items-center gap-2 rounded px-2 py-2 mb-1"
                          style={{
                            border: isPlaceholder
                              ? "1px dashed var(--border-color)"
                              : "1px solid var(--border-color)",
                            backgroundColor: "var(--card-bg)",
                          }}
                        >
                          {/* User selector */}
                          <div style={{ flex: "1 1 0", minWidth: 0 }}>
                            <SearchableSelect
                              value={record.userId}
                              onChange={(value) => {
                                const newRecords = [
                                  ...newExpense.manualSplitRecords,
                                ];
                                newRecords[index].userId = value as string;
                                if (
                                  index ===
                                    newExpense.manualSplitRecords.length - 1 &&
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
                              options={availableUsers.map((user) => ({
                                label: user.name,
                                value: user.id,
                              }))}
                              placeholder={
                                isPlaceholder
                                  ? "+ Add another user…"
                                  : "Select user…"
                              }
                              searchPlaceholder="Search users..."
                              id={`user-select-${record.id}`}
                              noOptionsMessage="No users available"
                              clearable={!isPlaceholder}
                              aria-label={`Select user for split record ${index + 1}`}
                            />
                          </div>

                          {/* Amount input */}
                          <div style={{ width: "76px", flexShrink: 0 }}>
                            <div className="input-group input-group-sm">
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                step="0.01"
                                min="0"
                                id={`amount-${record.id}`}
                                autoComplete="off"
                                value={record.amount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const newRecords = [
                                    ...newExpense.manualSplitRecords,
                                  ];
                                  newRecords[index].amount = value;
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
                                aria-label={`Amount for split record ${index + 1}`}
                              />
                            </div>
                          </div>

                          {/* Delete button */}
                          <div
                            style={{ width: "32px", flexShrink: 0 }}
                            className="d-flex justify-content-end justify-content-md-center"
                          >
                            {canDelete ? (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  flexShrink: 0,
                                }}
                                onClick={() => {
                                  const newRecords =
                                    newExpense.manualSplitRecords.filter(
                                      (r) => r.id !== record.id
                                    );
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
                                title="Remove this record"
                                aria-label={`Remove split record ${index + 1}`}
                              >
                                <i
                                  className="bi bi-x-lg"
                                  style={{ fontSize: "0.7rem" }}
                                  aria-hidden="true"
                                ></i>
                              </button>
                            ) : (
                              <span
                                style={{
                                  width: "32px",
                                  display: "inline-block",
                                }}
                              ></span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total summary */}
                  {(() => {
                    const validRecords = newExpense.manualSplitRecords.filter(
                      (r) => r.userId !== "" && r.amount !== ""
                    );
                    const totalSplit = validRecords.reduce(
                      (sum, r) => sum + parseFloat(r.amount || "0"),
                      0
                    );
                    const totalExpense = parseFloat(newExpense.amount || "0");
                    const remaining = totalExpense - totalSplit;
                    const hasAmount = !!newExpense.amount && totalExpense > 0;
                    const isMatch = hasAmount && Math.abs(remaining) <= 0.01;
                    const hasRecords = validRecords.length > 0;

                    const borderColor = isMatch
                      ? "#198754"
                      : hasAmount && hasRecords
                        ? "#ffc107"
                        : "var(--border-color)";
                    const bgColor = isMatch
                      ? "rgba(25,135,84,0.07)"
                      : hasAmount && hasRecords
                        ? "rgba(255,193,7,0.07)"
                        : "var(--card-bg)";

                    return (
                      <div
                        className="mt-3 rounded px-3 py-2"
                        style={{
                          border: `1px solid ${borderColor}`,
                          backgroundColor: bgColor,
                          transition:
                            "background-color 0.2s, border-color 0.2s",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.04em",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Split Total
                          </span>
                          <div className="d-flex align-items-baseline gap-2">
                            <span
                              style={{
                                fontSize: "1rem",
                                fontWeight: 700,
                                color: isMatch
                                  ? "#198754"
                                  : "var(--text-primary)",
                              }}
                            >
                              ₹{totalSplit.toFixed(2)}
                            </span>
                            {hasAmount && (
                              <span
                                style={{
                                  fontSize: "0.82rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                / ₹{totalExpense.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        {hasAmount && hasRecords && !isMatch && (
                          <p
                            className="mb-0 mt-1"
                            style={{
                              fontSize: "0.78rem",
                              color: remaining > 0 ? "#856404" : "#dc3545",
                            }}
                          >
                            <i
                              className={`bi ${remaining > 0 ? "bi-exclamation-triangle" : "bi-exclamation-circle"} me-1`}
                              aria-hidden="true"
                            ></i>
                            {remaining > 0
                              ? `₹${remaining.toFixed(2)} still unallocated`
                              : `₹${Math.abs(remaining).toFixed(2)} over-allocated`}
                          </p>
                        )}
                        {isMatch && hasRecords && (
                          <p
                            className="mb-0 mt-1"
                            style={{ fontSize: "0.78rem", color: "#198754" }}
                          >
                            <i
                              className="bi bi-check-circle me-1"
                              aria-hidden="true"
                            ></i>
                            Amounts match perfectly
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* Old split details section - REMOVED */}
          <div className="mb-3">
            <label htmlFor="expense-date" className="form-label">
              Date
            </label>
            <input
              type="date"
              className="form-control"
              id="expense-date"
              value={newExpense.date}
              autoComplete="off"
              onChange={(e) =>
                setNewExpense({ ...newExpense, date: e.target.value })
              }
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="expense-description" className="form-label">
              Description (Optional)
            </label>
            <textarea
              className="form-control"
              id="expense-description"
              rows={3}
              value={newExpense.description}
              onChange={(e) =>
                setNewExpense({ ...newExpense, description: e.target.value })
              }
            ></textarea>
          </div>
        </form>
      </Modal>{" "}
      {/* Settlement Dialog */}
      <Modal
        show={showSettlementDialog}
        onClose={() => setShowSettlementDialog(false)}
        title="Record Settlement"
        size="md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowSettlementDialog(false)}
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary d-inline-flex align-items-center justify-content-center"
              form="settlement-form"
              disabled={operationLoading}
              aria-label="Record Settlement"
              style={{ minWidth: "160px" }}
            >
              {operationLoading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Recording...
                </>
              ) : (
                "Record Settlement"
              )}
            </button>
          </>
        }
      >
        <form id="settlement-form" onSubmit={handleRecordSettlement}>
          <div className="mb-3">
            <label htmlFor="settlement-from" className="form-label">
              From <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              options={
                dashboardData?.users?.map((user) => ({
                  value: user.id,
                  label: user.name,
                })) || []
              }
              value={newSettlement.from}
              onChange={(value) => {
                const newFrom = value as string;
                setNewSettlement({
                  ...newSettlement,
                  from: newFrom,
                  // Clear "to" if it's the same as the new "from"
                  to: newSettlement.to === newFrom ? "" : newSettlement.to,
                });
              }}
              placeholder="Search and select who is paying..."
              searchPlaceholder="Type to search users..."
              id="settlement-from"
              clearable={true}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="settlement-to" className="form-label">
              To <span className="text-danger">*</span>
            </label>
            <SearchableSelect
              options={
                dashboardData?.users
                  ?.filter((user) => user.id !== newSettlement.from)
                  .map((user) => ({
                    value: user.id,
                    label: user.name,
                  })) || []
              }
              value={newSettlement.to}
              onChange={(value) =>
                setNewSettlement({ ...newSettlement, to: value as string })
              }
              placeholder="Search and select who is receiving..."
              searchPlaceholder="Type to search users..."
              id="settlement-to"
              clearable={true}
            />
          </div>
          <InputField
            label="Amount"
            type="number"
            id="settlement-amount"
            value={newSettlement.amount}
            onChange={(value) =>
              setNewSettlement({ ...newSettlement, amount: value as string })
            }
            required
            placeholder="0.00"
            step="0.01"
          />
          <SelectField
            label="Status"
            id="settlement-status"
            value={newSettlement.status}
            onChange={(value) =>
              setNewSettlement({
                ...newSettlement,
                status: value as "pending" | "completed",
              })
            }
            required
            options={[
              { label: "Pending", value: "pending" },
              { label: "Completed", value: "completed" },
            ]}
          />
          <DateField
            label="Date"
            id="settlement-date"
            value={newSettlement.date}
            onChange={(value) =>
              setNewSettlement({ ...newSettlement, date: value as string })
            }
            required
          />
          <TextareaField
            label="Description (Optional)"
            id="settlement-description"
            value={newSettlement.description}
            onChange={(value) =>
              setNewSettlement({
                ...newSettlement,
                description: value as string,
              })
            }
            rows={3}
            placeholder="Optional settlement notes"
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
            <div className="d-flex align-items-center">
              <LoadingSpinner
                config={{ size: "small", showText: false }}
                className="me-2"
              />
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}
      {/* Expense Details Modal */}
      <ExpenseDetailsModal
        expense={selectedExpenseForDetails}
        onClose={() => setSelectedExpenseForDetails(null)}
        users={dashboardData?.users || []}
        categories={categories}
        infoCardColumns={3}
      />
    </MainLayout>
  );
}
