/**
 * Sessions Management Page
 * View and manage active sessions
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useNotification } from "@/contexts/NotificationContext";
import Badge from "@/shared/components/Badge/Badge";
import Breadcrumb from "@/components/Breadcrumb";
import {
  SearchInput,
  useSearch,
  PageHeader,
  SessionsSkeleton,
} from "@/shared/components";

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface ConfirmDialogState {
  show: boolean;
  title: string;
  message: string;
  type: "danger" | "warning" | "info";
  onConfirm: () => void;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    show: false,
    title: "",
    message: "",
    type: "danger",
    onConfirm: () => {},
  });
  const router = useRouter();
  const { showWarning, showError } = useNotification();

  // Use canonical search hook for filtering sessions
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredData: filteredSessions,
  } = useSearch({
    data: sessions,
    searchFields: ["device", "browser", "os", "ipAddress", "location"],
    debounceMs: 200,
  });

  // Show search when there are more than 3 sessions
  const showSearch = sessions.length > 3;

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/sessions", {
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSessions(data.data.sessions);
      } else {
        setError(data.error || "Failed to fetch sessions");
      }
    } catch {
      setError("An error occurred while fetching sessions");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSessions();
    // eslint-disable-next-line
  }, []);

  function promptRevokeSession(sessionId: string, isCurrent: boolean) {
    setConfirmDialog({
      show: true,
      title: isCurrent ? "Revoke Current Session" : "Revoke Session",
      message: isCurrent
        ? "This will log you out from this device. You will need to log in again. Continue?"
        : "Are you sure you want to revoke this session? This will log out the device immediately.",
      type: "danger",
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, show: false });
        revokeSession(sessionId, isCurrent);
      },
    });
  }

  async function revokeSession(sessionId: string, isCurrent: boolean) {
    try {
      setRevoking(sessionId);
      const response = await fetch(
        `/api/auth/sessions?sessionId=${sessionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (data.success) {
        if (isCurrent) {
          // Redirect to login if current session was revoked
          router.push("/login");
        } else {
          // Refresh sessions list
          fetchSessions();
        }
      } else {
        showError(
          "Failed to Revoke Session",
          data.error || "Failed to revoke session",
          7000
        );
      }
    } catch {
      showError("Error", "An error occurred while revoking session", 7000);
    } finally {
      setRevoking(null);
    }
  }

  function promptRevokeAllOther() {
    setConfirmDialog({
      show: true,
      title: "Revoke All Other Sessions",
      message:
        "This will log you out from all other devices except this one. All other active sessions will be terminated immediately. Continue?",
      type: "warning",
      onConfirm: () => {
        setConfirmDialog({ ...confirmDialog, show: false });
        revokeAllOther();
      },
    });
  }

  async function revokeAllOther() {
    try {
      setRevoking("all");
      const response = await fetch("/api/auth/sessions?revokeAll=true", {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        fetchSessions();
      } else {
        // Check if this is a 24-hour restriction error (403 status)
        if (response.status === 403 && data.error?.includes("wait")) {
          showWarning("Session Restriction", data.error, 8000);
        } else {
          showError(
            "Failed to Revoke Sessions",
            data.error || "Failed to revoke sessions",
            7000
          );
        }
      }
    } catch {
      showError("Error", "An error occurred while revoking sessions", 7000);
    } finally {
      setRevoking(null);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  function getDeviceIcon(deviceType: string): string {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return "📱";
      case "tablet":
        return "📱";
      case "desktop":
      default:
        return "💻";
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <SessionsSkeleton />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container py-5">
          <div className="alert alert-danger">{error}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-4">
        <div className="row">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <Breadcrumb
              items={[
                { label: "Profile", href: "/profile" },
                { label: "Active Sessions" },
              ]}
            />
            <PageHeader
              title="Active Sessions"
              size="md"
              actions={
                sessions.length > 1 && (
                  <button
                    className="btn btn-outline-danger"
                    onClick={promptRevokeAllOther}
                    disabled={revoking === "all"}
                    aria-label="Revoke all other sessions"
                  >
                    {revoking === "all"
                      ? "Revoking..."
                      : "Revoke All Other Sessions"}
                  </button>
                )
              }
            />
            <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
              Manage devices where you&apos;re currently logged in. If you see a
              session you don&apos;t recognize, revoke it immediately.
            </p>

            {/* Search Input - Audit: Active Sessions search */}
            {showSearch && (
              <div className="mb-4">
                <div className="row">
                  <div className="col-md-4">
                    <SearchInput
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Filter by device, IP, or location..."
                      ariaLabel="Filter sessions"
                    />
                  </div>
                  {searchQuery && (
                    <div className="col-12 mt-2">
                      <small className="text-muted">
                        Showing {filteredSessions.length} of {sessions.length}{" "}
                        sessions
                      </small>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="row g-3">
              {filteredSessions.length === 0 && searchQuery ? (
                <div className="col-12">
                  <div className="alert alert-info d-flex align-items-center justify-content-between">
                    <span>No sessions match &quot;{searchQuery}&quot;</span>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </button>
                  </div>
                </div>
              ) : (
                filteredSessions.map((session) => (
                  <div key={session.id} className="col-12">
                    <div
                      className={`card ${session.isCurrent ? "border-primary" : ""}`}
                    >
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div className="flex-grow-1" style={{ minWidth: 0 }}>
                            <div className="d-flex align-items-center mb-2">
                              <span
                                className="me-2"
                                style={{ fontSize: "24px" }}
                              >
                                {getDeviceIcon(session.deviceType)}
                              </span>
                              <div>
                                <h5
                                  className="mb-0"
                                  aria-label={
                                    session.device || "Session device"
                                  }
                                >
                                  {session.device}
                                  {session.isCurrent && (
                                    <Badge variant="primary" className="ms-2">
                                      Current
                                    </Badge>
                                  )}
                                </h5>
                                <small
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {session.ipAddress}
                                </small>
                              </div>
                            </div>

                            <div
                              className="row g-2 small"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {session.location && (
                                <div className="col-12">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  {session.location}
                                </div>
                              )}
                              <div className="col-md-6">
                                <i className="bi bi-clock me-1"></i>
                                Last active:{" "}
                                {formatDate(session.lastActivityAt)}
                              </div>
                              <div className="col-md-6">
                                <i className="bi bi-calendar me-1"></i>
                                Created: {formatDate(session.createdAt)}
                              </div>
                            </div>
                          </div>

                          <button
                            className={`btn btn-sm ${session.isCurrent ? "btn-outline-danger" : "btn-outline-secondary"} flex-shrink-0`}
                            onClick={() =>
                              promptRevokeSession(session.id, session.isCurrent)
                            }
                            disabled={revoking === session.id}
                            aria-label={
                              session.isCurrent
                                ? "Logout this session"
                                : "Revoke session"
                            }
                          >
                            {revoking === session.id ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                              />
                            ) : session.isCurrent ? (
                              "Logout"
                            ) : (
                              "Revoke"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {sessions.length === 0 && (
              <div className="alert alert-info">No active sessions found.</div>
            )}
            <div className="mt-4">
              <Link
                href="/security/settings"
                className="btn btn-outline-primary me-2"
              >
                Security Settings
              </Link>
              <Link href="/" className="btn btn-outline-secondary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <ConfirmationDialog
        show={confirmDialog.show}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Confirm"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, show: false })}
      />
    </MainLayout>
  );
}
