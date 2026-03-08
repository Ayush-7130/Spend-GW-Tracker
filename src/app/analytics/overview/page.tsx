"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  getChangeIndicator,
  getDoughnutChartOptions,
  getChartColors,
} from "@/lib/utils";
import {
  Table,
  LoadingSpinner,
  EmptyState,
  Badge,
  PageHeader,
  SectionHeader,
  AnalyticsOverviewSkeleton,
} from "@/shared/components";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

// Lazy load Chart.js and react-chartjs-2 to reduce initial bundle size
const DoughnutChart = lazy(async () => {
  // Dynamically import Chart.js and register components
  const ChartJS = await import("chart.js");
  ChartJS.Chart.register(
    ChartJS.CategoryScale,
    ChartJS.LinearScale,
    ChartJS.BarElement,
    ChartJS.Title,
    ChartJS.Tooltip,
    ChartJS.Legend,
    ChartJS.ArcElement
  );

  // Import and return the Doughnut component
  const { Doughnut } = await import("react-chartjs-2");
  return { default: Doughnut };
});

interface OverviewData {
  currentMonthTotal: number;
  currentMonthCount: number;
  lastMonthTotal: number;
  lastMonthCount: number;
  percentageChange: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  dailyAverage: number;
  highestExpenseDay: {
    date: string;
    amount: number;
    description: string;
  };
  categoryDistribution: {
    labels: string[];
    amounts: number[];
  };
}

