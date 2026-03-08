"use client";

import React, { useState, useMemo } from "react";
import { useGroup } from "@/contexts/GroupContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirmation } from "@/hooks/useConfirmation";
import { LoadingSpinner, SearchInput } from "@/shared/components";
import ConfirmationDialog from "./ConfirmationDialog";
import Badge from "@/shared/components/Badge/Badge";

interface MemberListProps {
  groupId: string;
  members: Array<{
    userId: string;
    name?: string;
    role: "admin" | "member";
    joinedAt: Date;
    status?: "active" | "left";
    leftAt?: Date;
  }>;
}

export function MemberList({ groupId, members }: MemberListProps) {
  const { removeMember, updateMemberRole, isLoading, isGroupAdmin } =
    useGroup();
  const { user } = useAuth();
  const { show, config, confirm, handleConfirm, handleCancel } =
    useConfirmation();
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFormerMembers, setShowFormerMembers] = useState(false);

  const isAdmin = isGroupAdmin(groupId);
  const isCurrentUser = (userId: string) => userId === user?.id;

  // Split members into active and former (left)
  const activeMembers = members.filter(
    (m) => !m.status || m.status === "active"
  );
  const formerMembers = members.filter((m) => m.status === "left");

  // Filter active members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return activeMembers;
    const query = searchQuery.toLowerCase();
    return activeMembers.filter((member) => {
      const name = (member.name || "").toLowerCase();
      return (
        name.includes(query) || member.userId.toLowerCase().includes(query)
      );
    });
  }, [activeMembers, searchQuery]);

  // Show search when there are more than 5 active members
  const showSearch = activeMembers.length > 5;

  const handleRemoveMember = async (userId: string, userName: string) => {
    const confirmed = await confirm({
      title: "Remove Member",
      message: `Are you sure you want to remove ${userName} from this group? They will lose access to all group data.`,
      confirmText: "Remove",
      type: "danger",
    });

    if (confirmed) {
      setLoadingMemberId(userId);
      try {
        await removeMember(groupId, userId);
      } finally {
        setLoadingMemberId(null);
      }
    }
  };

  const handleToggleRole = async (
    userId: string,
    currentRole: "admin" | "member"
  ) => {
    const newRole = currentRole === "admin" ? "member" : "admin";
    setLoadingMemberId(userId);
    try {
      await updateMemberRole(groupId, userId, newRole);
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <>
      <div className="card">
        <div className="card-header border-bottom">
          <h5 className="card-title mb-0 d-flex align-items-center gap-2">
            <i className="bi bi-people-fill text-primary"></i>
            Members
            <Badge variant="secondary" className="ms-auto">
              {activeMembers.length}
            </Badge>
          </h5>
        </div>
        <div className="card-body p-0">
          {/* Search Input - Audit: Members list search */}
          {showSearch && (
            <div className="p-3 border-bottom">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search members..."
                size="sm"
                ariaLabel="Search members"
              />
              {searchQuery && (
                <small className="text-muted d-block mt-2">
                  Showing {filteredMembers.length} of {activeMembers.length}{" "}
                  members
                </small>
              )}
            </div>
          )}

          {activeMembers.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <i className="bi bi-people display-4 d-block mb-3 opacity-25"></i>
              <p>No members in this group</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-search display-6 d-block mb-2 opacity-25"></i>
              <p className="mb-0">No members match &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredMembers.map((member) => {
                const displayName = member.name || member.userId;
                return (
                  <div
                    key={member.userId}
                    className={`list-group-item ${
                      isCurrentUser(member.userId) ? "member-highlight" : ""
                    }`}
                  >
                    <div className="d-flex align-items-center gap-3">
                      {/* Avatar */}
                      <div
                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                        style={{
                          width: "48px",
                          height: "48px",
                          fontSize: "1.1rem",
                        }}
                        aria-hidden="true"
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>

                      {/* Member Info */}
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <h6 className="mb-0">
                            {displayName}
                            {isCurrentUser(member.userId) && (
                              <Badge variant="info" className="ms-2">
                                You
                              </Badge>
                            )}
                          </h6>
                          {member.role === "admin" && (
                            <Badge variant="warning">
                              <i className="bi bi-shield-fill-check me-1"></i>
                              Admin
                            </Badge>
                          )}
                        </div>
                        <small className="text-muted">
                          <i className="bi bi-calendar-check me-1"></i>
                          Joined{" "}
                          {new Date(member.joinedAt).toLocaleDateString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </small>
                      </div>

                      {/* Actions */}
                      {isAdmin && !isCurrentUser(member.userId) && (
                        <div className="d-flex gap-2">
                          {loadingMemberId === member.userId ? (
                            <LoadingSpinner
                              config={{ size: "small", variant: "primary" }}
                            />
                          ) : (
                            <>
                              <button
                                className={`btn btn-sm ${
                                  member.role === "admin"
                                    ? "btn-outline-secondary"
                                    : "btn-outline-warning"
                                }`}
                                onClick={() =>
                                  handleToggleRole(member.userId, member.role)
                                }
                                disabled={isLoading}
                                title={
                                  member.role === "admin"
                                    ? "Remove admin role"
                                    : "Make admin"
                                }
                                aria-label={
                                  member.role === "admin"
                                    ? `Remove admin role from ${displayName}`
                                    : `Make ${displayName} an admin`
                                }
                              >
                                <i
                                  className={`bi ${
                                    member.role === "admin"
                                      ? "bi-shield-slash"
                                      : "bi-shield-fill-check"
                                  }`}
                                  aria-hidden="true"
                                ></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() =>
                                  handleRemoveMember(member.userId, displayName)
                                }
                                disabled={isLoading}
                                title="Remove member"
                                aria-label={`Remove ${displayName} from group`}
                              >
                                <i
                                  className="bi bi-trash"
                                  aria-hidden="true"
                                ></i>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {isCurrentUser(member.userId) && (
                        <div className="text-muted small">
                          <i className="bi bi-info-circle me-1"></i>
                          That&apos;s you!
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Former Members Section */}
          {formerMembers.length > 0 && (
            <div className="border-top">
              <button
                className="btn btn-link w-100 text-start text-muted py-2 px-3 d-flex align-items-center gap-2"
                type="button"
                onClick={() => setShowFormerMembers((v) => !v)}
                aria-expanded={showFormerMembers}
              >
                <i
                  className={`bi bi-chevron-${showFormerMembers ? "up" : "down"}`}
                  aria-hidden="true"
                ></i>
                <span className="small fw-semibold">
                  Former Members ({formerMembers.length})
                </span>
              </button>

              {showFormerMembers && (
                <div className="list-group list-group-flush">
                  {formerMembers.map((member) => {
                    const displayName = member.name || member.userId;
                    return (
                      <div
                        key={member.userId}
                        className="list-group-item opacity-75"
                        style={{ backgroundColor: "var(--bg-tertiary)" }}
                      >
                        <div className="d-flex align-items-center gap-3">
                          {/* Avatar */}
                          <div
                            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0 fw-bold"
                            style={{
                              width: "48px",
                              height: "48px",
                              fontSize: "1.1rem",
                            }}
                            aria-hidden="true"
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>

                          {/* Member Info */}
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                              <h6 className="mb-0 text-muted">{displayName}</h6>
                              <Badge variant="secondary">
                                <i
                                  className="bi bi-box-arrow-left me-1"
                                  aria-hidden="true"
                                ></i>
                                Left
                              </Badge>
                            </div>
                            <small className="text-muted">
                              {member.leftAt ? (
                                <>
                                  <i className="bi bi-calendar-x me-1"></i>
                                  Left{" "}
                                  {new Date(member.leftAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-calendar-check me-1"></i>
                                  Joined{" "}
                                  {new Date(member.joinedAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                    }
                                  )}
                                </>
                              )}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {config && (
        <ConfirmationDialog
          show={show}
          title={config.title}
          message={config.message}
          confirmText={config.confirmText}
          cancelText={config.cancelText}
          type={config.type}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}

      <style jsx>{`
        :global(.list-group-item) {
          background-color: var(--card-bg) !important;
          border-color: var(--border-secondary) !important;
          color: var(--text-primary) !important;
        }

        :global(.member-highlight) {
          background-color: var(--bg-hover) !important;
          border-left: 3px solid var(--btn-primary-bg) !important;
        }

        :global(.member-highlight:hover) {
          background-color: var(--bg-active) !important;
        }

        :global(.list-group-item:hover:not(.member-highlight)) {
          background-color: var(--bg-tertiary) !important;
        }
      `}</style>
    </>
  );
}
