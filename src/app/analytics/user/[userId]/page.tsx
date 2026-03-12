"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import logger from "@/lib/logger";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import {
  formatCurrency,
  getPieChartOptions,
  getLineChartOptions,
  getChartColors,
  getUserColor,
  createLineDataset,
} from "@/lib/utils";
import {
  EmptyState,
  PageHeader,
  UserAnalyticsSkeleton,
} from "@/shared/components";
import { useTheme } from "@/contexts/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface UserAnalysisData {
  user: string;
  userName: string;
  categoryDistribution: {
    labels: string[];
    amounts: number[];
  };
  monthlyTrends: {
    months: string[];
    amounts: number[];
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  splitExpenses: Array<{
    _id: string;
    description: string;
    amount: number;
    date: string;
    userShare: number;
    userPaid: number;
  }>;
  balance: {
    totalPaid: number;
    totalOwed: number;
    totalOwing: number;
    netBalance: number;
    status: string;
    balances: Record<string, number>;
  };
}

export default function UserAnalyticsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const resolvedParams = useParams();
  const userId = resolvedParams.userId as string;

  const [data, setData] = useState<UserAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryView, setCategoryView] = useState<"overall" | "monthly">(
    "overall"
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthlyCategoryData, setMonthlyCategoryData] = useState<{
    labels: string[];
    amounts: number[];
  } | null>(null);

  // Get current month in format "MMM 'YY"
  const getCurrentMonth = () => {
    const now = new Date();
    return now.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  };

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // First, just try to get the analytics data without merging balance data
      const analyticsResponse = await fetch(`/api/analytics/user/${userId}`);

      if (!analyticsResponse.ok) {
        throw new Error(
          `HTTP ${analyticsResponse.status}: ${analyticsResponse.statusText}`
        );
      }

      const analyticsResult = await analyticsResponse.json();

      if (analyticsResult.success && analyticsResult.data) {
        // Use the balance data directly from the API
        setData(analyticsResult.data);
        setError(null);
      } else {
        setError(analyticsResult.error || "No data returned from API");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`API Error: ${err.message}`);
      } else {
        setError("Failed to load user data");
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId, fetchUserData]);

  // Fetch monthly category data when month is selected
  const fetchMonthlyCategoryData = useCallback(
    async (month: string) => {
      try {
        logger.debug(`Fetching monthly data for ${month}...`, {
          month,
          userId,
        });
        const response = await fetch(
          `/api/analytics/user/${userId}?month=${month}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch monthly data");
        }
        const result = await response.json();
        logger.debug("Monthly data result", { result });
        if (result.success && result.data) {
          logger.debug("Category distribution", {
            categoryDistribution: result.data.categoryDistribution,
          });
          setMonthlyCategoryData(result.data.categoryDistribution);
        } else {
          // Set empty data if no results
          setMonthlyCategoryData({ labels: [], amounts: [] });
        }
      } catch (err) {
        logger.error("Error fetching monthly category data", err, {
          userId,
          month,
        });
        setMonthlyCategoryData({ labels: [], amounts: [] });
      }
    },
    [userId]
  );

  // Set default month to current month when data is loaded
  useEffect(() => {
    if (data && data.monthlyTrends.months.length > 0 && !selectedMonth) {
      const currentMonth = getCurrentMonth();
      // Check if current month exists in the data, otherwise use latest
      const monthToUse = data.monthlyTrends.months.includes(currentMonth)
        ? currentMonth
        : data.monthlyTrends.months[data.monthlyTrends.months.length - 1];
      setSelectedMonth(monthToUse);
    }
  }, [data, selectedMonth]);

  // Fetch monthly data when month changes and view is monthly
  useEffect(() => {
    if (categoryView === "monthly" && selectedMonth) {
      fetchMonthlyCategoryData(selectedMonth);
    }
  }, [categoryView, selectedMonth, fetchMonthlyCategoryData]);

  const categoryPieData = data
    ? {
        labels:
          categoryView === "overall"
            ? data.categoryDistribution.labels
            : monthlyCategoryData?.labels || data.categoryDistribution.labels,
        datasets: [
          {
            data:
              categoryView === "overall"
                ? data.categoryDistribution.amounts
                : monthlyCategoryData?.amounts ||
                  data.categoryDistribution.amounts,
            backgroundColor: getChartColors(
              categoryView === "overall"
                ? data.categoryDistribution.labels.length
                : monthlyCategoryData?.labels.length ||
                    data.categoryDistribution.labels.length,
              theme
            ),
            borderWidth: 2,
            borderColor: "var(--card-bg)",
          },
        ],
      }
    : null;

  const monthlyTrendData = data
    ? {
        labels: data.monthlyTrends.months,
        datasets: [
          createLineDataset(
            `${
              data.userName
                ? data.userName.charAt(0).toUpperCase() + data.userName.slice(1)
                : userId
            }'s Monthly Spending`,
            data.monthlyTrends.amounts,
            getUserColor(data.userName || userId, theme)
          ),
        ],
      }
    : null;

  const pieChartOptions = getPieChartOptions(true, theme);
  const lineChartOptions = getLineChartOptions(false, theme);

  if (loading) {
    return (
      <MainLayout>
        <UserAnalyticsSkeleton />
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
            onClick={fetchUserData}
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <EmptyState
          icon="👤"
          title={`No data for user`}
          description="This user hasn't recorded any expenses yet."
          size="large"
          actions={[
            {
              label: "Go to Expenses",
              onClick: () => router.push("/expenses"),
              variant: "primary",
            },
          ]}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            {/* Header */}
            <PageHeader
              title="Analytics"
              icon="bi bi-person-circle"
              size="md"
              actions={
                <>
                  <Link
                    href="/analytics/overview"
                    className="btn btn-sm analytics-nav-btn"
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Overview
                  </Link>
                  <Link
                    href="/analytics/timeline"
                    className="btn btn-sm analytics-nav-btn"
                  >
                    <i className="bi bi-graph-up me-1"></i>
                    Timeline
                  </Link>
                </>
              }
            />

            {/* Balance Overview */}
            <div className="row g-2 mb-4">
              <div className="col-6">
                <div className="card analytics-stat-card h-100">
                  <div className="card-body">
                    <h6 className="card-title">Total Paid</h6>
                    <h5 className="mb-1">
                      {formatCurrency(data.balance.totalPaid)}
                    </h5>
                    <small className="opacity-75">by {data.user}</small>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div className="card analytics-stat-card h-100">
                  <div className="card-body">
                    <h6 className="card-title">Net Balance</h6>
                    <h5 className="mb-1">
                      {data.balance.netBalance >= 0 ? "+" : ""}
                      {formatCurrency(data.balance.netBalance)}
                    </h5>
                    <small className="opacity-75">
                      {data.balance.netBalance >= 0 ? "to receive" : "to pay"}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="row g-2 mb-4">
              {/* Category Distribution Pie Chart */}
              <div className="col-12 col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <h5 className="mb-0 chart-title">
                        <i className="bi bi-pie-chart me-2"></i>
                        <span className="d-none d-sm-inline">
                          Expense by Category
                        </span>
                        <span className="d-inline d-sm-none">By Category</span>
                      </h5>
                      <div className="d-flex gap-1 gap-sm-2 align-items-center">
                        <select
                          className="form-select form-select-sm chart-select"
                          value={categoryView}
                          onChange={(e) => {
                            const value = e.target.value as
                              | "overall"
                              | "monthly";
                            setCategoryView(value);
                          }}
                        >
                          <option value="overall">Overall</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        {categoryView === "monthly" && data && (
                          <select
                            className="form-select form-select-sm chart-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            aria-label="Select month"
                          >
                            {data.monthlyTrends.months.map((month) => (
                              <option key={month} value={month}>
                                {month}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div
                      style={{ height: "300px" }}
                      className="d-none d-sm-block"
                    >
                      {categoryPieData && categoryPieData.labels.length > 0 ? (
                        <Pie data={categoryPieData} options={pieChartOptions} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center h-100">
                          <p
                            className="text-muted mb-0"
                            style={{ fontSize: "0.875rem" }}
                          >
                            No expenses for this period
                          </p>
                        </div>
                      )}
                    </div>
                    <div
                      style={{ height: "200px" }}
                      className="d-block d-sm-none"
                    >
                      {categoryPieData && categoryPieData.labels.length > 0 ? (
                        <Pie data={categoryPieData} options={pieChartOptions} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center h-100">
                          <p
                            className="text-muted mb-0"
                            style={{ fontSize: "0.75rem" }}
                          >
                            No expenses
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Spending Trend */}
              <div className="col-12 col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-graph-up me-2"></i>
                      Monthly Spending Trend
                    </h5>
                  </div>
                  <div className="card-body">
                    <div
                      style={{ height: "300px" }}
                      className="d-none d-sm-block"
                    >
                      {monthlyTrendData && (
                        <Line
                          data={monthlyTrendData}
                          options={lineChartOptions}
                        />
                      )}
                    </div>
                    <div
                      style={{ height: "200px" }}
                      className="d-block d-sm-none"
                    >
                      {monthlyTrendData && (
                        <Line
                          data={monthlyTrendData}
                          options={lineChartOptions}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        /* Chart controls styling */
        .chart-title {
          font-size: 1rem;
        }

        .chart-select {
          min-width: 80px;
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
        }

        .card-header {
          padding: 0.75rem 1rem;
        }

        .table-responsive,
        .position-relative {
          scrollbar-width: thin;
          scrollbar-color: var(--border-secondary) var(--bg-tertiary);
        }

        .table-responsive::-webkit-scrollbar,
        .position-relative::-webkit-scrollbar {
          width: 4px;
        }

        .table-responsive::-webkit-scrollbar-track,
        .position-relative::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
          border-radius: 2px;
        }

        .table-responsive::-webkit-scrollbar-thumb,
        .position-relative::-webkit-scrollbar-thumb {
          background: var(--border-secondary);
          border-radius: 2px;
        }

        .table-responsive::-webkit-scrollbar-thumb:hover,
        .position-relative::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        .sticky-top,
        .position-sticky {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
          background-color: var(--bg-secondary) !important;
        }

        /* Ensure proper table layout for sticky headers */
        .position-relative .table thead th {
          background-color: var(--table-header-bg) !important;
          border-bottom: 2px solid var(--table-border) !important;
        }

        /* iPhone SE and very small screens (320px wide) */
        @media (max-width: 375px) {
          .container-fluid {
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .card-header {
            padding: 0.5rem 0.625rem !important;
          }

          .chart-title {
            font-size: 0.75rem !important;
          }

          .chart-select {
            min-width: 60px !important;
            font-size: 0.7rem !important;
            padding: 0.2rem 0.35rem !important;
            height: auto !important;
          }

          .card-body {
            padding: 0.5rem !important;
          }

          .btn {
            font-size: 0.75rem !important;
            padding: 0.25rem 0.5rem !important;
            white-space: nowrap !important;
            min-height: 32px !important;
          }

          .card-title {
            font-size: 0.7rem !important;
            margin-bottom: 0.25rem !important;
          }

          h5 {
            font-size: 0.8rem !important;
          }

          .table {
            font-size: 0.7rem !important;
          }

          .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .col-6,
          .col-12 {
            padding-left: 0.125rem !important;
            padding-right: 0.125rem !important;
          }

          .mb-4 {
            margin-bottom: 0.5rem !important;
          }
        }

        /* Small screens up to 576px */
        @media (max-width: 575px) {
          .container-fluid {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            padding-left: 0.375rem !important;
            padding-right: 0.375rem !important;
          }

          .card-header {
            padding: 0.5rem 0.75rem !important;
          }

          .chart-title {
            font-size: 0.875rem !important;
          }

          .chart-select {
            min-width: 70px !important;
            font-size: 0.75rem !important;
            padding: 0.2rem 0.35rem !important;
          }

          .btn {
            font-size: 0.75rem !important;
            padding: 0.25rem 0.5rem !important;
            min-height: 34px !important;
          }

          .card-title {
            font-size: 0.8rem !important;
          }

          h5 {
            font-size: 0.9rem !important;
          }
        }

        /* Medium screens */
        @media (max-width: 991px) {
          .container-fluid {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}
