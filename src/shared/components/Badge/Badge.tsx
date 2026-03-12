"use client";

import React from "react";
import { BadgeProps } from "./config";

export default function Badge({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  outline = false,
  title,
  style,
}: BadgeProps) {
  // Size configurations
  const sizeStyles = {
    sm: { padding: "0.25rem 0.5rem", fontSize: "0.75rem" },
    md: { padding: "0.35rem 0.65rem", fontSize: "0.875rem" },
    lg: { padding: "0.5rem 0.75rem", fontSize: "1rem" },
  };

  // Get CSS variable-based styles for each variant
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--btn-primary-bg)",
              border: "1px solid var(--btn-primary-bg)",
            }
          : {
              backgroundColor: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
              border: "1px solid var(--btn-primary-bg)",
            };
      case "secondary":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--btn-secondary-text)",
              border: "1px solid var(--btn-secondary-border)",
            }
          : {
              backgroundColor: "var(--btn-secondary-bg)",
              color: "var(--btn-secondary-text)",
              border: "1px solid var(--btn-secondary-border)",
            };
      case "success":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--status-success)",
              border: "1px solid var(--status-success)",
            }
          : {
              backgroundColor: "var(--status-success)",
              color: "var(--text-inverse)",
              border: "1px solid var(--status-success)",
            };
      case "danger":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--status-error)",
              border: "1px solid var(--status-error)",
            }
          : {
              backgroundColor: "var(--status-error)",
              color: "var(--text-inverse)",
              border: "1px solid var(--status-error)",
            };
      case "warning":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--status-warning)",
              border: "1px solid var(--status-warning)",
            }
          : {
              backgroundColor: "var(--status-warning)",
              color: "var(--text-primary)",
              border: "1px solid var(--status-warning)",
            };
      case "info":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--status-info)",
              border: "1px solid var(--status-info)",
            }
          : {
              backgroundColor: "var(--status-info)",
              color: "var(--text-inverse)",
              border: "1px solid var(--status-info)",
            };
      case "light":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--border-primary)",
            }
          : {
              backgroundColor: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-primary)",
            };
      case "dark":
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--text-primary)",
              border: "1px solid var(--text-primary)",
            }
          : {
              backgroundColor: "var(--text-primary)",
              color: "var(--text-inverse)",
              border: "1px solid var(--text-primary)",
            };
      default:
        return outline
          ? {
              backgroundColor: "transparent",
              color: "var(--btn-secondary-text)",
              border: "1px solid var(--btn-secondary-border)",
            }
          : {
              backgroundColor: "var(--btn-secondary-bg)",
              color: "var(--btn-secondary-text)",
              border: "1px solid var(--btn-secondary-border)",
            };
    }
  };

  const sizeStyle = sizeStyles[size];
  const variantStyles = getVariantStyles();

  return (
    <span
      className={`badge ${className}`}
      title={title}
      style={{
        ...variantStyles,
        ...sizeStyle,
        display: "inline-block",
        borderRadius: "0.25rem",
        fontWeight: "600",
        lineHeight: "1",
        textAlign: "center",
        whiteSpace: "nowrap",
        verticalAlign: "baseline",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
