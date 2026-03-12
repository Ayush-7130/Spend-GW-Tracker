/**
 * SectionHeader Component
 *
 * A reusable component for section titles within pages.
 * Can include icons, action buttons, and optional dividers.
 *
 * @example
 * ```tsx
 * <SectionHeader
 *   title="Recent Expenses"
 *   icon="bi bi-receipt"
 * />
 *
 * <SectionHeader
 *   title="Settlement Status"
 *   icon="bi bi-currency-exchange"
 *   action={<Link href="/settlements">View All</Link>}
 *   showDivider
 * />
 * ```
 */

"use client";

import React, { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

export interface SectionHeaderProps {
  /** Section title */
  title: string;
  /** Icon class (Bootstrap icons) */
  icon?: string;
  /** Action button or component */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Title size */
  size?: "sm" | "md" | "lg";
  /** Custom icon color */
  iconColor?: string;
  /** Show bottom divider */
  showDivider?: boolean;
  /** Bottom margin */
  marginBottom?: boolean;
  /** Custom divider color */
  dividerColor?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  action,
  className = "",
  size = "md",
  iconColor,
  showDivider = false,
  marginBottom = true,
  dividerColor,
}) => {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Size configurations
  const sizeConfig = {
    sm: {
      titleClass: "h6",
      fontSize: "0.85rem",
      iconSize: "0.9rem",
      marginBottom: "mb-2",
    },
    md: {
      titleClass: "h5",
      fontSize: "1rem",
      iconSize: "1rem",
      marginBottom: "mb-3",
    },
    lg: {
      titleClass: "h4",
      fontSize: "1.25rem",
      iconSize: "1.25rem",
      marginBottom: "mb-4",
    },
  };

  const config = sizeConfig[size];
  const marginClass = marginBottom ? config.marginBottom : "mb-0";
  const defaultIconColor = iconColor || colors.button.primary.background;
  const defaultDividerColor = dividerColor || colors.border.primary;

  return (
    <div className={`${marginClass} ${className}`}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
          {icon && (
            <i
              className={`${icon} me-2`}
              style={{
                color: defaultIconColor,
                fontSize: config.iconSize,
              }}
              aria-hidden="true"
            ></i>
          )}
          <span
            className={`${config.titleClass} mb-0 fw-semibold`}
            style={{
              color: colors.text.primary,
              fontSize: config.fontSize,
            }}
          >
            {title}
          </span>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {showDivider && (
        <hr
          className="mt-2"
          style={{
            borderColor: defaultDividerColor,
            opacity: 0.3,
          }}
        />
      )}
    </div>
  );
};

export default SectionHeader;
