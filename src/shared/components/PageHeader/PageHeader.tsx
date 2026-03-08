/**
 * PageHeader Component
 *
 * A reusable component for consistent page titles with optional icons,
 * subtitles, and action buttons.
 *
 * @example
 * ```tsx
 * <PageHeader
 *   title="Dashboard"
 *   icon="bi bi-house-door"
 *   subtitle="Welcome back!"
 * />
 *
 * <PageHeader
 *   title="My Groups"
 *   icon="bi bi-people-fill"
 *   subtitle="Manage your expense tracking groups"
 *   actions={
 *     <>
 *       <button className="btn btn-outline-primary">Join Group</button>
 *       <button className="btn btn-primary">Create Group</button>
 *     </>
 *   }
 * />
 * ```
 */

"use client";

import React, { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

export interface PageHeaderProps {
  /** Main title text */
  title: string;
  /** Icon class (Bootstrap icons) */
  icon?: string;
  /** Subtitle or description text */
  subtitle?: string;
  /** Action buttons or components */
  actions?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Title size */
  size?: "sm" | "md" | "lg";
  /** Custom icon color */
  iconColor?: string;
  /** Whether to show bottom margin */
  marginBottom?: boolean;
  /** Custom spacing between title and subtitle */
  spacing?: "compact" | "normal" | "spacious";
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  icon,
  subtitle,
  actions,
  className = "",
  size = "md",
  iconColor,
  marginBottom = true,
  spacing = "normal",
}) => {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Size configurations
  const sizeConfig = {
    sm: {
      titleClass: "h4",
      titleMargin: "mb-1",
      iconSize: "1.2rem",
    },
    md: {
      titleClass: "h3",
      titleMargin: "mb-1",
      iconSize: "1.5rem",
    },
    lg: {
      titleClass: "h2",
      titleMargin: "mb-2",
      iconSize: "2rem",
    },
  };

  const spacingConfig = {
    compact: "mb-2",
    normal: "mb-4",
    spacious: "mb-5",
  };

  const config = sizeConfig[size];
  const marginClass = marginBottom ? spacingConfig[spacing] : "";

  const defaultIconColor = iconColor || colors.button.primary.background;

  return (
    <div
      className={`d-flex justify-content-between align-items-center ${marginClass} ${className}`}
    >
      <div className="flex-grow-1">
        <h1
          className={`${config.titleClass} ${config.titleMargin}`}
          style={{ color: colors.text.primary }}
        >
          {icon && (
            <i
              className={`${icon} me-2`}
              style={{ color: defaultIconColor, fontSize: config.iconSize }}
              aria-hidden="true"
            ></i>
          )}
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted mb-0" style={{ fontSize: "0.95rem" }}>
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="d-flex gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
