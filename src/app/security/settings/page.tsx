/**
 * Security Settings Page
 * Manage MFA and view login history
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/MainLayout";
import Badge from "@/shared/components/Badge/Badge";
import Breadcrumb from "@/components/Breadcrumb";
import { PageHeader, SecuritySettingsSkeleton } from "@/shared/components";

interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
}

interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface LoginHistoryItem {
  timestamp: string;
  success: boolean;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  location?: string;
  failureReason?: string;
}

export default function SecuritySettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MFASetup | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<
    "idle" | "qr" | "verify" | "backup"
  >("idle");
  const [mfaCode, setMfaCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch MFA status
      const mfaResponse = await fetch("/api/auth/mfa/setup", {
        credentials: "include",
      });

      if (mfaResponse.status === 401) {
        router.push("/login");
        return;
      }

      const mfaData = await mfaResponse.json();
      if (mfaData.success) {
        setMfaStatus(mfaData.data);
      }

      // Fetch login history
      const historyResponse = await fetch(
        "/api/security/login-history?limit=10",
        {
          credentials: "include",
        }
      );

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.success) {
          setLoginHistory(historyData.data.history);
        }
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function setupMFA() {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setMfaSetup(data.data);
        setSetupStep("qr");
      } else {
        setError(data.error || "Failed to setup MFA");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function verifyMFA() {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: mfaCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("MFA enabled successfully!");
        setSetupStep("backup");
        setMfaStatus({
          enabled: true,
          backupCodesRemaining: mfaSetup?.backupCodes.length,
        });
      } else {
        setError(data.error || "Invalid code");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function disableMFA() {
    if (!password) {
      setError("Password is required");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to disable MFA? This will make your account less secure."
      )
    ) {
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("MFA disabled successfully");
        setMfaStatus({ enabled: false });
        setPassword("");
      } else {
        setError(data.error || "Failed to disable MFA");
      }
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  if (loading && !mfaStatus) {
    return (
      <MainLayout>
        <SecuritySettingsSkeleton />
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
                { label: "Security Settings" },
              ]}
            />
            <PageHeader title="Security Settings" size="md" />

            {/* MFA Section */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Two-Factor Authentication (2FA)</h5>
                <p style={{ color: "var(--text-secondary)" }}>
                  Add an extra layer of security to your account by requiring a
                  code from your authenticator app when signing in.
                </p>

                {error && <div className="alert alert-danger">{error}</div>}
                {success && (
                  <div className="alert alert-success">{success}</div>
                )}

                {mfaStatus?.enabled ? (
                  <div>
                    <div className="alert alert-success">
                      <i className="bi bi-shield-check me-2"></i>
                      Two-factor authentication is enabled
                      {mfaStatus.backupCodesRemaining !== undefined && (
                        <div className="mt-2 small">
                          Backup codes remaining:{" "}
                          {mfaStatus.backupCodesRemaining}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label" htmlFor="mfa-password">
                        Password
                      </label>
                      <input
                        type="password"
                        className="form-control"
                        id="mfa-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password to disable MFA"
                        autoComplete="current-password"
                      />
                    </div>

                    <button
                      className="btn btn-danger"
                      onClick={disableMFA}
                      disabled={loading || !password}
                      aria-label="Disable MFA"
                    >
                      {loading ? "Disabling..." : "Disable MFA"}
                    </button>
                  </div>
                ) : setupStep === "idle" ? (
                  <button
                    className="btn btn-primary"
                    onClick={setupMFA}
                    disabled={loading}
                    aria-label="Enable two-factor authentication"
                  >
                    {loading
                      ? "Setting up..."
                      : "Enable Two-Factor Authentication"}
                  </button>
                ) : setupStep === "qr" && mfaSetup ? (
                  <div>
                    <h6>Step 1: Scan QR Code</h6>
                    <p
                      className="small"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Scan this QR code with your authenticator app (Google
                      Authenticator, Authy, etc.)
                    </p>

                    <div className="text-center my-3">
                      <Image
                        src={mfaSetup.qrCode}
                        alt="MFA QR Code"
                        width={200}
                        height={200}
                        unoptimized
                      />
                    </div>

                    <p
                      className="small"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Or enter this code manually:{" "}
                      <code>{mfaSetup.secret}</code>
                    </p>

                    <h6 className="mt-4">Step 2: Enter Verification Code</h6>
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter 6-digit code"
                        value={mfaCode}
                        onChange={(e) =>
                          setMfaCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        maxLength={6}
                      />
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={verifyMFA}
                      disabled={loading || mfaCode.length !== 6}
                      aria-label="Verify and enable MFA"
                    >
                      {loading ? "Verifying..." : "Verify and Enable"}
                    </button>
                    <button
                      className="btn btn-outline-secondary ms-2"
                      onClick={() => {
                        setSetupStep("idle");
                        setMfaSetup(null);
                        setMfaCode("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : setupStep === "backup" && mfaSetup ? (
                  <div>
                    <h6>Backup Codes</h6>
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Save these backup codes in a safe place. You can use them
                      to access your account if you lose your device.
                    </div>

                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="row g-2">
                          {mfaSetup.backupCodes.map((code, index) => (
                            <div key={index} className="col-6">
                              <code className="d-block p-2 bg-white rounded">
                                {code}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary mt-3"
                      onClick={() => {
                        setSetupStep("idle");
                        setMfaSetup(null);
                        setSuccess(null);
                        fetchData();
                      }}
                    >
                      Done
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Login History Section */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Recent Login Activity</h5>
                  <a
                    href="/security/login-history"
                    className="btn btn-sm btn-outline-primary"
                  >
                    View All
                  </a>
                </div>

                {loginHistory.length === 0 ? (
                  <p
                    className="text-center py-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No login history available
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {loginHistory.map((item, index) => (
                      <div
                        key={index}
                        className="border rounded p-3"
                        style={{
                          backgroundColor: item.success
                            ? "var(--bg-secondary)"
                            : "var(--notification-error-bg)",
                          borderColor: item.success
                            ? "var(--border-secondary)"
                            : "var(--notification-error-border)",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              {item.success ? (
                                <Badge variant="success">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Success
                                </Badge>
                              ) : (
                                <Badge
                                  variant="danger"
                                  title={item.failureReason}
                                >
                                  <i className="bi bi-x-circle me-1"></i>
                                  Failed
                                </Badge>
                              )}
                              <span className="small fw-medium">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>
                            <div
                              className="small"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <i className="bi bi-laptop me-1"></i>
                              {item.device}
                            </div>
                            <div
                              className="small"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <i className="bi bi-browser-chrome me-1"></i>
                              {item.browser} on {item.os}
                            </div>
                            <div
                              className="small"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <i className="bi bi-geo-alt me-1"></i>
                              {item.location || item.ipAddress}
                            </div>
                          </div>
                        </div>
                        {!item.success && item.failureReason && (
                          <div className="mt-2">
                            <Badge variant="warning">
                              {item.failureReason}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Additional Security</h5>
                <div className="d-grid gap-2">
                  <Link
                    href="/security/sessions"
                    className="btn btn-outline-primary"
                  >
                    <i className="bi bi-laptop me-2"></i>
                    Manage Active Sessions
                  </Link>
                  <Link href="/profile" className="btn btn-outline-primary">
                    <i className="bi bi-key me-2"></i>
                    Change Password
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/" className="btn btn-outline-secondary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
