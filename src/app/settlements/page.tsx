"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useGroup } from "@/contexts/GroupContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { formatDate } from "@/lib/utils";
import { SettlementsDataSource, ApiError } from "@/datasource";
import { simplifyBalances } from "@/lib/utils/settlements";
import {
  Modal,
  FilterPanel,
  StatusBadge,
  LoadingSpinner,
  SelectField,
  InputField,
  DateField,
  TextareaField,
  ExportButton,
  SearchableSelect,
  PageHeader,
  SectionHeader,
  AlertCard,
  SettlementsSkeleton,
} from "@/shared/components";
import { TableCard } from "@/shared/components/Card/TableCard";

interface Settlement {
  _id: string;
  expenseId?: string;
  fromUser: string;
  toUser: string;
  fromUserName?: string;
  toUserName?: string;
  amount: number;
  description?: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
}

interface Balance {
  fromUser: string;
  toUser: string;
  amount: number;
  status: "owes" | "settled";
}

interface BalanceData {
  balances: Balance[];
  summary: {
    totalOwed: number;
    totalSettled: number;
    totalTransactions: number;
    activeBalances: number;
  };
}

const SettlementsPage: React.FC = () => {
  const { notifyError, notifyDeleted, notifyAdded } =
    useOperationNotification();
  const { activeGroup, getGroupMembers } = useGroup();
  const confirmation = useConfirmation();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>(
    []
  );
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    fromUser: "",
    toUser: "",
    status: "",
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc",
  });

  // Record Settlement Dialog states
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(
    null
  );
  const [newSettlement, setNewSettlement] = useState({
    from: "",
    to: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    status: "pending" as "pending" | "completed",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<
    Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
      joinedAt: Date;
    }>
  >([]);

  // Get users from active group members (either from activeGroup or fetched members)
  const users =
    (activeGroup?.members || groupMembers)?.map((member) => ({
      id: member.userId,
      name: ("name" in member ? member.name : member.userId) || member.userId, // Use name if available, fallback to userId
    })) || [];

  // Helper to resolve userId to display name
  const getUserDisplayName = (userId: string, fallbackName?: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.name || fallbackName || userId;
  };

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

  // Fetch data on mount and whenever the active group changes (handles page refresh
  // where GroupContext hydrates asynchronously after the initial render)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?._id]); // Re-run when group becomes available or switches

  const applyFilters = useCallback(() => {
    // Safety check: ensure settlements is an array
    if (!Array.isArray(settlements)) {
      setFilteredSettlements([]);
      return;
    }

    let filtered = [...settlements];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.description
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          settlement.fromUser
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          settlement.toUser.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // From user filter
    if (filters.fromUser) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.fromUser.toLowerCase() === filters.fromUser.toLowerCase()
      );
    }

    // To user filter
    if (filters.toUser) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.toUser.toLowerCase() === filters.toUser.toLowerCase()
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.status?.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Date range filters
    if (filters.startDate) {
      filtered = filtered.filter(
        (settlement) => new Date(settlement.date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (settlement) => new Date(settlement.date) <= new Date(filters.endDate)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;

      switch (filters.sortBy) {
        case "date":
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "fromUser":
          aValue = a.fromUser.toLowerCase();
          bValue = b.fromUser.toLowerCase();
          break;
        case "toUser":
          aValue = a.toUser.toLowerCase();
          bValue = b.toUser.toLowerCase();
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (filters.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSettlements(filtered);
  }, [settlements, filters]);

  useEffect(() => {
    // Apply filters whenever settlements or filters change
    applyFilters();
  }, [settlements, filters, applyFilters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Sort handlers - commented out for future use
  // const handleSort = (column: string) => {
  //   const newOrder =
  //     filters.sortBy === column && filters.sortOrder === "desc"
  //       ? "asc"
  //       : "desc";
  //   setFilters((prev) => ({ ...prev, sortBy: column, sortOrder: newOrder }));
  // };

  // const getSortIcon = (column: string) => {
  //   if (filters.sortBy !== column) return "bi-arrow-down-up";
  //   return filters.sortOrder === "asc" ? "bi-arrow-up" : "bi-arrow-down";
  // };

  // Fetch settlements and balances via datasource layer
  const fetchData = async () => {
    if (!activeGroup?._id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [settlementsData, balancesData] = await Promise.all([
        SettlementsDataSource.getSettlements(activeGroup._id),
        SettlementsDataSource.getBalances(activeGroup._id),
      ]);

      // Extract settlements array from API response (unwrapped: { settlements, pagination })
      const settlementsResponse = settlementsData as any;
      const settlementsArray = Array.isArray(settlementsResponse?.settlements)
        ? settlementsResponse.settlements
        : Array.isArray(settlementsResponse)
          ? settlementsResponse
          : [];
      setSettlements(settlementsArray as Settlement[]);

      // Update pagination from API response
      if (settlementsResponse?.pagination) {
        setPagination(settlementsResponse.pagination);
      }

      // The API returns balances in the data.balances array with fromUserName and toUserName
      const balanceResponse = balancesData as any;
      const apiBalances = Array.isArray(balanceResponse?.balances)
        ? balanceResponse.balances
        : [];
      const summaryData = balanceResponse?.summary || {};

      // Map API field names then simplify (merge duplicates, N-1 optimisation)
      const mapped = apiBalances.map((b: any) => ({
        fromUser: b.fromUserName || b.fromUser || "",
        toUser: b.toUserName || b.toUser || "",
        amount: b.amount || 0,
        status: (b.status || "owes") as "owes" | "settled",
      }));
      const simplified = simplifyBalances(mapped);

      setBalances({
        balances: simplified,
        summary: {
          totalOwed: summaryData.totalOwed || 0,
          totalSettled: summaryData.totalSettled || 0,
          totalTransactions: summaryData.totalTransactions || 0,
          activeBalances: summaryData.activeBalances || 0,
        },
      });
    } catch (error) {
      setError(error instanceof ApiError ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Optimized refresh for partial updates after CRUD operations
  const refreshSettlements = async () => {
    if (!activeGroup?._id) return;

    try {
      const [settlementsData, balancesData] = await Promise.all([
        SettlementsDataSource.getSettlements(activeGroup._id),
        SettlementsDataSource.getBalances(activeGroup._id),
      ]);

      // Update state without loading indicators for smoother UX
      const settlementsResponse = settlementsData as any;
      const settlementsArray = Array.isArray(settlementsResponse?.settlements)
        ? settlementsResponse.settlements
        : Array.isArray(settlementsResponse)
          ? settlementsResponse
          : [];
      setSettlements(settlementsArray as Settlement[]);

      // Update pagination from API response
      if (settlementsResponse?.pagination) {
        setPagination(settlementsResponse.pagination);
      }

      // The API returns balances in the data.balances array with fromUserName and toUserName
      const balanceResponse = balancesData as any;
      const apiBalances = Array.isArray(balanceResponse?.balances)
        ? balanceResponse.balances
        : [];
      const summaryData = balanceResponse?.summary || {};

      // Map API field names then simplify (merge duplicates, N-1 optimisation)
      const mapped = apiBalances.map((b: any) => ({
        fromUser: b.fromUserName || b.fromUser || "",
        toUser: b.toUserName || b.toUser || "",
        amount: b.amount || 0,
        status: (b.status || "owes") as "owes" | "settled",
      }));
      const simplified = simplifyBalances(mapped);

      setBalances({
        balances: simplified,
        summary: {
          totalOwed: summaryData.totalOwed || 0,
          totalSettled: summaryData.totalSettled || 0,
          totalTransactions: summaryData.totalTransactions || 0,
          activeBalances: summaryData.activeBalances || 0,
        },
      });
    } catch {
      // Fall back to full refresh if partial update fails
      await fetchData();
    }
  };

  // Create or update settlement via datasource layer
  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setOperationLoading(true);

    if (!activeGroup?._id) {
      setSubmitError("No active group selected");
      setOperationLoading(false);
      return;
    }

    // Validation: Check if from and to users are the same
    if (newSettlement.from === newSettlement.to) {
      setSubmitError("From and To users cannot be the same person");
      setOperationLoading(false);
      return;
    }

    // Validation: Check if amount is valid
    const amount = parseFloat(newSettlement.amount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("Please enter a valid amount greater than 0");
      setOperationLoading(false);
      return;
    }

    try {
      const settlementData = {
        fromUser: newSettlement.from,
        toUser: newSettlement.to,
        amount: amount,
        date: newSettlement.date,
        description: newSettlement.description,
      };

      if (editingSettlement) {
        await SettlementsDataSource.updateSettlement(
          activeGroup._id,
          editingSettlement._id,
          { _id: editingSettlement._id, ...settlementData }
        );
      } else {
        await SettlementsDataSource.createSettlement(
          activeGroup._id,
          settlementData
        );
      }

      // Close dialog and reset form
      setShowSettlementDialog(false);
      setEditingSettlement(null);
      setNewSettlement({
        from: "",
        to: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        status: "pending",
      });
      setSubmitError(null);

      // Refresh data with optimized approach
      await refreshSettlements();

      // Show success notification
      if (editingSettlement) {
        notifyAdded("Settlement updated");
      } else {
        notifyAdded("Settlement");
      }
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : `Error ${editingSettlement ? "updating" : "recording"} settlement`;
      setSubmitError(errorMessage);
      notifyError(editingSettlement ? "Update" : "Create", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditSettlement = (settlement: Settlement) => {
    // Find user IDs from names - settlements now store IDs directly
    const getUserId = (userId: string) => {
      // If it's already a valid userId in our users list, use it directly
      const user = users.find((u) => u.id === userId);
      if (user) return user.id;
      // Fallback: try matching by name for legacy data
      const userByName = users.find(
        (u) => u.name.toLowerCase() === userId.toLowerCase()
      );
      return userByName?.id || userId;
    };

    // Map status to form-compatible values
    const formStatus: "pending" | "completed" =
      settlement.status === "completed" ? "completed" : "pending";

    setEditingSettlement(settlement);
    setNewSettlement({
      from: getUserId(settlement.fromUser),
      to: getUserId(settlement.toUser),
      amount: settlement.amount.toString(),
      date: new Date(settlement.date).toISOString().split("T")[0],
      description: settlement.description || "",
      status: formStatus,
    });
    setShowSettlementDialog(true);
  };

  const handleCloseDialog = () => {
    setShowSettlementDialog(false);
    setEditingSettlement(null);
    setNewSettlement({
      from: "",
      to: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      status: "pending",
    });
    setSubmitError(null);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    const confirmed = await confirmation.confirm({
      title: "Delete Settlement",
      message:
        "Are you sure you want to delete this settlement? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    if (!activeGroup?._id) {
      notifyError("Delete", "No active group selected");
      return;
    }

    setOperationLoading(true);

    try {
      await SettlementsDataSource.deleteSettlement(
        activeGroup._id,
        settlementId
      );
      // Refresh data with optimized approach
      await refreshSettlements();
      notifyDeleted("Settlement");
    } catch (error) {
      const errorMessage =
        error instanceof ApiError
          ? error.message
          : "Failed to delete settlement";
      notifyError("Delete", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <SettlementsSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            {/* Header Section */}
            <PageHeader
              title="Settlements"
              icon="bi bi-currency-exchange"
              actions={
                <button
                  onClick={() => setShowSettlementDialog(true)}
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Record Settlement
                </button>
              }
            />

            {error && (
              <AlertCard
                variant="danger"
                icon="bi bi-exclamation-triangle"
                dismissible
                onClose={() => setError(null)}
              >
                {error}
              </AlertCard>
            )}

            {/* Summary Statistics */}
            {balances?.summary && (
              <div className="row mb-3">
                <div className="col-md-3">
                  <AlertCard variant="danger" size="md" borderOnly centered>
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-exclamation-triangle fs-5 me-2"></i>
                      <div>
                        <h5 className="mb-0">₹{balances.summary.totalOwed}</h5>
                        <small style={{ color: "var(--text-secondary)" }}>
                          Outstanding
                        </small>
                      </div>
                    </div>
                  </AlertCard>
                </div>
                <div className="col-md-3">
                  <AlertCard variant="success" size="md" borderOnly centered>
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-check-circle fs-5 me-2"></i>
                      <div>
                        <h5 className="mb-0">
                          ₹{balances.summary.totalSettled}
                        </h5>
                        <small style={{ color: "var(--text-secondary)" }}>
                          Settled
                        </small>
                      </div>
                    </div>
                  </AlertCard>
                </div>
                <div className="col-md-3">
                  <AlertCard variant="primary" size="md" borderOnly centered>
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-receipt fs-5 me-2"></i>
                      <div>
                        <h5
                          className="mb-0"
                          aria-label={`${balances.summary.totalTransactions} transactions`}
                        >
                          {balances.summary.totalTransactions}
                        </h5>
                        <small style={{ color: "var(--text-secondary)" }}>
                          Transactions
                        </small>
                      </div>
                    </div>
                  </AlertCard>
                </div>
                <div className="col-md-3">
                  <AlertCard variant="warning" size="md" borderOnly centered>
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-hourglass-split fs-5 me-2"></i>
                      <div>
                        <h5
                          className="mb-0"
                          aria-label={`${balances.summary.activeBalances} active balances`}
                        >
                          {balances.summary.activeBalances}
                        </h5>
                        <small style={{ color: "var(--text-secondary)" }}>
                          Active
                        </small>
                      </div>
                    </div>
                  </AlertCard>
                </div>
              </div>
            )}

            {/* Current Balances */}
            {balances?.balances && balances.balances.length > 0 && (
              <div className="mb-3 outstanding-balances-section">
                <SectionHeader
                  title="Outstanding Balances"
                  icon="bi bi-balance-scale"
                  marginBottom={true}
                />
                <div className="outstanding-balances-table">
                  <TableCard<Balance>
                    data={balances.balances.filter(
                      (balance) => balance.status === "owes"
                    )}
                    columns={[
                      {
                        key: "fromUser",
                        label: "From",
                        render: (balance: Balance) => (
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-xs bg-danger text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{
                                width: "24px",
                                height: "24px",
                                fontSize: "10px",
                              }}
                            >
                              {balance.fromUser.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {balance.fromUser.charAt(0).toUpperCase() +
                                balance.fromUser.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "toUser",
                        label: "To",
                        render: (balance: Balance) => (
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{
                                width: "24px",
                                height: "24px",
                                fontSize: "10px",
                              }}
                            >
                              {balance.toUser.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {balance.toUser.charAt(0).toUpperCase() +
                                balance.toUser.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "amount",
                        label: "Amount",
                        render: (balance: Balance) => (
                          <span
                            className="fw-bold"
                            style={{ color: "var(--status-error)" }}
                          >
                            ₹{balance.amount}
                          </span>
                        ),
                      },
                    ]}
                    mobileCardRender={(balance: Balance) => ({
                      title: `${balance.fromUser
                        .charAt(0)
                        .toUpperCase()}${balance.fromUser
                        .slice(1)
                        .toLowerCase()} owes ${balance.toUser
                        .charAt(0)
                        .toUpperCase()}${balance.toUser.slice(1).toLowerCase()}`,
                      amount: `₹${balance.amount}`,
                    })}
                    emptyMessage="All settled up!"
                  />
                </div>
              </div>
            )}

            {balances && balances.balances.length === 0 && (
              <div className="card mb-3">
                <div className="card-body text-center py-5">
                  <i
                    className="bi bi-check-circle-fill display-1"
                    style={{ color: "var(--status-success)" }}
                  ></i>
                  <h4
                    className="mt-3"
                    style={{ color: "var(--status-success)" }}
                  >
                    All Settled Up!
                  </h4>
                  <p style={{ color: "var(--text-secondary)" }}>
                    No outstanding balances between users
                  </p>
                </div>
              </div>
            )}

            {/* Filters */}
            <FilterPanel
              filters={[
                {
                  key: "search",
                  type: "text",
                  label: "Search",
                  placeholder: "Search settlements...",
                  colSize: 2.5,
                },
                {
                  key: "fromUser",
                  type: "select",
                  label: "From User",
                  options: [
                    { label: "All From Users", value: "" },
                    ...users.map((user) => ({
                      label: user.name,
                      value: user.name,
                    })),
                  ],
                  colSize: 1.5,
                },
                {
                  key: "toUser",
                  type: "select",
                  label: "To User",
                  options: [
                    { label: "All To Users", value: "" },
                    ...users.map((user) => ({
                      label: user.name,
                      value: user.name,
                    })),
                  ],
                  colSize: 1.5,
                },
                {
                  key: "status",
                  type: "select",
                  label: "Status",
                  options: [
                    { label: "All Status", value: "" },
                    { label: "Pending", value: "pending" },
                    { label: "Completed", value: "completed" },
                    { label: "Cancelled", value: "cancelled" },
                  ],
                  colSize: 1.5,
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
                  fromUser: "",
                  toUser: "",
                  status: "",
                  startDate: "",
                  endDate: "",
                  sortBy: "date",
                  sortOrder: "desc",
                });
              }}
            />

            {/* Full Settlement Table */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">
                  <i className="bi bi-table me-2"></i>
                  All Settlements
                </h5>
                <ExportButton
                  endpoint="/api/settlements/export"
                  params={filters}
                  label="Export"
                  variant="outline-secondary"
                  icon="bi-download"
                  size="sm"
                />
              </div>
              <TableCard<Settlement>
                data={filteredSettlements}
                columns={[
                  {
                    key: "date",
                    label: "Date",
                    render: (settlement: Settlement) => (
                      <span style={{ color: "var(--text-secondary)" }}>
                        {formatDate(settlement.date)}
                      </span>
                    ),
                  },
                  {
                    key: "fromUser",
                    label: "From",
                    render: (settlement: Settlement) => {
                      const displayName = getUserDisplayName(
                        settlement.fromUser,
                        settlement.fromUserName
                      );
                      return (
                        <div className="d-flex align-items-center">
                          <div
                            className="avatar-xs bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                            style={{
                              width: "24px",
                              height: "24px",
                              fontSize: "10px",
                            }}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <span>
                            {displayName.charAt(0).toUpperCase() +
                              displayName.slice(1).toLowerCase()}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: "toUser",
                    label: "To",
                    render: (settlement: Settlement) => {
                      const displayName = getUserDisplayName(
                        settlement.toUser,
                        settlement.toUserName
                      );
                      return (
                        <div className="d-flex align-items-center">
                          <div
                            className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                            style={{
                              width: "24px",
                              height: "24px",
                              fontSize: "10px",
                            }}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <span>
                            {displayName.charAt(0).toUpperCase() +
                              displayName.slice(1).toLowerCase()}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: "amount",
                    label: "Amount",
                    render: (settlement: Settlement) => (
                      <span
                        className="fw-bold"
                        style={{ color: "var(--status-success)" }}
                      >
                        ₹{settlement.amount}
                      </span>
                    ),
                  },
                  {
                    key: "description",
                    label: "Description",
                    render: (settlement: Settlement) => (
                      <span style={{ color: "var(--text-secondary)" }}>
                        {settlement.description || "Settlement payment"}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: "Status",
                    render: (settlement: Settlement) => (
                      <StatusBadge
                        status={settlement.status || "settled"}
                        type="settlement"
                      />
                    ),
                  },
                ]}
                actions={[
                  {
                    label: "",
                    icon: "bi-pencil",
                    onClick: (settlement: Settlement) =>
                      handleEditSettlement(settlement),
                    variant: "secondary",
                  },
                  {
                    label: "",
                    icon: "bi-trash",
                    onClick: (settlement: Settlement) =>
                      handleDeleteSettlement(settlement._id),
                    variant: "danger",
                  },
                ]}
                mobileCardRender={(settlement: Settlement) => {
                  const fromName = getUserDisplayName(
                    settlement.fromUser,
                    settlement.fromUserName
                  );
                  const toName = getUserDisplayName(
                    settlement.toUser,
                    settlement.toUserName
                  );
                  return {
                    title: `${fromName.charAt(0).toUpperCase()}${fromName
                      .slice(1)
                      .toLowerCase()} → ${toName
                      .charAt(0)
                      .toUpperCase()}${toName.slice(1).toLowerCase()}`,
                    subtitle: formatDate(settlement.date),
                    amount: `₹${settlement.amount}`,
                    meta: settlement.description || "Settlement payment",
                    badge: (
                      <StatusBadge
                        status={settlement.status || "pending"}
                        type="settlement"
                      />
                    ),
                  };
                }}
                emptyMessage="No settlements found"
                emptyAction={{
                  label: "Record Settlement",
                  onClick: () => setShowSettlementDialog(true),
                }}
                loading={loading}
              />

              {/* Pagination Controls */}
              {filteredSettlements.length > 0 && pagination.pages > 1 && (
                <div className="pagination-controls d-flex justify-content-between align-items-center mt-3">
                  <div
                    className="pagination-info"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(
                      pagination.page * pagination.limit,
                      filteredSettlements.length
                    )}{" "}
                    of {filteredSettlements.length} settlements
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
            </div>
          </div>
        </div>

        <style jsx>{`
          .avatar-circle {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
          }
          .card {
            transition: all 0.2s ease-in-out;
          }
          .cursor-pointer {
            cursor: pointer;
          }
          .user-select-none {
            user-select: none;
          }
          .card:hover {
            box-shadow: var(--shadow-md) !important;
          }
          .dropdown-menu {
            z-index: 1060 !important;
            position: absolute !important;
            transform: translateY(-50%) !important;
            box-shadow: var(--shadow-lg) !important;
            border: 1px solid var(--border-secondary) !important;
          }
          .dropdown.show .dropdown-menu {
            display: block !important;
            z-index: 1060 !important;
          }
          .table-responsive {
            overflow-x: auto;
          }
          .table {
            position: relative;
          }
          .table tbody tr {
            position: relative;
          }
          .table tbody tr:hover {
            z-index: 10;
          }
          .dropdown {
            position: static !important;
          }
          .dropdown-toggle::after {
            display: none;
          }

          /* Mobile and Tablet styles for Outstanding Balances */
          .outstanding-balances-section {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
          }

          @media (max-width: 1024px) {
            .outstanding-balances-table
              :global(div[class*="cardHeader"]:first-child) {
              padding: 0;
            }
          }

          /* Mobile and Tablet styles for Filters */
          @media (max-width: 768px) {
            /* Make filter inputs stack properly on mobile */
            :global(.card .card-body .row.g-3) > div {
              flex: 0 0 100%;
              max-width: 100%;
            }

            /* Ensure form controls take full width */
            :global(.form-control),
            :global(.form-select) {
              width: 100%;
            }

            /* Adjust card padding on mobile */
            :global(.card .card-body) {
              padding: 1rem;
            }
          }
        `}</style>

        {/* Record Settlement Dialog */}
        <Modal
          show={showSettlementDialog}
          onClose={handleCloseDialog}
          title={editingSettlement ? "Edit Settlement" : "Record Settlement"}
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
                form="settlement-form"
                className="btn btn-primary d-inline-flex align-items-center justify-content-center"
                disabled={operationLoading}
                aria-label={
                  editingSettlement ? "Update Settlement" : "Record Settlement"
                }
                style={{ minWidth: "160px" }}
              >
                {operationLoading ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    {editingSettlement ? "Updating..." : "Recording..."}
                  </>
                ) : editingSettlement ? (
                  "Update Settlement"
                ) : (
                  "Record Settlement"
                )}
              </button>
            </>
          }
        >
          <form id="settlement-form" onSubmit={handleRecordSettlement}>
            {submitError && (
              <div className="alert alert-danger" role="alert">
                {submitError}
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="settlement-from" className="form-label">
                From <span className="text-danger">*</span>
              </label>
              <SearchableSelect
                options={users.map((user) => ({
                  value: user.id,
                  label: user.name,
                }))}
                value={newSettlement.from}
                onChange={(newFrom) => {
                  // If the selected 'from' is the same as 'to', clear 'to'
                  const updatedTo =
                    newFrom === newSettlement.to ? "" : newSettlement.to;
                  setNewSettlement({
                    ...newSettlement,
                    from: newFrom as string,
                    to: updatedTo,
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
                options={users
                  .filter((user) => user.id !== newSettlement.from)
                  .map((user) => ({
                    value: user.id,
                    label: user.name,
                  }))}
                value={newSettlement.to}
                onChange={(value) =>
                  setNewSettlement({
                    ...newSettlement,
                    to: value as string,
                  })
                }
                placeholder="Search and select who will receive..."
                searchPlaceholder="Type to search users..."
                id="settlement-to"
                clearable={true}
              />
            </div>
            <InputField
              label="Amount"
              type="number"
              step="0.01"
              value={newSettlement.amount}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  amount: value,
                })
              }
              required
              id="settlement-amount"
            />
            <SelectField
              label="Status"
              value={newSettlement.status}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  status: value as "pending" | "completed",
                })
              }
              options={[
                { label: "Pending", value: "pending" },
                { label: "Completed", value: "completed" },
              ]}
              required
              id="settlement-status"
            />
            <DateField
              label="Date"
              value={newSettlement.date}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  date: value,
                })
              }
              required
              id="settlement-date"
            />
            <TextareaField
              label="Description (Optional)"
              rows={3}
              value={newSettlement.description}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  description: value,
                })
              }
              placeholder="Optional note about this settlement..."
              id="settlement-description"
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
      </div>
    </MainLayout>
  );
};

export default SettlementsPage;
