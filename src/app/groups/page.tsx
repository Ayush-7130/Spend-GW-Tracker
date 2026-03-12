"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useGroup } from "@/contexts/GroupContext";
import { useConfirmation } from "@/hooks/useConfirmation";
import {
  LoadingSpinner,
  SearchInput,
  useSearch,
  PageHeader,
  GroupsListSkeleton,
} from "@/shared/components";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { CreateGroupModal } from "@/components/CreateGroupModal";
import { JoinGroupModal } from "@/components/JoinGroupModal";
import MainLayout from "@/components/MainLayout";
import Badge from "@/shared/components/Badge/Badge";
import Breadcrumb from "@/components/Breadcrumb";

export default function GroupsPage() {
  const {
    groups,
    activeGroup,
    switchGroup,
    leaveGroup,
    deleteGroup,
    isLoading,
    isGroupAdmin,
  } = useGroup();
  const { show, config, confirm, handleConfirm, handleCancel } =
    useConfirmation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search functionality using shared hook
  // Audit: Groups list - Add client-side search by name/description
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    filteredData,
  } = useSearch({
    data: groups,
    searchFields: ["name", "description", "groupId"],
    debounceMs: 300,
  });

  // Ensure filteredGroups is always an array to prevent runtime errors
  const filteredGroups = Array.isArray(filteredData) ? filteredData : [];

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    const confirmed = await confirm({
      title: "Leave Group",
      message: `Are you sure you want to leave "${groupName}"? You will lose access to all group data.`,
      confirmText: "Leave",
      type: "warning",
    });

    if (confirmed) {
      setActionLoading(groupId);
      try {
        await leaveGroup(groupId);
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    const confirmed = await confirm({
      title: "Delete Group",
      message: `Are you sure you want to permanently delete "${groupName}"? This will delete all expenses, settlements, and categories. This action cannot be undone.`,
      confirmText: "Delete Permanently",
      type: "danger",
    });

    if (confirmed) {
      setActionLoading(groupId);
      try {
        await deleteGroup(groupId);
      } finally {
        setActionLoading(null);
      }
    }
  };

  if (isLoading && groups.length === 0) {
    return (
      <MainLayout>
        <GroupsListSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-4">
        <Breadcrumb
          items={[
            { label: "Profile", href: "/profile" },
            { label: "My Groups" },
          ]}
        />
        {/* Header */}
        <PageHeader
          title="My Groups"
          icon="bi bi-people-fill"
          subtitle="Manage your expense tracking groups"
          actions={
            <>
              <button
                className="btn btn-outline-primary"
                onClick={() => setShowJoinModal(true)}
              >
                <i className="bi bi-box-arrow-in-right me-2"></i>
                Join Group
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(true)}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Group
              </button>
            </>
          }
        />

        {/* Search Input - Audit: Groups list search */}
        {groups.length > 0 && (
          <div className="mb-4">
            <div className="row">
              <div className="col-md-4">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search groups by name, description, or code..."
                  ariaLabel="Search groups"
                />
              </div>
              {searchQuery && (
                <div className="col-12 mt-2">
                  <small className="text-muted">
                    Showing {filteredGroups.length} of {groups.length} groups
                  </small>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Groups List */}
        {!filteredGroups || filteredGroups.length === 0 ? (
          <div className="card text-center py-5">
            <div className="card-body">
              {searchQuery ? (
                <>
                  <i className="bi bi-search display-1 text-muted opacity-25 d-block mb-4"></i>
                  <h3 className="h4 mb-3">No Groups Found</h3>
                  <p className="text-muted mb-4">
                    No groups match &quot;{searchQuery}&quot;. Try a different
                    search term.
                  </p>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setSearchQuery("")}
                  >
                    <i className="bi bi-x-circle me-2"></i>
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <i className="bi bi-people display-1 text-muted opacity-25 d-block mb-4"></i>
                  <h3 className="h4 mb-3">No Groups Yet</h3>
                  <p className="text-muted mb-4">
                    Create your first group to start tracking expenses with
                    others, or join an existing group.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Your First Group
                    </button>
                    <button
                      className="btn btn-outline-primary"
                      onClick={() => setShowJoinModal(true)}
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Join a Group
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="row g-3">
            {filteredGroups.map((group) => {
              const isActive = group._id === activeGroup?._id;
              const isAdmin = isGroupAdmin(group._id);
              const loading = actionLoading === group._id;

              return (
                <div key={group._id} className="col-12 col-md-6 col-lg-4">
                  <div
                    className={`card h-100 ${isActive ? "border-primary" : ""}`}
                  >
                    <div
                      className={`card-header ${isActive ? "group-card-active-header" : "group-card-inactive-header"}`}
                    >
                      <small className="d-flex align-items-center gap-2">
                        {isActive ? (
                          <>
                            <i className="bi bi-check-circle-fill"></i>
                            <span>Active Group</span>
                          </>
                        ) : (
                          <>
                            <i className="bi bi-people"></i>
                            <span>Group</span>
                          </>
                        )}
                      </small>
                    </div>
                    <div className="card-body">
                      <h5
                        className="card-title d-flex align-items-center gap-2 mb-3"
                        aria-label={group.name}
                      >
                        {group.name}
                        {isAdmin && (
                          <Badge variant="warning">
                            <i
                              className="bi bi-shield-fill-check"
                              aria-hidden="true"
                            ></i>
                            <span className="visually-hidden">Admin</span>
                          </Badge>
                        )}
                      </h5>
                      {group.description && (
                        <p className="card-text text-muted small mb-3">
                          {group.description}
                        </p>
                      )}

                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                          <small className="text-muted d-block">
                            <i className="bi bi-people me-1"></i>
                            {group.memberCount || 0} member
                            {group.memberCount !== 1 ? "s" : ""}
                          </small>
                          <small className="text-muted d-block">
                            <i className="bi bi-key me-1"></i>
                            Code:{" "}
                            <span className="fw-bold font-monospace">
                              {group.groupId}
                            </span>
                          </small>
                        </div>
                      </div>
                    </div>
                    <div className="card-footer border-top">
                      <div className="d-flex gap-2">
                        {!isActive && (
                          <button
                            className="btn btn-sm btn-outline-primary flex-grow-1"
                            onClick={() => switchGroup(group._id)}
                            disabled={loading}
                          >
                            <i className="bi bi-arrow-left-right me-1"></i>
                            Switch
                          </button>
                        )}
                        <Link
                          href={`/groups/${group._id}`}
                          className="btn btn-sm btn-outline-secondary flex-grow-1"
                        >
                          <i className="bi bi-gear me-1"></i>
                          Settings
                        </Link>
                        {loading ? (
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            disabled
                            aria-label="Loading"
                          >
                            <LoadingSpinner
                              config={{
                                size: "small",
                                variant: "secondary",
                                noContainer: true,
                                showText: false,
                              }}
                            />
                          </button>
                        ) : (
                          <div className="dropdown">
                            <button
                              className="btn btn-sm btn-outline-secondary dropdown-toggle"
                              type="button"
                              id={`group-dropdown-${group._id}`}
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                              aria-label="Group actions"
                            >
                              <i
                                className="bi bi-three-dots-vertical"
                                aria-hidden="true"
                              ></i>
                            </button>
                            <ul
                              className="dropdown-menu dropdown-menu-end py-1"
                              aria-labelledby={`group-dropdown-${group._id}`}
                            >
                              {isAdmin ? (
                                <li>
                                  <button
                                    className="dropdown-item text-danger py-0"
                                    onClick={() =>
                                      handleDeleteGroup(group._id, group.name)
                                    }
                                  >
                                    <i className="bi bi-trash me-2"></i>
                                    Delete Group
                                  </button>
                                </li>
                              ) : (
                                <li>
                                  <button
                                    className="dropdown-item text-warning"
                                    onClick={() =>
                                      handleLeaveGroup(group._id, group.name)
                                    }
                                  >
                                    <i className="bi bi-box-arrow-left me-2"></i>
                                    Leave Group
                                  </button>
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
        <JoinGroupModal
          isOpen={showJoinModal}
          onClose={() => setShowJoinModal(false)}
        />

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
      </div>
    </MainLayout>
  );
}
