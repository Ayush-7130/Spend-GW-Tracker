"use client";

import React, { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useGroup } from "@/contexts/GroupContext";
import { useNotification } from "@/contexts/NotificationContext";
import {
  LoadingSpinner,
  SearchInput,
  useSearch,
  GroupDetailSkeleton,
} from "@/shared/components";
import { GroupSettings } from "@/components/GroupSettings";
import { MemberList } from "@/components/MemberList";
import MainLayout from "@/components/MainLayout";
import Badge from "@/shared/components/Badge/Badge";
import Breadcrumb from "@/components/Breadcrumb";

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const {
    groups,
    activeGroup,
    isLoading,
    fetchJoinRequests,
    joinRequests,
    approveJoinRequest,
    rejectJoinRequest,
    isGroupAdmin,
  } = useGroup();
  const { showNotification } = useNotification();
  const [group, setGroup] = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Use canonical search hook for filtering join requests
  const {
    query: requestSearchQuery,
    setQuery: setRequestSearchQuery,
    filteredData: filteredJoinRequests,
  } = useSearch({
    data: joinRequests || [],
    searchFields: ["userName", "userEmail"],
    debounceMs: 200,
  });

  // Show search when there are more than 3 join requests
  const showRequestSearch =
    Array.isArray(joinRequests) && joinRequests.length > 3;

  // Fetch full group details including members
  const fetchGroupDetails = useCallback(
    async (groupId: string) => {
      try {
        setGroupLoading(true);
        const response = await fetch(`/api/groups/${groupId}`, {
          credentials: "include",
        });

        const data = await response.json();

        if (data.success) {
          setGroup(data.data.group);
        } else {
          throw new Error(data.error || "Failed to fetch group details");
        }
      } catch (error) {
        showNotification(
          error instanceof Error
            ? error.message
            : "Failed to fetch group details",
          "error"
        );
        router.push("/groups");
      } finally {
        setGroupLoading(false);
      }
    },
    [router, showNotification]
  );

  // Check if group exists in user's groups and fetch details
  useEffect(() => {
    const foundGroup = groups.find((g) => g._id === resolvedParams.id);
    if (foundGroup) {
      // Fetch full group details including members
      fetchGroupDetails(resolvedParams.id);

      // Fetch join requests if user is admin
      const isAdmin = isGroupAdmin(foundGroup._id);
      if (isAdmin && !requestsLoading) {
        setRequestsLoading(true);
        fetchJoinRequests(foundGroup._id).finally(() =>
          setRequestsLoading(false)
        );
      }
    } else if (!isLoading) {
      // Group not found and not loading
      router.push("/groups");
    }
    // eslint-disable-next-line
  }, [resolvedParams.id, groups, isLoading]);

  // Listen for group changes and refetch details
  useEffect(() => {
    const handleGroupChange = (event: any) => {
      if (event.detail?.groupId === resolvedParams.id) {
        fetchGroupDetails(resolvedParams.id);
      }
    };

    window.addEventListener("groupChanged", handleGroupChange);
    return () => window.removeEventListener("groupChanged", handleGroupChange);
  }, [resolvedParams.id, fetchGroupDetails]);

  if (isLoading || groupLoading || !group) {
    return (
      <MainLayout>
        <GroupDetailSkeleton />
      </MainLayout>
    );
  }

  const isAdmin = isGroupAdmin(group._id);
  const isActive = group._id === activeGroup?._id;

  return (
    <MainLayout>
      <div className="container py-4">
        {/* Header */}
        <div className="mb-4">
          <Breadcrumb
            items={[
              { label: "Groups", href: "/groups" },
              { label: group.name },
            ]}
          />

          <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
            <div style={{ minWidth: 0 }}>
              <h1
                className="h2 mb-1 d-flex align-items-center gap-2 flex-wrap"
                aria-label={group.name || "Group details"}
              >
                <i className="bi bi-people-fill text-primary"></i>
                {group.name}
                {isActive && <Badge variant="primary">Active</Badge>}
                {isAdmin && (
                  <Badge variant="warning">
                    <i className="bi bi-shield-fill-check me-1"></i>
                    Admin
                  </Badge>
                )}
              </h1>
              {group.description && (
                <p className="text-muted mb-0">{group.description}</p>
              )}
            </div>
          </div>
        </div>

        <div className="row g-4">
          {/* Left Column - Settings */}
          <div className="col-12 col-lg-6">
            <GroupSettings
              groupId={group._id}
              groupName={group.name}
              groupDescription={group.description}
              groupCode={group.groupId}
              requireApproval={group.settings?.requireApproval}
              isAdmin={isAdmin}
            />
          </div>

          {/* Right Column - Members and Requests */}
          <div className="col-12 col-lg-6">
            <MemberList groupId={group._id} members={group.members || []} />

            {/* Join Requests (Admin Only) */}
            {isAdmin && (
              <div className="card mt-4">
                <div className="card-header border-bottom">
                  <h5 className="card-title mb-0 d-flex align-items-center gap-2">
                    <i className="bi bi-person-check-fill text-info"></i>
                    Join Requests
                    {joinRequests.length > 0 && (
                      <Badge variant="info">{joinRequests.length}</Badge>
                    )}
                  </h5>
                </div>
                <div className="card-body p-0">
                  {/* Search Input - Audit: Join requests search */}
                  {showRequestSearch && (
                    <div className="p-3 border-bottom">
                      <SearchInput
                        value={requestSearchQuery}
                        onChange={setRequestSearchQuery}
                        placeholder="Search by name or email..."
                        size="sm"
                        ariaLabel="Search join requests"
                      />
                      {requestSearchQuery && (
                        <small className="text-muted d-block mt-2">
                          Showing {filteredJoinRequests.length} of{" "}
                          {joinRequests.length} requests
                        </small>
                      )}
                    </div>
                  )}

                  {requestsLoading ? (
                    <div className="text-center py-4">
                      <LoadingSpinner
                        config={{ size: "medium", variant: "primary" }}
                      />
                    </div>
                  ) : !Array.isArray(joinRequests) ||
                    joinRequests.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-inbox display-4 d-block mb-3 opacity-25"></i>
                      <p>No pending join requests</p>
                    </div>
                  ) : filteredJoinRequests.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <i className="bi bi-search display-6 d-block mb-2 opacity-25"></i>
                      <p className="mb-0">
                        No requests match &quot;{requestSearchQuery}&quot;
                      </p>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {filteredJoinRequests.map((request) => (
                        <div key={request._id} className="list-group-item">
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width: "40px", height: "40px" }}
                            >
                              <i className="bi bi-person-fill"></i>
                            </div>
                            <div className="flex-grow-1">
                              <h6
                                className="mb-1"
                                aria-label={request.userName || "Requester"}
                              >
                                {request.userName}
                              </h6>
                              <small className="text-muted">
                                {request.userEmail}
                              </small>
                              <div className="small text-muted mt-1">
                                <i className="bi bi-clock me-1"></i>
                                Requested{" "}
                                {new Date(
                                  request.requestedAt
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() =>
                                  approveJoinRequest(group._id, request.userId)
                                }
                                title="Approve"
                                aria-label={`Approve join request from ${request.userId}`}
                              >
                                <i
                                  className="bi bi-check-lg"
                                  aria-hidden="true"
                                ></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() =>
                                  rejectJoinRequest(group._id, request.userId)
                                }
                                title="Reject"
                                aria-label={`Reject join request from ${request.userId}`}
                              >
                                <i
                                  className="bi bi-x-lg"
                                  aria-hidden="true"
                                ></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
