"use client";

import { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  formatCurrency,
  formatTimelineDate,
  getLineChartOptions,
  getBarChartOptions,
  getChartColors,
  createLineDataset,
  getChartTitles,
  getCurrentPeriodText,
  buildPeriodApiUrl,
  PeriodType,
} from "@/lib/utils";
import {
  Table,
  PageHeader,
  SectionHeader,
  TimelineSkeleton,
} from "@/shared/components";
import { useTheme } from "@/contexts/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

interface TimelineData {
  dailyTrends: {
    dates: string[];
    amounts: number[];
  };
  categoryMonthly: {
    categories: string[];
    periods: string[];
    data: number[][];
  };
  periodTotals: {
    userTotals: Array<{
      userId: string;
      userName: string;
      personalExpenses: number;
      splitExpenses: number;
      totalExpenses: number;
    }>;
    splitTotal: number;
    settlementRequired: number;
    settlementMessage: string;
  };
}

export default function TimelineAnalysis() {
  const { theme } = useTheme();
  const { user } = useAuth(); // Get current logged-in user
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true);
      const url = buildPeriodApiUrl(
        "/api/analytics/timeline",
        selectedPeriod,
        customStartDate,
        customEndDate
      );

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch timeline data");
      }
    } catch {
      setError("Failed to load timeline data");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  const { trendTitle, categoryTitle } = getChartTitles(selectedPeriod);
  const periodText = getCurrentPeriodText(
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  const dailyTrendChartData = data
    ? {
        labels: data.dailyTrends.dates.map(formatTimelineDate),
        datasets: [
          createLineDataset(
            "Daily Spending",
            data.dailyTrends.amounts,
            undefined, // use default color
            true, // filled
            selectedPeriod === "week", // highlight today only for week view
            selectedPeriod === "week" ? data.dailyTrends.dates.length - 1 : -1 // today is the last date in week view
          ),
        ],
      }
    : null;

  const categoryStackedData = data
    ? {
        labels: data.categoryMonthly.periods,
        datasets: data.categoryMonthly.categories.map((category, index) => ({
          label: category,
          data: data.categoryMonthly.data[index] || [],
          backgroundColor: getChartColors(
            data.categoryMonthly.categories.length,
            theme
          )[index],
        })),
      }
    : null;

  const lineChartOptions = getLineChartOptions(false, theme);
  const stackedBarOptions = getBarChartOptions(true, theme);

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <TimelineSkeleton />
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
            onClick={fetchTimelineData}
          >
            Retry
          </button>
        </div>
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
                    href="/analytics/overview"
                    className="btn btn-outline-primary btn-sm"
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Overview
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

            {/* Period Selector */}
            <div className="card mb-4">
              <div className="card-body">
                <SectionHeader
                  title="Date Range"
                  icon="bi bi-calendar-range"
                  marginBottom={true}
                />
                <div className="row align-items-end">
                  <div className="col-md-6">
                    <div className="btn-group w-100" role="group">
                      {(
                        [
                          "week",
                          "month",
                          "quarter",
                          "year",
                          "custom",
                        ] as PeriodType[]
                      ).map((period) => (
                        <button
                          key={period}
                          type="button"
                          className={`btn ${
                            selectedPeriod === period
                              ? "btn-primary"
                              : "btn-outline-primary"
                          }`}
                          onClick={() => handlePeriodChange(period)}
                          aria-label={`Select ${period} period`}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {selectedPeriod === "custom" && (
                    <div className="col-md-6">
                      <div className="row g-2">
                        <div className="col-6">
                          <input
                            type={customStartDate ? "date" : "text"}
                            id="startDate"
                            className="form-control form-control-sm"
                            placeholder="Start Date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            autoComplete="off"
                            onFocus={(e) => {
                              e.target.type = "date";
                              setTimeout(() => {
                                if (e.target.showPicker) e.target.showPicker();
                              }, 0);
                            }}
                            onBlur={(e) => {
                              if (!e.target.value) e.target.type = "text";
                            }}
                            onKeyDown={(e) => {
                              if (e.currentTarget.type === "text") {
                                e.currentTarget.type = "date";
                                setTimeout(() => {
                                  if (e.currentTarget.showPicker)
                                    e.currentTarget.showPicker();
                                }, 0);
                              }
                            }}
                            style={{
                              fontSize: "0.875rem",
                              padding: "0.375rem 0.5rem",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                        <div className="col-6">
                          <input
                            type={customEndDate ? "date" : "text"}
                            id="endDate"
                            className="form-control form-control-sm"
                            placeholder="End Date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            autoComplete="off"
                            onFocus={(e) => {
                              e.target.type = "date";
                              setTimeout(() => {
                                if (e.target.showPicker) e.target.showPicker();
                              }, 0);
                            }}
                            onBlur={(e) => {
                              if (!e.target.value) e.target.type = "text";
                            }}
                            onKeyDown={(e) => {
                              if (e.currentTarget.type === "text") {
                                e.currentTarget.type = "date";
                                setTimeout(() => {
                                  if (e.currentTarget.showPicker)
                                    e.currentTarget.showPicker();
                                }, 0);
                              }
                            }}
                            style={{
                              fontSize: "0.875rem",
                              padding: "0.375rem 0.5rem",
                              cursor: "pointer",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="row mb-4">
              {/* Daily/Period Spending Trend */}
              <div className="col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-graph-up me-2"></i>
                      {trendTitle}
                    </h5>
                    {periodText && (
                      <small style={{ color: "var(--text-secondary)" }}>
                        {periodText}
                      </small>
                    )}
                  </div>
                  <div className="card-body">
                    <div style={{ height: "300px" }}>
                      {dailyTrendChartData && (
                        <Line
                          data={dailyTrendChartData}
                          options={lineChartOptions}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Category-wise Period Spending */}
              <div className="col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-bar-chart me-2"></i>
                      {categoryTitle}
                    </h5>
                    {periodText && (
                      <small style={{ color: "var(--text-secondary)" }}>
                        {periodText}
                      </small>
                    )}
                  </div>
                  <div className="card-body">
                    <div style={{ height: "300px" }}>
                      {categoryStackedData && (
                        <Bar
                          data={categoryStackedData}
                          options={stackedBarOptions}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Period Totals Table */}
            {data?.periodTotals?.userTotals && (
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-table me-2"></i>
                    Period Summary
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <Table
                      config={{
                        columns: [
                          {
                            key: "user",
                            header: "User",
                            accessor: "user",
                            render: (value, row) => (
                              <div>
                                <i
                                  className="bi bi-person-circle me-2"
                                  style={{
                                    color:
                                      row.user === "Total"
                                        ? "var(--text-secondary)"
                                        : "var(--btn-primary-bg)",
                                  }}
                                ></i>
                                <strong>{value}</strong>
                              </div>
                            ),
                          },
                          {
                            key: "personalExpenses",
                            header: "Personal Expenses",
                            accessor: "personalExpenses",
                            render: (value, row) =>
                              row.user === "Total" ? (
                                <strong>{formatCurrency(value)}</strong>
                              ) : (
                                formatCurrency(value)
                              ),
                          },
                          {
                            key: "splitExpenses",
                            header: "Split Expenses",
                            accessor: "splitExpenses",
                            render: (value, row) =>
                              row.user === "Total" ? (
                                <strong>{formatCurrency(value)}</strong>
                              ) : (
                                formatCurrency(value)
                              ),
                          },
                          {
                            key: "totalPaid",
                            header: "Total Paid",
                            accessor: "totalPaid",
                            render: (value) => (
                              <span className="fw-bold">
                                {formatCurrency(value)}
                              </span>
                            ),
                          },
                        ],
                        data: [
                          ...data.periodTotals.userTotals.map((userTotal) => ({
                            user: userTotal.userName || userTotal.userId,
                            personalExpenses: userTotal.personalExpenses,
                            splitExpenses: userTotal.splitExpenses,
                            totalPaid: userTotal.totalExpenses,
                          })),
                          {
                            user: "Total",
                            personalExpenses:
                              data.periodTotals.userTotals.reduce(
                                (sum, ut) => sum + ut.personalExpenses,
                                0
                              ),
                            splitExpenses: data.periodTotals.splitTotal,
                            totalPaid: data.periodTotals.userTotals.reduce(
                              (sum, ut) => sum + ut.totalExpenses,
                              0
                            ),
                          },
                        ],
                        keyExtractor: (row) => row.user,
                        bordered: true,
                        responsive: true,
                        rowClassName: (row) =>
                          row.user === "Total" ? "table-info" : "",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
