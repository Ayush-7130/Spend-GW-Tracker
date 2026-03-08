/**
 * Profile Page - Simplified Version
 *
 * Allows users to:
 * 1. View their profile information
 * 2. Update their name and email
 * 3. Change their password
 * 4. Manage their groups
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useGroup } from "@/contexts/GroupContext";
import {
  LoadingSpinner,
  Modal,
  PageHeader,
  InfoCard,
  SectionHeader,
  ProfileSkeleton,
} from "@/shared/components";
import Badge from "@/shared/components/Badge/Badge";
import { isValidPassword } from "@/lib/utils/security";

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { notifySuccess, notifyError } = useOperationNotification();
  const { groups, activeGroup, isLoading: groupsLoading } = useGroup();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [activeSessions, setActiveSessions] = useState<number>(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // Profile form state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileErrors, setProfileErrors] = useState<{
    name?: string;
    email?: string;
  }>({});
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch("/api/auth/profile");
        const data = await response.json();

        if (response.ok) {
          setProfile(data.data);
          setProfileName(data.data.name);
          setProfileEmail(data.data.email);
        } else {
          notifyError("Load Profile", data.error);
        }
      } catch {
        notifyError("Load Profile", "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
    // eslint-disable-next-line
  }, []); // Only run once on mount

  // Fetch security stats (active sessions count)
  useEffect(() => {
    async function fetchSecurityStats() {
      try {
        const response = await fetch("/api/auth/sessions");
        const data = await response.json();

        if (response.ok && data.success) {
          setActiveSessions(data.data.total || 0);
        }
      } catch {
      } finally {
        setLoadingStats(false);
      }
    }

    fetchSecurityStats();
  }, []);

  // Handle profile update
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrors({});

    // Validation
    const errors: { name?: string; email?: string } = {};

    if (!profileName || profileName.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long";
    }

    if (!profileEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileEmail)) {
      errors.email = "Invalid email format";
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    setProfileSubmitting(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileName,
          email: profileEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setProfileErrors(data.errors);
        } else {
          notifyError("Update Profile", data.error);
        }
        return;
      }

      setProfile(data.data);
      notifySuccess("Update Profile", "profile");
    } catch {
      notifyError("Update Profile", "Failed to update profile");
    } finally {
      setProfileSubmitting(false);
    }
  };

  // Handle password change
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    // Validation
    const errors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      errors.currentPassword = "Current password is required";
    }

    if (!newPassword) {
      errors.newPassword = "New password is required";
    } else {
      const passwordValidation = isValidPassword(newPassword);
      if (!passwordValidation.valid && passwordValidation.message) {
        errors.newPassword = passwordValidation.message;
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Password confirmation is required";
    } else if (confirmPassword !== newPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setPasswordSubmitting(true);

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          setPasswordErrors(data.errors);
        } else {
          notifyError("Change Password", data.error);
        }
        return;
      }

      notifySuccess("Change Password", "password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordModal(false);
    } catch {
      notifyError("Change Password", "Failed to change password");
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <ProfileSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-4">
        {/* Page Header */}
        <PageHeader
          title="My Profile"
          icon="bi bi-person-circle"
          subtitle="Manage your account settings and password"
        />

        {/* Profile Card */}
        <div className="row">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header">
                <SectionHeader
                  title="Profile Information"
                  icon="bi bi-person"
                  size="sm"
                  marginBottom={false}
                />
              </div>

              <div className="card-body">
                {profile && (
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <InfoCard
                        icon="bi bi-calendar-plus"
                        label="Account Created"
                        value={new Date(profile.createdAt).toLocaleDateString()}
                        size="md"
                      />
                    </div>
                    <div className="col-md-4">
                      <InfoCard
                        icon="bi bi-clock-history"
                        label="Last Updated"
                        value={new Date(profile.updatedAt).toLocaleDateString()}
                        size="md"
                      />
                    </div>
                    <div className="col-md-4">
                      <InfoCard
                        icon="bi bi-shield-check"
                        label="Account Role"
                        value={
                          <span className="text-capitalize">
                            {profile.role}
                          </span>
                        }
                        size="md"
                      />
                    </div>
                  </div>
                )}

                <form onSubmit={handleProfileSubmit}>
                  <div className="mb-3">
                    <label htmlFor="name" className="form-label">
                      <i className="bi bi-person me-2"></i>
                      Name
                    </label>
                    <input
                      type="text"
                      className={`form-control ${profileErrors.name ? "is-invalid" : ""}`}
                      id="name"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                    {profileErrors.name && (
                      <div className="invalid-feedback">
                        {profileErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <label htmlFor="email" className="form-label">
                      <i className="bi bi-envelope me-2"></i>
                      Email
                    </label>
                    <input
                      type="email"
                      className={`form-control ${profileErrors.email ? "is-invalid" : ""}`}
                      id="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      required
                    />
                    {profileErrors.email && (
                      <div className="invalid-feedback">
                        {profileErrors.email}
                      </div>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={profileSubmitting}
                      aria-label="Update profile"
                    >
                      {profileSubmitting ? (
                        <>
                          <span
                            className="spinner-border spinner-border-sm me-2"
                            role="status"
                            aria-hidden="true"
                          ></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Update Profile
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        if (profile) {
                          setProfileName(profile.name);
                          setProfileEmail(profile.email);
                          setProfileErrors({});
                        }
                      }}
                    >
                      <i className="bi bi-x-circle me-2"></i>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Change Password Card - Moved to Left Column */}
            <div className="card shadow-sm mt-3">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-shield-lock me-2"></i>
                  Change Password
                </h5>
              </div>
              <div className="card-body">
                <p
                  className="small mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Keep your account secure by updating your password regularly
                </p>
                <button
                  type="button"
                  className="btn btn-outline-primary w-100"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <i className="bi bi-key me-2"></i>
                  Change Password
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-lg-4 mt-4 mt-lg-0">
            {/* Group Management Card */}
            <div className="card shadow-sm mb-3">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-people-fill me-2"></i>
                  My Groups
                </h5>
              </div>
              <div className="card-body">
                {groupsLoading ? (
                  <div className="text-center py-3">
                    <LoadingSpinner config={{ size: "small" }} />
                  </div>
                ) : (
                  <>
                    {activeGroup ? (
                      <div className="mb-3">
                        <div className="border rounded p-3 bg-light">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div>
                              <div className="fw-bold text-primary">
                                <i className="bi bi-check-circle-fill me-2"></i>
                                Active Group
                              </div>
                              <div className="h6 mb-1 mt-2">
                                {activeGroup.name}
                              </div>
                              <small className="text-muted">
                                <i className="bi bi-people me-1"></i>
                                {activeGroup.memberCount || 0} member
                                {activeGroup.memberCount !== 1 ? "s" : ""}
                              </small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="alert alert-info mb-3">
                        <i className="bi bi-info-circle me-2"></i>
                        <small>No active group selected</small>
                      </div>
                    )}
                    <div className="d-grid gap-2">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => router.push("/groups")}
                      >
                        <i className="bi bi-gear me-2"></i>
                        Manage Groups
                      </button>
                      <small className="text-muted text-center">
                        {groups.length} total group
                        {groups.length !== 1 ? "s" : ""}
                      </small>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Security Actions */}
            <div className="card shadow-sm mt-3">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-shield-lock me-2"></i>
                  Security & Privacy
                </h5>
              </div>
              <div className="card-body">
                <p
                  className="small mb-3"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Manage your account security settings
                </p>
                <div className="d-grid gap-2">
                  <Link
                    href="/security/settings"
                    className="btn btn-outline-primary d-flex justify-content-between align-items-center"
                  >
                    <span>
                      <i className="bi bi-gear me-2"></i>
                      Security Settings
                    </span>
                    <i className="bi bi-chevron-right"></i>
                  </Link>
                  <Link
                    href="/security/sessions"
                    className="btn btn-outline-primary d-flex justify-content-between align-items-center"
                  >
                    <span>
                      <i className="bi bi-laptop me-2"></i>
                      Active Sessions
                    </span>
                    <Badge variant="primary">
                      {loadingStats ? "..." : activeSessions}
                    </Badge>
                  </Link>
                  <Link
                    href="/security/login-history"
                    className="btn btn-outline-secondary d-flex justify-content-between align-items-center"
                  >
                    <span>
                      <i className="bi bi-clock-history me-2"></i>
                      Login History
                    </span>
                    <i className="bi bi-chevron-right"></i>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Modal */}
        <Modal
          show={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setPasswordErrors({});
          }}
          title="Change Password"
          size="md"
          centered
        >
          <div className="alert alert-warning mb-4 d-flex flex-column flex-sm-row align-items-start">
            <i className="bi bi-shield-exclamation me-2 mb-2 mb-sm-0 flex-shrink-0"></i>
            <div className="small">
              <strong className="d-block mb-2">Password Requirements:</strong>
              <ul className="mb-0 ps-3">
                <li>At least 8 characters long</li>
                <li>Contains uppercase and lowercase letters</li>
                <li>Contains at least one number</li>
                <li>Different from your current password</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-3">
              <label htmlFor="currentPassword" className="form-label">
                <i className="bi bi-lock me-2"></i>
                Current Password
              </label>
              <input
                type="password"
                className={`form-control ${passwordErrors.currentPassword ? "is-invalid" : ""}`}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              {passwordErrors.currentPassword && (
                <div className="invalid-feedback">
                  {passwordErrors.currentPassword}
                </div>
              )}
            </div>

            <div className="mb-3">
              <label htmlFor="newPassword" className="form-label">
                <i className="bi bi-shield-lock me-2"></i>
                New Password
              </label>
              <input
                type="password"
                className={`form-control ${passwordErrors.newPassword ? "is-invalid" : ""}`}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {passwordErrors.newPassword && (
                <div className="invalid-feedback">
                  {passwordErrors.newPassword}
                </div>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">
                <i className="bi bi-shield-check me-2"></i>
                Confirm New Password
              </label>
              <input
                type="password"
                className={`form-control ${passwordErrors.confirmPassword ? "is-invalid" : ""}`}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              {passwordErrors.confirmPassword && (
                <div className="invalid-feedback">
                  {passwordErrors.confirmPassword}
                </div>
              )}
            </div>

            <div className="d-flex flex-column flex-sm-row gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-secondary order-2 order-sm-1"
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordErrors({});
                }}
              >
                <i className="bi bi-x-circle me-2"></i>
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary order-1 order-sm-2"
                disabled={passwordSubmitting}
                aria-label="Change password"
              >
                {passwordSubmitting ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    ></span>
                    Changing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-shield-check me-2"></i>
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