export default function AnalyticsOverview() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth(); // Get current logged-in user
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics/overview");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch overview data");
      }
    } catch {
      setError("Failed to load overview data");
    } finally {
      setLoading(false);
    }
  };

  const categoryChartData = data
    ? {
        labels: data.categoryDistribution.labels,
        datasets: [
          {
            data: data.categoryDistribution.amounts,
            backgroundColor: getChartColors(
              data.categoryDistribution.labels.length,
              theme
            ),
            borderWidth: 2,
            borderColor: "var(--card-bg)",
          },
        ],
      }
    : null;

  const chartOptions = getDoughnutChartOptions(true, theme);

  const getMonthIcon = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    const monthIcons = [
      "bi-snow", // January
      "bi-heart", // February (Valentine's)
      "bi-flower1", // March (Spring)
      "bi-brightness-high", // April (Spring sunshine)
      "bi-flower2", // May (Spring flowers)
      "bi-sun", // June (Summer)
      "bi-brightness-high-fill", // July (Hot summer)
      "bi-thermometer-sun", // August (Hottest)
      "bi-leaf", // September (Autumn begins)
      "bi-tree", // October (Autumn)
      "bi-cloud-rain", // November (Monsoon end/Winter prep)
      "bi-snow2", // December (Winter)
    ];
    return monthIcons[currentMonth] || "bi-calendar-month";
  };

  if (loading) {
    return (
      <MainLayout>
        <AnalyticsOverviewSkeleton />
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
            onClick={fetchOverviewData}
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
          icon="📈"
          title="No Analytics Data"
          description="Add some expenses to see insightful analytics about your spending patterns."
          size="large"
          actions={[
            {
              label: "Go to Expenses",
              onClick: () => router.push("/expenses"),
              variant: "primary",
              icon: "arrow-right",
            },
          ]}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="analytics-page">
        <div className="row">
          <div className="col-12">
            {/* Header */}
            <PageHeader
              title="Analytics"
              icon="bi bi-graph-up"
              actions={
                <>
                  <Link
                    href="/analytics/timeline"
                    className="btn btn-outline-success btn-sm"
                  >
                    <i className="bi bi-graph-up me-1"></i>
                    Timeline
                  </Link>
                  {user && (
                    <Link
                      href={`/analytics/user/${user.id}`}
                      className="btn btn-outline-info btn-sm"
                    >
                      <i className="bi bi-person-circle me-1"></i>
                      My Analytics
                    </Link>
                  )}
                </>
              }
            />

            {/* Key Metrics Cards */}
            <div className="row mb-4">
              <div className="col-lg-3 col-md-6 mb-3">
                <div className="card bg-primary text-white h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="card-title">This Month Total</h6>
                        <h4 className="mb-1" aria-label="This month total">
                          {formatCurrency(data.currentMonthTotal)}
                        </h4>
                        <small className="opacity-75">
                          {data.currentMonthCount} expenses
                        </small>
                      </div>
                      <i className={`${getMonthIcon()} fs-2`}></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-3 col-md-6 mb-3">
                <div className="card bg-info text-white h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="card-title">vs Last Month</h6>
                        <h4 className="mb-1">
                          <i
                            className={`${
                              getChangeIndicator(data.percentageChange).icon
                            } me-2`}
                          ></i>
                          {Math.abs(data.percentageChange).toFixed(1)}%
                        </h4>
                        <small className="opacity-75">
                          {formatCurrency(data.lastMonthTotal)} last month
                        </small>
                      </div>
                      <i className="bi bi-graph-up-arrow fs-2"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-3 col-md-6 mb-3">
                <div className="card bg-success text-white h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="card-title">Daily Average</h6>
                        <h4 className="mb-1" aria-label="Daily average">
                          {formatCurrency(data.dailyAverage)}
                        </h4>
                        <small className="opacity-75">per day this month</small>
                      </div>
                      <i className="bi bi-speedometer2 fs-2"></i>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-3 col-md-6 mb-3">
                <div className="card bg-warning text-white h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between">
                      <div>
                        <h6 className="card-title">Highest Day</h6>
                        <h4 className="mb-1" aria-label="Highest expense day">
                          {formatCurrency(data.highestExpenseDay.amount)}
                        </h4>
                        <small className="opacity-75">
                          {formatDate(data.highestExpenseDay.date)}
                        </small>
                      </div>
                      <i className="bi bi-trophy fs-2"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Analysis */}
            <div className="row">
              {/* Top Categories */}
              <div className="col-lg-4 mb-4">
                <div className="card h-100">
                  <div className="card-header border-0 bg-transparent pt-3 pb-0 px-3">
                    <SectionHeader
                      title="Top Spending Categories"
                      icon="bi bi-bar-chart"
                    />
                  </div>
                  <div
                    className="card-body p-0"
                    style={{
                      maxHeight: "350px",
                      overflowY: "auto",
                      backgroundColor: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                      boxShadow: "var(--card-shadow)",
                    }}
                  >
                    <Table
                      config={{
                        columns: [
                          {
                            key: "rank",
                            header: "#",
                            width: "50px",
                            render: (value, row, index) => {
                              const getRankingVariant = (index: number) => {
                                if (index === 0) return "primary";
                                if (index === 1) return "success";
                                if (index === 2) return "info";
                                if (index === 3) return "warning";
                                return "secondary";
                              };
                              return (
                                <Badge variant={getRankingVariant(index)}>
                                  {index + 1}
                                </Badge>
                              );
                            },
                          },
                          {
                            key: "name",
                            header: "Category",
                            accessor: "name",
                            render: (value) => (
                              <span className="fw-medium">{value}</span>
                            ),
                          },
                          {
                            key: "amount",
                            header: "Amount",
                            accessor: "amount",
                            align: "right",
                            render: (value) => (
                              <span className="fw-bold">
                                {formatCurrency(value)}
                              </span>
                            ),
                          },
                          {
                            key: "percentage",
                            header: "%",
                            accessor: "percentage",
                            width: "70px",
                            align: "right",
                            render: (value) => (
                              <span style={{ color: "var(--text-secondary)" }}>
                                {value}%
                              </span>
                            ),
                          },
                        ],
                        data: data.topCategories,
                        keyExtractor: (category) => category.name,
                        hover: true,
                        responsive: true,
                        size: "small",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Category Distribution Pie Chart */}
              <div className="col-lg-8 mb-4">
                <div className="card h-100">
                  <div className="card-header border-0 bg-transparent pt-3 pb-0 px-3">
                    <SectionHeader
                      title="Category Distribution"
                      icon="bi bi-pie-chart"
                    />
                  </div>
                  <div className="card-body">
                    <div style={{ height: "300px" }}>
                      {categoryChartData && (
                        <Suspense
                          fallback={
                            <div className="text-center py-5">
                              <LoadingSpinner />
                            </div>
                          }
                        >
                          <DoughnutChart
                            data={categoryChartData}
                            options={chartOptions}
                          />
                        </Suspense>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
