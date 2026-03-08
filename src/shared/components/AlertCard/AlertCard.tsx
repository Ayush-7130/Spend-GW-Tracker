/**
 * AlertCard Component
 *
 * A reusable styled card component for displaying alerts, info messages,
 * warnings, or highlighted information.
 *
 * @example
 * ```tsx
 * <AlertCard
 *   variant="danger"
 *   title="Outstanding Balance"
 *   icon="bi bi-exclamation-triangle"
 * >
 *   You owe ₹500 to Saket
 * </AlertCard>
 *
 * <AlertCard
 *   variant="success"
 *   icon="bi bi-check-circle"
 *   centered
 * >
 *   All settled up!
 * </AlertCard>
 * ```
 */

"use client";

import React, { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

export interface AlertCardProps {
  /** Content to display */
  children: ReactNode;
  /** Alert variant */
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  /** Optional title */
  title?: string;
  /** Icon class (Bootstrap icons) */
  icon?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to center content */
  centered?: boolean;
  /** Card size */
  size?: "sm" | "md" | "lg";
  /** Show border only (no background) */
  borderOnly?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Show close button */
  dismissible?: boolean;
  /** Close handler */
  onClose?: () => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({
  children,
  variant = "primary",
  title,
  icon,
  className = "",
  centered = false,
  size = "md",
  borderOnly = false,
  onClick,
  dismissible = false,
  onClose,
}) => {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: "py-2 px-3",
      iconSize: "1rem",
      titleSize: "0.9rem",
      contentSize: "0.85rem",
    },
    md: {
      padding: "py-3 px-3",
      iconSize: "1.25rem",
      titleSize: "1rem",
      contentSize: "0.95rem",
    },
    lg: {
      padding: "py-4 px-4",
      iconSize: "1.5rem",
      titleSize: "1.1rem",
      contentSize: "1rem",
    },
  };

  const config = sizeConfig[size];

  // Get variant colors
  const getVariantStyles = () => {
    const variantMap = {
      primary: {
        bg: borderOnly ? "transparent" : colors.notification.info.background,
        border: colors.button.primary.background,
        icon: colors.button.primary.background,
        text: colors.text.primary,
      },
      secondary: {
        bg: borderOnly ? "transparent" : colors.card.background,
        border: colors.border.primary,
        icon: colors.text.secondary,
        text: colors.text.primary,
      },
      success: {
        bg: borderOnly ? "transparent" : colors.notification.success.background,
        border: colors.status.success,
        icon: colors.status.success,
        text: colors.text.primary,
      },
      danger: {
        bg: borderOnly ? "transparent" : colors.notification.error.background,
        border: colors.status.error,
        icon: colors.status.error,
        text: colors.text.primary,
      },
      warning: {
        bg: borderOnly ? "transparent" : colors.notification.warning.background,
        border: colors.status.warning,
        icon: colors.status.warning,
        text: colors.text.primary,
      },
      info: {
        bg: borderOnly ? "transparent" : colors.notification.info.background,
        border: colors.status.info,
        icon: colors.status.info,
        text: colors.text.primary,
      },
      light: {
        bg: borderOnly ? "transparent" : colors.card.background,
        border: colors.border.primary,
        icon: colors.text.secondary,
        text: colors.text.primary,
      },
      dark: {
        bg: borderOnly ? "transparent" : colors.text.primary,
        border: colors.text.primary,
        icon: colors.text.inverse,
        text: colors.text.inverse,
      },
    };

    return variantMap[variant];
  };

  const styles = getVariantStyles();

  const cardStyle: React.CSSProperties = {
    backgroundColor: styles.bg,
    border: `1px solid ${styles.border}`,
    borderRadius: "0.375rem",
    color: styles.text,
    cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s ease",
    ...(onClick
      ? {
          width: "100%",
          textAlign: centered ? ("center" as const) : ("left" as const),
        }
      : {}),
  };

  const textAlign = centered ? "text-center" : "";

  const cardContent = (
    <div className="card-body p-0">
      {dismissible && onClose && (
        <button
          type="button"
          className="btn-close position-absolute top-0 end-0 m-2"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{ fontSize: "0.75rem" }}
        ></button>
      )}

      {title && (
        <div
          className={`d-flex align-items-center ${centered ? "justify-content-center" : ""} mb-2`}
        >
          {icon && (
            <i
              className={`${icon} me-2`}
              style={{
                color: styles.icon,
                fontSize: config.iconSize,
              }}
              aria-hidden="true"
            ></i>
          )}
          <h5
            className="mb-0 fw-semibold"
            style={{
              color: styles.text,
              fontSize: config.titleSize,
            }}
          >
            {title}
          </h5>
        </div>
      )}

      {!title && icon && (
        <div className={`${centered ? "text-center" : ""} mb-2`}>
          <i
            className={icon}
            style={{
              color: styles.icon,
              fontSize: config.iconSize,
            }}
            aria-hidden="true"
          ></i>
        </div>
      )}

      <div
        style={{
          color: styles.text,
          fontSize: config.contentSize,
        }}
      >
        {children}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`card ${config.padding} ${textAlign} ${className}`}
        style={cardStyle}
        onClick={onClick}
        aria-label={title || undefined}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div
      className={`card ${config.padding} ${textAlign} ${className}`}
      style={cardStyle}
      role="alert"
    >
      {cardContent}
    </div>
  );
};

export default AlertCard;
