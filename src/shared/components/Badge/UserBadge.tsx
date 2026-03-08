"use client";

import React from "react";
import { UserBadgeProps, getUserConfig } from "./config";
import { useTheme } from "../../../contexts/ThemeContext";
import { lightTheme, darkTheme } from "../../../styles/colors";

export default function UserBadge({
  user,
  variant = "default",
  showName = true,
  className = "",
}: UserBadgeProps) {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;
  const config = getUserConfig(user);

  // Use theme colors for user badges - professional color mapping with better contrast
  const getUserColorFromTheme = (colorName: string) => {
    // In dark mode, use brighter colors. In light mode, use deeper colors for better contrast
    if (theme === "dark") {
      switch (colorName) {
        case "primary":
          return "#4a90e2"; // Brighter blue
        case "success":
          return "#52c41a"; // Brighter green
        case "info":
          return "#1890ff"; // Brighter cyan
        case "warning":
          return "#faad14"; // Brighter orange
        case "danger":
          return "#f5222d"; // Brighter red
        case "secondary":
        default:
          return "#8c8c8c"; // Lighter gray
      }
    } else {
      // Light mode - use deeper colors for better contrast with white text
      switch (colorName) {
        case "primary":
          return "#1a5cb8"; // Deeper blue
        case "success":
          return "#2d8e15"; // Deeper green
        case "info":
          return "#0e6eb8"; // Deeper cyan
        case "warning":
          return "#d48806"; // Deeper orange
        case "danger":
          return "#cf1322"; // Deeper red
        case "secondary":
        default:
          return "#595959"; // Deeper gray
      }
    }
  };

  const userColor = getUserColorFromTheme(config.color);

  if (variant === "avatar") {
    return (
      <div className={`d-flex align-items-center ${className}`}>
        <div
          className="rounded-circle d-flex align-items-center justify-content-center me-2"
          style={{
            width: "28px",
            height: "28px",
            fontSize: "11px",
            fontWeight: "600",
            backgroundColor: userColor,
            color: "#ffffff", // Always white for better contrast
            boxShadow:
              theme === "light"
                ? "0 2px 4px rgba(0,0,0,0.12)"
                : "0 2px 4px rgba(0,0,0,0.4)",
          }}
        >
          {config.avatar}
        </div>
        {showName && (
          <span style={{ color: colors.text.primary, fontWeight: "500" }}>
            {config.name}
          </span>
        )}
      </div>
    );
  }

  // Default badge variant with improved contrast
  const badgeStyle = {
    backgroundColor: userColor,
    color: "#ffffff", // Always use white text for maximum contrast
    padding: variant === "small" ? "0.25rem 0.5rem" : "0.4rem 0.75rem",
    fontSize: variant === "small" ? "0.75rem" : "0.875rem",
    fontWeight: "600",
    border: "none",
    boxShadow:
      theme === "light"
        ? "0 1px 3px rgba(0,0,0,0.12)"
        : "0 1px 3px rgba(0,0,0,0.4)",
    borderRadius: "0.25rem",
    display: "inline-block",
    lineHeight: "1.2",
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
    verticalAlign: "baseline",
  };

  return (
    <span className={`badge ${className}`} style={badgeStyle}>
      {config.name}
    </span>
  );
}
