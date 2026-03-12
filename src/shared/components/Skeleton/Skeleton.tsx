"use client";

import React from "react";

// ─── Base Skeleton Element ───────────────────────────────────────────────────

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
  variant?: "text" | "circular" | "rectangular" | "rounded";
}

export function Skeleton({
  width,
  height,
  borderRadius,
  className = "",
  style,
  variant = "text",
}: SkeletonProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      borderRadius: "4px",
      height: height || "1em",
      width: width || "100%",
    },
    circular: {
      borderRadius: "50%",
      width: width || "40px",
      height: height || "40px",
    },
    rectangular: {
      borderRadius: "0",
      width: width || "100%",
      height: height || "100px",
    },
    rounded: {
      borderRadius: borderRadius || "8px",
      width: width || "100%",
      height: height || "100px",
    },
  };

  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        ...variantStyles[variant],
        ...style,
        ...(borderRadius ? { borderRadius } : {}),
        ...(width ? { width } : {}),
        ...(height ? { height } : {}),
      }}
      aria-hidden="true"
    />
  );
}

// ─── Stats Card Skeleton ─────────────────────────────────────────────────────

interface StatsCardSkeletonProps {
  count?: number;
}

export function StatsCardSkeleton({ count = 3 }: StatsCardSkeletonProps) {
  return (
    <div className="row mb-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-md-4 mb-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex align-items-center">
                <Skeleton
                  variant="circular"
                  width="48px"
                  height="48px"
                  className="me-3 flex-shrink-0"
                />
                <div className="flex-grow-1">
                  <Skeleton width="60%" height="14px" className="mb-2" />
                  <Skeleton width="40%" height="24px" className="mb-1" />
                  <Skeleton width="50%" height="12px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Table Skeleton ──────────────────────────────────────────────────────────

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
  className = "",
}: TableSkeletonProps) {
  return (
    <div className={`card ${className}`}>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            {showHeader && (
              <thead>
                <tr>
                  {Array.from({ length: columns }).map((_, i) => (
                    <th
                      key={i}
                      style={{ borderBottomColor: "var(--border-primary)" }}
                    >
                      <Skeleton
                        width={`${50 + Math.random() * 30}%`}
                        height="14px"
                      />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: columns }).map((_, colIdx) => (
                    <td
                      key={colIdx}
                      style={{ borderBottomColor: "var(--border-primary)" }}
                    >
                      <Skeleton
                        width={`${40 + Math.random() * 40}%`}
                        height="14px"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── TableCard Skeleton (responsive: table on desktop, cards on mobile ≤1024px) ─

interface TableCardSkeletonProps {
  rows?: number;
  columns?: number;
  hasBadge?: boolean;
  hasMeta?: boolean;
  hasSplitInfo?: boolean;
  actionCount?: number;
  className?: string;
}

export function TableCardSkeleton({
  rows = 5,
  columns = 5,
  hasBadge = false,
  hasMeta = false,
  hasSplitInfo = false,
  actionCount = 0,
  className = "",
}: TableCardSkeletonProps) {
  const mobileRows = Math.min(rows, 4);
  const colWidths = [55, 70, 45, 60, 40, 65];

  return (
    <div className={className}>
      <style>{`
        .tcs-table { display: block; }
        .tcs-cards { display: none; }
        @media (max-width: 1024px) {
          .tcs-table { display: none; }
          .tcs-cards { display: flex; flex-direction: column; gap: 0.75rem; padding: 0.75rem; }
        }
      `}</style>

      {/* Desktop — table */}
      <div className="tcs-table">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                {Array.from({ length: columns }).map((_, i) => (
                  <th
                    key={i}
                    style={{ borderBottomColor: "var(--border-primary)" }}
                  >
                    <Skeleton
                      width={`${colWidths[i % colWidths.length]}%`}
                      height="14px"
                    />
                  </th>
                ))}
                {actionCount > 0 && (
                  <th
                    style={{
                      borderBottomColor: "var(--border-primary)",
                      width: "1%",
                    }}
                  >
                    <Skeleton width="60px" height="14px" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr key={rowIdx}>
                  {Array.from({ length: columns }).map((_, colIdx) => (
                    <td
                      key={colIdx}
                      style={{ borderBottomColor: "var(--border-primary)" }}
                    >
                      <Skeleton
                        width={`${colWidths[(rowIdx + colIdx) % colWidths.length]}%`}
                        height="14px"
                      />
                    </td>
                  ))}
                  {actionCount > 0 && (
                    <td style={{ borderBottomColor: "var(--border-primary)" }}>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        {Array.from({ length: actionCount }).map((_, ai) => (
                          <Skeleton
                            key={ai}
                            width="30px"
                            height="30px"
                            borderRadius="4px"
                          />
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — stacked cards */}
      <div className="tcs-cards">
        {Array.from({ length: mobileRows }).map((_, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--card-border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            {/* Card header: subtitle + optional badge */}
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "var(--table-header-bg)",
                borderBottom: "1px solid var(--card-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Skeleton width="45%" height="13px" />
              {hasBadge && (
                <Skeleton width="70px" height="22px" borderRadius="12px" />
              )}
            </div>

            {/* Card body: title + amount, meta, splitInfo */}
            <div
              style={{
                padding: "1.25rem 1rem",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "0.75rem",
                alignItems: "center",
              }}
            >
              <Skeleton width="65%" height="18px" />
              <Skeleton width="75px" height="22px" />
              {hasMeta && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <Skeleton width="100%" height="13px" borderRadius="4px" />
                </div>
              )}
              {hasSplitInfo && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <Skeleton width="80%" height="13px" borderRadius="4px" />
                </div>
              )}
            </div>

            {/* Card actions */}
            {actionCount > 0 && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--table-header-bg)",
                  borderTop: "1px solid var(--card-border)",
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "flex-end",
                }}
              >
                {Array.from({ length: actionCount }).map((_, ai) => (
                  <Skeleton
                    key={ai}
                    width="72px"
                    height="30px"
                    borderRadius="4px"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card Grid Skeleton ──────────────────────────────────────────────────────

interface CardGridSkeletonProps {
  count?: number;
  columns?: number;
  hasHeader?: boolean;
  hasSubitems?: boolean;
}

export function CardGridSkeleton({
  count = 6,
  columns = 3,
  hasHeader = true,
  hasSubitems = false,
}: CardGridSkeletonProps) {
  const colClass =
    columns === 2
      ? "col-md-6"
      : columns === 4
        ? "col-md-6 col-lg-3"
        : "col-md-6 col-lg-4";

  return (
    <div className="row">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${colClass} mb-4`}>
          <div className="card h-100">
            {hasHeader && (
              <div className="card-header d-flex justify-content-between align-items-center">
                <Skeleton width="60%" height="20px" />
                <Skeleton variant="circular" width="28px" height="28px" />
              </div>
            )}
            <div className="card-body">
              <Skeleton width="100%" height="14px" className="mb-2" />
              <Skeleton width="75%" height="14px" className="mb-3" />
              {hasSubitems && (
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {Array.from({
                    length: 3 + Math.floor(Math.random() * 3),
                  }).map((_, j) => (
                    <Skeleton
                      key={j}
                      width={`${40 + Math.random() * 30}px`}
                      height="24px"
                      borderRadius="12px"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page Header Skeleton ────────────────────────────────────────────────────

interface PageHeaderSkeletonProps {
  hasActions?: boolean;
  hasSubtitle?: boolean;
}

export function PageHeaderSkeleton({
  hasActions = true,
  hasSubtitle = false,
}: PageHeaderSkeletonProps) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4">
      <div>
        <div className="d-flex align-items-center gap-2">
          <Skeleton variant="circular" width="32px" height="32px" />
          <Skeleton width="180px" height="28px" />
        </div>
        {hasSubtitle && (
          <Skeleton width="250px" height="14px" className="mt-2" />
        )}
      </div>
      {hasActions && (
        <div className="d-flex gap-2">
          <Skeleton width="120px" height="38px" borderRadius="6px" />
        </div>
      )}
    </div>
  );
}

// ─── Filter Panel Skeleton ───────────────────────────────────────────────────

interface FilterPanelSkeletonProps {
  filterCount?: number;
}

export function FilterPanelSkeleton({
  filterCount = 5,
}: FilterPanelSkeletonProps) {
  return (
    <div className="card mb-4">
      <div className="card-body py-3">
        <div className="row g-2">
          {Array.from({ length: filterCount }).map((_, i) => (
            <div key={i} className="col-md-2">
              <Skeleton width="50%" height="12px" className="mb-1" />
              <Skeleton width="100%" height="38px" borderRadius="6px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Skeleton ────────────────────────────────────────────────────────

export function ProfileSkeleton() {
  return (
    <div className="container py-4">
      <PageHeaderSkeleton hasSubtitle />
      <div className="row">
        {/* Main content */}
        <div className="col-lg-8">
          <div className="card shadow-sm">
            <div className="card-header">
              <div className="d-flex align-items-center gap-2">
                <Skeleton variant="circular" width="24px" height="24px" />
                <Skeleton width="150px" height="20px" />
              </div>
            </div>
            <div className="card-body">
              {/* Info cards row */}
              <div className="row g-3 mb-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="col-md-4">
                    <div className="border rounded p-3">
                      <Skeleton width="40%" height="12px" className="mb-2" />
                      <Skeleton width="70%" height="16px" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Form fields */}
              <div className="mb-3">
                <Skeleton width="60px" height="14px" className="mb-2" />
                <Skeleton width="100%" height="38px" borderRadius="6px" />
              </div>
              <div className="mb-3">
                <Skeleton width="50px" height="14px" className="mb-2" />
                <Skeleton width="100%" height="38px" borderRadius="6px" />
              </div>
              <div className="d-flex gap-2">
                <Skeleton width="130px" height="38px" borderRadius="6px" />
                <Skeleton width="90px" height="38px" borderRadius="6px" />
              </div>
            </div>
          </div>
          {/* Password card */}
          <div className="card shadow-sm mt-3">
            <div className="card-header">
              <Skeleton width="150px" height="20px" />
            </div>
            <div className="card-body">
              <Skeleton width="75%" height="14px" className="mb-3" />
              <Skeleton width="100%" height="38px" borderRadius="6px" />
            </div>
          </div>
        </div>
        {/* Sidebar */}
        <div className="col-lg-4 mt-4 mt-lg-0">
          <div className="card shadow-sm mb-3">
            <div className="card-header">
              <Skeleton width="100px" height="20px" />
            </div>
            <div className="card-body">
              <div className="border rounded p-3 mb-3">
                <Skeleton width="40%" height="14px" className="mb-2" />
                <Skeleton width="70%" height="18px" className="mb-1" />
                <Skeleton width="50%" height="12px" />
              </div>
              <Skeleton width="100%" height="38px" borderRadius="6px" />
            </div>
          </div>
          <div className="card shadow-sm mt-3">
            <div className="card-header">
              <Skeleton width="140px" height="20px" />
            </div>
            <div className="card-body">
              <Skeleton width="80%" height="14px" className="mb-3" />
              <div className="d-grid gap-2">
                <Skeleton width="100%" height="42px" borderRadius="6px" />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard Skeleton ──────────────────────────────────────────────────────

export function DashboardSkeleton() {
  return (
    <div className="row">
      <div className="col-12">
        <PageHeaderSkeleton />
        <StatsCardSkeleton count={3} />
        <div className="row mb-4">
          {/* Recent expenses table */}
          <div className="col-md-8 mb-3 mb-md-0">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <Skeleton width="150px" height="20px" />
                <Skeleton width="70px" height="30px" borderRadius="6px" />
              </div>
              <div className="card-body p-0">
                <TableSkeleton
                  rows={5}
                  columns={6}
                  showHeader={true}
                  className="border-0 shadow-none"
                />
              </div>
            </div>
          </div>
          {/* Quick actions */}
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header">
                <Skeleton width="120px" height="20px" />
              </div>
              <div className="card-body">
                <div className="d-grid gap-2">
                  <Skeleton width="100%" height="42px" borderRadius="6px" />
                  <Skeleton width="100%" height="42px" borderRadius="6px" />
                  <Skeleton width="100%" height="42px" borderRadius="6px" />
                  <Skeleton width="100%" height="42px" borderRadius="6px" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Settlement section */}
        <div className="row mb-4">
          <div className="col-md-8 mb-3 mb-md-0">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <Skeleton width="140px" height="20px" />
                <Skeleton width="70px" height="30px" borderRadius="6px" />
              </div>
              <div className="card-body p-0">
                <TableSkeleton
                  rows={3}
                  columns={4}
                  showHeader={true}
                  className="border-0 shadow-none"
                />
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100">
              <div className="card-header">
                <Skeleton width="160px" height="20px" />
              </div>
              <div className="card-body">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="d-flex justify-content-between mb-2">
                    <Skeleton width="80px" height="14px" />
                    <Skeleton width="60px" height="14px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Recent Settlements full-width card */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <Skeleton width="160px" height="20px" />
                <Skeleton width="150px" height="30px" borderRadius="6px" />
              </div>
              <div className="card-body p-0">
                <TableSkeleton
                  rows={3}
                  columns={5}
                  showHeader={true}
                  className="border-0 shadow-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Expenses Skeleton ───────────────────────────────────────────────────────

export function ExpensesSkeleton() {
  return (
    <div className="card">
      <div className="card-body p-0">
        <TableCardSkeleton
          rows={8}
          columns={6}
          hasBadge
          hasMeta
          hasSplitInfo
          actionCount={2}
        />
      </div>
    </div>
  );
}

// ─── Settlements Skeleton ────────────────────────────────────────────────────

export function SettlementsSkeleton() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <PageHeaderSkeleton />
          {/* Summary statistics */}
          <div className="row mb-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="col-md-3">
                <div className="card">
                  <div className="card-body text-center py-3">
                    <div className="d-flex align-items-center justify-content-center">
                      <Skeleton
                        variant="circular"
                        width="32px"
                        height="32px"
                        className="me-2"
                      />
                      <div>
                        <Skeleton width="60px" height="24px" className="mb-1" />
                        <Skeleton width="80px" height="12px" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Balance cards */}
          <div className="card mb-4">
            <div className="card-header">
              <Skeleton width="160px" height="20px" />
            </div>
            <div className="card-body">
              <div className="row g-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="col-md-4">
                    <div className="border rounded p-3">
                      <div className="d-flex justify-content-between mb-2">
                        <Skeleton width="70px" height="14px" />
                        <Skeleton width="20px" height="14px" />
                      </div>
                      <Skeleton width="50px" height="14px" className="mb-1" />
                      <Skeleton width="60px" height="20px" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Settlements table */}
          <FilterPanelSkeleton filterCount={4} />
          <TableCardSkeleton
            rows={6}
            columns={6}
            hasBadge
            hasMeta
            actionCount={2}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Groups List Skeleton ────────────────────────────────────────────────────

export function GroupsListSkeleton() {
  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <div className="mb-3">
        <Skeleton width="200px" height="14px" />
      </div>
      <PageHeaderSkeleton hasSubtitle />
      <div className="mb-4">
        <div className="row">
          <div className="col-md-4">
            <Skeleton width="100%" height="38px" borderRadius="6px" />
          </div>
        </div>
      </div>
      <div className="row g-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="col-12 col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <Skeleton width="60%" height="20px" />
                  <Skeleton width="40px" height="22px" borderRadius="12px" />
                </div>
                <Skeleton width="100%" height="14px" className="mb-3" />
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <Skeleton width="100px" height="14px" className="mb-1" />
                    <Skeleton width="120px" height="14px" />
                  </div>
                </div>
              </div>
              <div className="card-footer bg-transparent border-top">
                <div className="d-flex gap-2">
                  <Skeleton width="80px" height="32px" borderRadius="6px" />
                  <Skeleton width="80px" height="32px" borderRadius="6px" />
                  <Skeleton width="36px" height="32px" borderRadius="6px" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Group Detail Skeleton ───────────────────────────────────────────────────

export function GroupDetailSkeleton() {
  return (
    <div className="container py-4">
      {/* Breadcrumb */}
      <div className="mb-3">
        <Skeleton width="200px" height="14px" />
      </div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <div className="d-flex align-items-center gap-2 mb-1">
            <Skeleton variant="circular" width="32px" height="32px" />
            <Skeleton width="200px" height="28px" />
            <Skeleton width="50px" height="24px" borderRadius="12px" />
          </div>
          <Skeleton width="250px" height="14px" />
        </div>
      </div>
      <div className="row g-4">
        {/* Settings column */}
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header">
              <Skeleton width="120px" height="20px" />
            </div>
            <div className="card-body">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mb-3">
                  <Skeleton width="80px" height="14px" className="mb-1" />
                  <Skeleton width="100%" height="38px" borderRadius="6px" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Members column */}
        <div className="col-12 col-lg-6">
          <div className="card">
            <div className="card-header">
              <Skeleton width="100px" height="20px" />
            </div>
            <div className="card-body p-0">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="d-flex align-items-center justify-content-between p-3 border-bottom"
                >
                  <div className="d-flex align-items-center gap-2">
                    <Skeleton variant="circular" width="36px" height="36px" />
                    <div>
                      <Skeleton width="120px" height="16px" className="mb-1" />
                      <Skeleton width="160px" height="12px" />
                    </div>
                  </div>
                  <Skeleton width="60px" height="24px" borderRadius="12px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Overview Skeleton ─────────────────────────────────────────────

export function AnalyticsOverviewSkeleton() {
  return (
    <div className="analytics-page">
      <div className="row">
        <div className="col-12">
          <PageHeaderSkeleton />
          {/* Stats cards */}
          <div className="row mb-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="col-lg-3 col-md-6 mb-3">
                <div className="card">
                  <div className="card-body">
                    <Skeleton width="50%" height="12px" className="mb-2" />
                    <Skeleton width="70%" height="24px" className="mb-1" />
                    <Skeleton width="40%" height="12px" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Charts row */}
          <div className="row">
            {/* Top Categories Table - LEFT */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <Skeleton width="180px" height="20px" />
                </div>
                <div className="card-body p-0">
                  <TableSkeleton
                    rows={5}
                    columns={3}
                    className="border-0 shadow-none"
                  />
                </div>
              </div>
            </div>
            {/* Category Distribution Pie Chart - RIGHT */}
            <div className="col-lg-8 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <Skeleton width="160px" height="20px" />
                </div>
                <div
                  className="card-body d-flex justify-content-center align-items-center"
                  style={{ minHeight: "300px" }}
                >
                  <Skeleton variant="circular" width="220px" height="220px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Skeleton ───────────────────────────────────────────────────────

export function TimelineSkeleton() {
  return (
    <div className="analytics-page">
      <div className="row">
        <div className="col-12">
          <PageHeaderSkeleton />
          {/* Period selector card */}
          <div className="card mb-4">
            <div className="card-body">
              <Skeleton width="100px" height="18px" className="mb-3" />
              <div className="row g-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="col-md-3">
                    <Skeleton width="100%" height="38px" borderRadius="6px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Charts - side by side */}
          <div className="row mb-4">
            <div className="col-lg-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <Skeleton width="160px" height="20px" />
                </div>
                <div className="card-body" style={{ minHeight: "300px" }}>
                  <Skeleton variant="rounded" width="100%" height="250px" />
                </div>
              </div>
            </div>
            <div className="col-lg-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <Skeleton width="180px" height="20px" />
                </div>
                <div className="card-body" style={{ minHeight: "300px" }}>
                  <Skeleton variant="rounded" width="100%" height="250px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Analytics Skeleton ─────────────────────────────────────────────────

export function UserAnalyticsSkeleton() {
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <PageHeaderSkeleton />
          {/* Balance cards - 2 cards matching real page */}
          <div className="row g-2 mb-4">
            <div className="col-6">
              <div className="card h-100">
                <div className="card-body">
                  <Skeleton width="60%" height="14px" className="mb-2" />
                  <Skeleton width="50%" height="24px" className="mb-1" />
                  <Skeleton width="40%" height="12px" />
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card h-100">
                <div className="card-body">
                  <Skeleton width="60%" height="14px" className="mb-2" />
                  <Skeleton width="50%" height="24px" className="mb-1" />
                  <Skeleton width="40%" height="12px" />
                </div>
              </div>
            </div>
          </div>
          {/* Charts row */}
          <div className="row g-2 mb-4">
            <div className="col-12 col-lg-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <Skeleton width="160px" height="20px" />
                </div>
                <div
                  className="card-body d-flex justify-content-center"
                  style={{ minHeight: "280px" }}
                >
                  <Skeleton variant="circular" width="220px" height="220px" />
                </div>
              </div>
            </div>
            <div className="col-12 col-lg-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <Skeleton width="160px" height="20px" />
                </div>
                <div className="card-body" style={{ minHeight: "280px" }}>
                  <Skeleton variant="rounded" width="100%" height="240px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Security Settings Skeleton ──────────────────────────────────────────────

export function SecuritySettingsSkeleton() {
  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-lg-10 col-xl-8 mx-auto">
          <div className="mb-3">
            <Skeleton width="200px" height="14px" />
          </div>
          <PageHeaderSkeleton />
          <div className="card">
            <div className="card-header">
              <Skeleton width="200px" height="20px" />
            </div>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                  <Skeleton width="120px" height="18px" className="mb-1" />
                  <Skeleton width="250px" height="14px" />
                </div>
                <Skeleton width="100px" height="38px" borderRadius="6px" />
              </div>
              <div className="border rounded p-3">
                <Skeleton width="80%" height="14px" className="mb-2" />
                <Skeleton width="60%" height="14px" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sessions Skeleton ───────────────────────────────────────────────────────

export function SessionsSkeleton() {
  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-lg-10 col-xl-8 mx-auto">
          <div className="mb-3">
            <Skeleton width="200px" height="14px" />
          </div>
          <PageHeaderSkeleton />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start">
                  <div className="d-flex gap-3">
                    <Skeleton width="36px" height="36px" borderRadius="8px" />
                    <div>
                      <Skeleton width="150px" height="18px" className="mb-2" />
                      <Skeleton width="200px" height="14px" className="mb-1" />
                      <Skeleton width="120px" height="12px" />
                    </div>
                  </div>
                  <Skeleton width="80px" height="32px" borderRadius="6px" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Login History Skeleton ──────────────────────────────────────────────────

export function LoginHistorySkeleton() {
  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-lg-10 col-xl-10 mx-auto">
          <div className="mb-3">
            <Skeleton width="200px" height="14px" />
          </div>
          <PageHeaderSkeleton hasSubtitle />
          {/* Stats cards */}
          <div className="row g-3 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="col-md-4">
                <div className="border rounded p-3 text-center">
                  <Skeleton
                    width="40%"
                    height="12px"
                    className="mb-2 mx-auto"
                  />
                  <Skeleton width="30%" height="24px" className="mx-auto" />
                </div>
              </div>
            ))}
          </div>
          {/* Filter tabs */}
          <div className="d-flex gap-2 mb-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} width="80px" height="36px" borderRadius="6px" />
            ))}
          </div>
          {/* History list */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card mb-2">
              <div className="card-body py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex gap-3 align-items-center">
                    <Skeleton width="28px" height="28px" borderRadius="6px" />
                    <div>
                      <Skeleton width="180px" height="16px" className="mb-1" />
                      <Skeleton width="120px" height="12px" />
                    </div>
                  </div>
                  <div className="text-end">
                    <Skeleton width="100px" height="14px" className="mb-1" />
                    <Skeleton width="60px" height="22px" borderRadius="12px" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// ─── App Shell Skeleton ──────────────────────────────────────────────────
// Used during auth loading on protected routes (shows app-like layout, not login form)

export function AppShellSkeleton() {
  return (
    <>
      {/* Navbar skeleton */}
      <nav
        className="navbar navbar-expand-lg sticky-top"
        style={{
          backgroundColor: "var(--navbar-bg)",
          borderBottom: "1px solid var(--border-primary)",
          boxShadow: "var(--navbar-shadow)",
          minHeight: "56px",
        }}
        aria-hidden="true"
      >
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <Skeleton
              variant="circular"
              width="28px"
              height="28px"
              className="me-2"
            />
            <Skeleton width="130px" height="22px" />
          </div>
          <div className="d-none d-lg-flex gap-3 ms-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} width={`${60 + i * 10}px`} height="16px" />
            ))}
          </div>
          <div className="d-flex align-items-center gap-3 ms-auto">
            <Skeleton variant="circular" width="32px" height="32px" />
            <Skeleton width="80px" height="32px" borderRadius="6px" />
          </div>
        </div>
      </nav>
      {/* Content placeholder */}
      <main className="container-fluid py-4">
        <div className="row">
          <div className="col-12">
            <PageHeaderSkeleton />
            <StatsCardSkeleton count={3} />
            <div className="row">
              <div className="col-md-8">
                <Skeleton variant="rounded" width="100%" height="300px" />
              </div>
              <div className="col-md-4">
                <Skeleton variant="rounded" width="100%" height="300px" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
// ─── Auth Page Skeleton ──────────────────────────────────────────────────────

export function AuthPageSkeleton() {
  return (
    <div
      className="d-flex justify-content-center align-items-center min-vh-100"
      style={{ backgroundColor: "var(--body-bg)" }}
    >
      <div style={{ width: "100%", maxWidth: "450px" }}>
        <div className="card shadow">
          <div className="card-body p-4">
            <div className="text-center mb-4">
              <Skeleton
                variant="circular"
                width="60px"
                height="60px"
                className="mx-auto mb-3"
              />
              <Skeleton width="60%" height="24px" className="mx-auto mb-2" />
              <Skeleton width="40%" height="14px" className="mx-auto" />
            </div>
            {/* Form fields */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="mb-3">
                <Skeleton width="60px" height="14px" className="mb-2" />
                <Skeleton width="100%" height="42px" borderRadius="6px" />
              </div>
            ))}
            <Skeleton
              width="100%"
              height="42px"
              borderRadius="6px"
              className="mt-3"
            />
            <div className="text-center mt-3">
              <Skeleton width="70%" height="14px" className="mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
