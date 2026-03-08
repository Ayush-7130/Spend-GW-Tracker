"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGroup } from "@/contexts/GroupContext";
import { LoadingSpinner, SearchInput } from "@/shared/components";
import Badge from "@/shared/components/Badge/Badge";

export function GroupSelector() {
  const { groups, activeGroup, switchGroup, isLoading } = useGroup();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Ensure groups is always an array - memoized to avoid dependency changes
  const groupsList = useMemo(
    () => (Array.isArray(groups) ? groups : []),
    [groups]
  );

  // Audit: GroupSelector - Add inline search input for large group counts
  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groupsList;
    const query = searchQuery.toLowerCase();
    return groupsList.filter(
      (group) =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query) ||
        group.groupId?.toLowerCase().includes(query)
    );
  }, [groupsList, searchQuery]);

  // Show search input when there are more than 5 groups
  const showSearch = groupsList.length > 5;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest(".dropdown")) {
        setIsOpen(false);
        setSearchQuery(""); // Clear search when closing
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSwitchGroup = async (groupId: string) => {
    if (groupId !== activeGroup?._id) {
      await switchGroup(groupId);
    }
    setIsOpen(false);
    setSearchQuery(""); // Clear search after selection
  };

  if (isLoading && groupsList.length === 0) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <LoadingSpinner config={{ size: "small", variant: "secondary" }} />
        <span className="small">Loading groups...</span>
      </div>
    );
  }

  if (groupsList.length === 0) {
    return (
      <div className="dropdown">
        <button
          className="btn btn-outline-secondary btn-sm"
          type="button"
          onClick={() => router.push("/groups")}
        >
          <i className="bi bi-plus-circle me-1"></i>
          Create Group
        </button>
      </div>
    );
  }

  const ariaExpanded: "true" | "false" = isOpen ? "true" : "false";

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-primary btn-sm dropdown-toggle d-flex align-items-center gap-2"
        type="button"
        id="groupDropdown"
        data-bs-toggle="dropdown"
        aria-expanded={ariaExpanded}
        aria-haspopup="true"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
          } else if (e.key === "Escape") {
            setIsOpen(false);
          }
        }}
        style={{ minWidth: "200px" }}
      >
        <i className="bi bi-people-fill" aria-hidden="true"></i>
        <span className="flex-grow-1 text-start text-truncate">
          {activeGroup?.name || "Select Group"}
        </span>
      </button>
      <ul
        className={`dropdown-menu list-unstyled m-0 p-0 ${isOpen ? "show" : ""}`}
        aria-labelledby="groupDropdown"
        style={{ minWidth: "250px" }}
      >
        <li
          className="dropdown-header d-flex justify-content-between align-items-center"
          role="none"
        >
          <span>Your Groups</span>
          <Badge variant="secondary">{groupsList.length}</Badge>
        </li>

        {/* Search Input - Audit: GroupSelector inline search */}
        {showSearch && (
          <li role="none" className="px-2 py-2">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search groups..."
              size="sm"
              ariaLabel="Search groups in dropdown"
            />
          </li>
        )}

        <li role="separator">
          <hr className="dropdown-divider" />
        </li>

        {filteredGroups.length === 0 ? (
          <li className="px-3 py-2 text-muted text-center" role="none">
            <small>No groups match &quot;{searchQuery}&quot;</small>
          </li>
        ) : (
          filteredGroups.map((group) => (
            <li key={group._id} role="none">
              <button
                className={`dropdown-item d-flex align-items-center gap-2 ${
                  group._id === activeGroup?._id ? "active" : ""
                }`}
                onClick={() => handleSwitchGroup(group._id)}
                role="menuitem"
                aria-current={
                  group._id === activeGroup?._id ? "true" : undefined
                }
              >
                <i
                  className={`bi ${
                    group._id === activeGroup?._id
                      ? "bi-check-circle-fill"
                      : "bi-circle"
                  }`}
                  aria-hidden="true"
                ></i>
                <div className="flex-grow-1">
                  <div className="fw-semibold text-truncate">{group.name}</div>
                  {group.description && (
                    <div className="small text-muted text-truncate">
                      {group.description}
                    </div>
                  )}
                  <div className="small text-muted">
                    <i className="bi bi-people me-1" aria-hidden="true"></i>
                    {group.members?.length || 0} member
                    {group.members?.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </button>
            </li>
          ))
        )}
        <li role="separator">
          <hr className="dropdown-divider m-0" />
        </li>
        <li role="none">
          {/* FIX M26: Use Next.js Link instead of <a> tag */}
          <Link
            href="/groups"
            className="dropdown-item text-primary"
            onClick={() => setIsOpen(false)}
            role="menuitem"
          >
            <i className="bi bi-plus-circle me-2" aria-hidden="true"></i>
            Create or Join Group
          </Link>
        </li>
        {activeGroup && (
          <li role="none">
            {/* FIX M26: Use Next.js Link instead of <a> tag */}
            <Link
              href={`/groups/${activeGroup._id}`}
              className="dropdown-item text-secondary"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              <i className="bi bi-gear me-2" aria-hidden="true"></i>
              Group Settings
            </Link>
          </li>
        )}
      </ul>

      <style jsx>{`
        .dropdown-item {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .dropdown-item:hover {
          background-color: var(--bg-hover);
        }

        .dropdown-item.active {
          background-color: var(--btn-primary-bg);
          color: var(--btn-primary-text);
        }

        .dropdown-item.active:hover {
          background-color: var(--btn-primary-hover);
        }

        .text-truncate {
          max-width: 200px;
        }
      `}</style>
    </div>
  );
}
