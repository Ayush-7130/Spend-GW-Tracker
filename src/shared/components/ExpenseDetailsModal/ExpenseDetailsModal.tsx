/**
 * ExpenseDetailsModal Component
 *
 * A reusable modal to display detailed expense information including split details.
 * Can be used across different pages (Dashboard, Expenses, Analytics, etc.)
 *
 * @example
 * ```tsx
 * <ExpenseDetailsModal
 *   expense={selectedExpense}
 *   onClose={() => setSelectedExpense(null)}
 *   users={groupMembers}
 *   categories={allCategories}
 * />
 * ```
 */

"use client";

import React from "react";
import {
  Modal,
  Badge,
  StatusBadge,
  UserBadge,
  Table,
  InfoCard,
  SectionHeader,
  AlertCard,
} from "@/shared/components";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

export interface ExpenseDetails {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
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
  categoryDetails?: Array<{ name: string }>;
}

export interface ExpenseDetailsModalProps {
  /** The expense to display. When null, modal is hidden */
  expense: ExpenseDetails | null;
  /** Callback when modal is closed */
  onClose: () => void;
  /** List of users to resolve user IDs to names */
  users?: Array<{ id: string; name: string; status?: string }>;
  /** List of categories to resolve category IDs to names */
  categories?: Array<{ _id: string; name: string }>;
  /** Grid layout configuration: number of columns for InfoCards (default: 3 for 3x1, use 2 for 2x2) */
  infoCardColumns?: 2 | 3 | 4;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  expense,
  onClose,
  users = [],
  categories = [],
  infoCardColumns = 3,
}) => {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  if (!expense) return null;

  // Calculate responsive column classes based on infoCardColumns prop
  const getColClass = () => {
    switch (infoCardColumns) {
      case 2:
        return "col-md-6 col-sm-6"; // 2 columns on medium+, 2 on small
      case 4:
        return "col-md-3 col-sm-6"; // 4 columns on medium+, 2 on small
      case 3:
      default:
        return "col-md-4 col-sm-4"; // 3 columns on medium+, 3 on small
    }
  };

  const colClass = getColClass();

  // Helper to get user name from ID
  const getUserName = (userId: string): string => {
    const user = users.find((u) => u.id === userId);
    return user?.name || userId;
  };

  // Helper to check if paidBy user has left the group
  const isPaidByFormerMember = (userId: string): boolean => {
    const user = users.find((u) => u.id === userId);
    return user?.status === "left";
  };

  // Helper to get category name from ID
  const getCategoryName = (categoryId: string): string => {
    // First check if expense has categoryDetails
    if (expense.categoryDetails && expense.categoryDetails.length > 0) {
      return expense.categoryDetails[0].name;
    }
    // Otherwise lookup from categories prop
    const category = categories.find((c) => c._id === categoryId);
    return category?.name || categoryId;
  };

  return (
    <Modal
      show={!!expense}
      onClose={onClose}
      title="Expense Details"
      size="md"
      footer={
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="expense-details">
        {/* Basic Information Section */}
        <div
          className="mb-3 pb-3"
          style={{ borderBottom: `1px solid ${colors.border.primary}` }}
        >
          <div className="row g-2">
            <div className="col-12">
              <div className="d-flex align-items-center justify-content-between gap-3">
                <div className="d-flex align-items-center flex-grow-1">
                  <div className="flex-shrink-0 me-2">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: colors.button.primary.background,
                        color: colors.text.inverse,
                      }}
                    >
                      <i className="bi bi-receipt"></i>
                    </div>
                  </div>
                  <div className="flex-grow-1">
                    <h5
                      className="mb-0"
                      style={{
                        color: colors.text.primary,
                        fontSize: "1.1rem",
                        lineHeight: "1.3",
                      }}
                    >
                      {expense.description}
                    </h5>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span
                    className="fs-4 fw-bold"
                    style={{
                      color: colors.button.primary.background,
                      whiteSpace: "nowrap",
                      lineHeight: "1",
                    }}
                  >
                    {formatCurrency(expense.amount)}
                  </span>
                  <StatusBadge
                    status={expense.isSplit ? "split" : "personal"}
                    type="split"
                    variant="small"
                  />
                </div>
              </div>
            </div>

            <div className={colClass}>
              <InfoCard
                icon="bi bi-calendar3"
                label="Date"
                value={formatDate(expense.date)}
                size="md"
              />
            </div>

            <div className={colClass}>
              <InfoCard
                icon="bi bi-tag"
                label="Category"
                value={
                  <Badge variant="secondary" size="sm">
                    {getCategoryName(expense.category)}
                  </Badge>
                }
                size="md"
              />
            </div>

            <div className={colClass}>
              <InfoCard
                icon="bi bi-person-circle"
                label="Paid By"
                value={
                  <div className="d-flex align-items-center gap-1 flex-wrap">
                    <UserBadge
                      user={getUserName(expense.paidBy)}
                      variant="small"
                    />
                    {isPaidByFormerMember(expense.paidBy) && (
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
                }
                size="md"
              />
            </div>

            {expense.subcategory && (
              <div className={colClass}>
                <InfoCard
                  icon="bi bi-tags"
                  label="Sub-category"
                  value={
                    <Badge variant="secondary" size="sm">
                      {expense.subcategory}
                    </Badge>
                  }
                  size="md"
                />
              </div>
            )}
          </div>
        </div>

        {/* Split Details Section */}
        {expense.isSplit && (
          <div className="mb-2">
            <SectionHeader
              title="Split Details"
              icon="bi bi-diagram-3"
              size="sm"
              iconColor={colors.status.warning}
              marginBottom={true}
            />

            {expense.splitDetails?.splits &&
            expense.splitDetails.splits.length > 0 ? (
              // New format: Use detailed split information from splitDetails.splits
              <div>
                <Table
                  config={{
                    columns: [
                      {
                        key: "user",
                        header: "User",
                        render: (value, split) => (
                          <UserBadge
                            user={split.userName || getUserName(split.userId)}
                            variant="small"
                          />
                        ),
                      },
                      {
                        key: "amount",
                        header: "Amount",
                        accessor: "amount",
                        render: (value) => formatCurrency(value as number),
                      },
                    ],
                    data: expense.splitDetails.splits,
                    keyExtractor: (split) => split.userId,
                    responsive: true,
                    size: "small",
                  }}
                />
                {expense.splitDetails.type && (
                  <AlertCard
                    variant="info"
                    size="sm"
                    borderOnly
                    className="mt-2"
                  >
                    <small className="d-flex align-items-center">
                      <i className="bi bi-info-circle me-1"></i>
                      <span>
                        {expense.splitDetails.type === "equal"
                          ? "Equal Split"
                          : "Manual Split"}
                      </span>
                    </small>
                  </AlertCard>
                )}
              </div>
            ) : expense.splitBetween && expense.splitBetween.length > 0 ? (
              // Legacy format: Calculate equal splits from splitBetween array
              <div>
                <Table
                  config={{
                    columns: [
                      {
                        key: "user",
                        header: "User",
                        render: (value, row) => (
                          <UserBadge
                            user={getUserName(row.userId)}
                            variant="small"
                          />
                        ),
                      },
                      {
                        key: "amount",
                        header: "Amount",
                        accessor: "amount",
                        render: (value) => formatCurrency(value as number),
                      },
                    ],
                    data: expense.splitBetween.map((userId) => ({
                      userId,
                      amount: expense.amount / expense.splitBetween!.length,
                    })),
                    keyExtractor: (row) => row.userId,
                    responsive: true,
                    size: "small",
                  }}
                />
                <AlertCard variant="info" size="sm" borderOnly className="mt-2">
                  <small className="d-flex align-items-center">
                    <i className="bi bi-info-circle me-1"></i>
                    <span>Equal Split</span>
                  </small>
                </AlertCard>
              </div>
            ) : (
              <AlertCard
                variant="warning"
                icon="bi bi-exclamation-triangle"
                size="sm"
              >
                Split details are not available for this expense.
              </AlertCard>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExpenseDetailsModal;
