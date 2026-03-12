"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { ThemeToggle, useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useGroup } from "@/contexts/GroupContext";
import NotificationBell from "./NotificationBell";
import Badge from "@/shared/components/Badge/Badge";

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();
  const { activeGroup } = useGroup();
  const { theme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { href: "/", label: "Dashboard", icon: "bi-house-door" },
    { href: "/expenses", label: "Expenses", icon: "bi-list-ul" },
    { href: "/categories", label: "Categories", icon: "bi-tags" },
    {
      href: "/settlements",
      label: "Settlements",
      icon: "bi-currency-exchange",
    },
    { href: "/analytics", label: "Analytics", icon: "bi-graph-up" },
  ];

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Don't show navigation on auth pages
  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname?.startsWith("/auth/")
  ) {
    return null;
  }

  return (
    <nav
      className="navbar navbar-expand-lg sticky-top"
      style={{
        backgroundColor: "var(--navbar-bg)",
        borderBottom: "1px solid var(--border-primary)",
        boxShadow: "var(--navbar-shadow)",
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container-fluid">
        <Link
          className="navbar-brand fw-bold"
          style={{ color: "var(--navbar-text)" }}
          href="/"
          aria-label="Spend Tracker Home"
        >
          <i className="bi bi-wallet2 me-2" aria-hidden="true"></i>
          Spend Tracker
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          onClick={toggleMenu}
          aria-controls="navbarNav"
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          style={{
            borderColor: "var(--border-primary)",
          }}
        >
          <span
            className="navbar-toggler-icon"
            style={{
              backgroundImage:
                theme === "dark"
                  ? `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e")`
                  : `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%2833, 37, 41, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e")`,
            }}
          ></span>
        </button>

        <div
          className={`collapse navbar-collapse ${isMenuOpen ? "show" : ""}`}
          id="navbarNav"
        >
          {isAuthenticated && (
            <ul className="navbar-nav me-auto">
              {navItems.map((item) => (
                <li className="nav-item" key={item.href}>
                  <Link
                    className={`nav-link ${pathname === item.href ? "active" : ""}`}
                    style={{
                      color: "var(--navbar-text)",
                      backgroundColor:
                        pathname === item.href
                          ? "var(--navbar-hover-bg)"
                          : "transparent",
                    }}
                    href={item.href}
                    onClick={closeMenu}
                    aria-label={`${item.label} page`}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    <i className={`${item.icon} me-1`} aria-hidden="true"></i>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {/* Mobile: User Account and Sign Out - Inside hamburger */}
          <div className="d-lg-none">
            {isAuthenticated ? (
              <div className="mt-2 mb-2">
                <div
                  style={{
                    backgroundColor: "var(--navbar-mobile-user-bg)",
                    borderRadius: "0.5rem",
                    padding: "0.875rem 1rem",
                    border: "1px solid var(--navbar-mobile-user-border)",
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
                    <span
                      className="fw-semibold"
                      style={{
                        color: "var(--navbar-text)",
                        fontSize: "0.9375rem",
                        lineHeight: "1.3",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      {user?.name}
                    </span>
                    {activeGroup && (
                      <Link
                        href={`/groups/${activeGroup._id}`}
                        onClick={closeMenu}
                        style={{ textDecoration: "none", flexShrink: 0 }}
                        title={`Go to ${activeGroup.name}`}
                      >
                        <Badge
                          variant="primary"
                          style={{ fontSize: "0.6875rem", padding: "3px 7px" }}
                        >
                          <i
                            className="bi bi-people-fill me-1"
                            style={{ fontSize: "0.625rem" }}
                          ></i>
                          <span
                            className="text-truncate d-inline-block"
                            style={{
                              maxWidth: "72px",
                              verticalAlign: "middle",
                            }}
                          >
                            {activeGroup.name}
                          </span>
                        </Badge>
                      </Link>
                    )}
                  </div>

                  {/* Profile and My Groups Buttons in Row */}
                  <div className="d-flex gap-2">
                    <Link
                      href="/profile"
                      className="btn btn-sm flex-fill"
                      onClick={closeMenu}
                      style={{
                        backgroundColor: "transparent",
                        borderColor: "var(--border-primary)",
                        color: "var(--navbar-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                      }}
                      aria-label="View and edit profile"
                    >
                      <i
                        className="bi bi-person-circle me-1"
                        aria-hidden="true"
                      ></i>
                      My Profile
                    </Link>

                    <Link
                      href="/groups"
                      className="btn btn-sm flex-fill"
                      onClick={closeMenu}
                      style={{
                        backgroundColor: "transparent",
                        borderColor: "var(--border-primary)",
                        color: "var(--navbar-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                      }}
                      aria-label="Manage groups"
                    >
                      <i className="bi bi-people me-1" aria-hidden="true"></i>
                      My Groups
                    </Link>
                  </div>
                </div>

                {/* Mobile: Notification and Theme Toggle - Inside hamburger after account */}
                <div
                  className="d-flex justify-content-between align-items-center mt-3 pt-2"
                  style={{ borderTop: "1px solid var(--border-secondary)" }}
                >
                  <div>
                    <NotificationBell />
                  </div>
                  <div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 mb-2">
                <Link
                  href="/login"
                  className="btn w-100 mb-2"
                  onClick={closeMenu}
                  style={{
                    backgroundColor: "transparent",
                    borderColor: "var(--border-primary)",
                    color: "var(--navbar-text)",
                    border: "1px solid",
                  }}
                >
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Sign In
                </Link>
                {process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true" && (
                  <Link
                    href="/signup"
                    className="btn w-100 mb-2"
                    onClick={closeMenu}
                    style={{
                      backgroundColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-text)",
                      border: "none",
                    }}
                  >
                    <i className="bi bi-person-plus me-1"></i>
                    Sign Up
                  </Link>
                )}

                {/* Theme Toggle for non-authenticated users */}
                <div
                  className="mt-3 pt-2 text-center"
                  style={{ borderTop: "1px solid var(--border-secondary)" }}
                >
                  <ThemeToggle />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Desktop: Right side items */}
        <div className="d-none d-lg-flex align-items-center ms-auto gap-3">
          {isAuthenticated ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />

              {/* User Dropdown */}
              <div className="dropdown ms-3" ref={dropdownRef}>
                <button
                  className="btn dropdown-toggle"
                  type="button"
                  id="userDropdown"
                  onClick={toggleDropdown}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label={`User menu for ${user?.name || "User"}`}
                  style={{
                    borderColor: "var(--border-primary)",
                    color: "var(--navbar-text)",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--navbar-hover-bg)";
                    e.currentTarget.style.color = "var(--navbar-text-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--navbar-text)";
                  }}
                >
                  <i
                    className="bi bi-person-circle me-1"
                    style={{ color: "var(--icon-accent)" }}
                  ></i>
                  <span style={{ color: "var(--navbar-text)" }}>
                    {user?.name || "User"}
                  </span>
                </button>
                <ul
                  className={`dropdown-menu ${isDropdownOpen ? "show" : ""}`}
                  aria-labelledby="userDropdown"
                  style={{
                    minWidth: "280px",
                    top: "100%",
                    marginTop: "8px",
                    transform: "translateX(-15%)",
                  }}
                >
                  <li>
                    <span className="dropdown-item-text">
                      <div className="d-flex align-items-center">
                        <div
                          className="d-flex align-items-center justify-content-between gap-2"
                          style={{ flex: 1, minWidth: 0 }}
                        >
                          <span
                            className="fw-semibold text-truncate"
                            style={{
                              color: "var(--text-primary)",
                              fontSize: "1.1375rem",
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {user?.name}
                          </span>
                          {activeGroup && (
                            <Link
                              href={`/groups/${activeGroup._id}`}
                              onClick={closeDropdown}
                              style={{ textDecoration: "none", flexShrink: 0 }}
                              title={`Go to ${activeGroup.name}`}
                            >
                              <Badge
                                variant="primary"
                                style={{
                                  fontSize: "0.7375rem",
                                  padding: "2px 4px",
                                }}
                              >
                                <i
                                  className="bi bi-people-fill me-1"
                                  style={{ fontSize: "0.625rem" }}
                                ></i>
                                <span
                                  className="text-truncate d-inline-block"
                                  style={{
                                    maxWidth: "80px",
                                    verticalAlign: "middle",
                                  }}
                                >
                                  {activeGroup.name}
                                </span>
                              </Badge>
                            </Link>
                          )}
                        </div>
                      </div>
                    </span>
                  </li>
                  <li>
                    <hr className="dropdown-divider my-2" />
                  </li>
                  <li>
                    <Link
                      href="/profile"
                      className="dropdown-item py-2 px-3"
                      onClick={closeDropdown}
                      style={{ color: "var(--text-primary)" }}
                      aria-label="View and edit profile"
                    >
                      <i
                        className="bi bi-person-circle me-2"
                        style={{ color: "var(--icon-primary)" }}
                        aria-hidden="true"
                      ></i>
                      My Profile
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/groups"
                      className="dropdown-item py-2 px-3"
                      onClick={closeDropdown}
                      style={{ color: "var(--text-primary)" }}
                      aria-label="Manage groups"
                    >
                      <i
                        className="bi bi-people me-2"
                        style={{ color: "var(--icon-primary)" }}
                        aria-hidden="true"
                      ></i>
                      My Groups
                    </Link>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div className="d-flex gap-2">
              <Link
                href="/login"
                className="btn"
                style={{
                  backgroundColor: "transparent",
                  borderColor: "var(--border-primary)",
                  color: "var(--navbar-text)",
                  border: "1px solid",
                }}
              >
                <i className="bi bi-box-arrow-in-right me-1"></i>
                Sign In
              </Link>
              {process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true" && (
                <Link
                  href="/signup"
                  className="btn"
                  style={{
                    backgroundColor: "var(--btn-primary-bg)",
                    color: "var(--btn-primary-text)",
                    border: "none",
                  }}
                >
                  <i className="bi bi-person-plus me-1"></i>
                  Sign Up
                </Link>
              )}
            </div>
          )}

          {/* Theme Toggle */}
          <div className="ms-3">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
