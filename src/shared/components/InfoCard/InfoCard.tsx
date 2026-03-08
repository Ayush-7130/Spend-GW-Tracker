/**
 * InfoCard Component
 *
 * A reusable component for displaying labeled information with icons.
 * Used for displaying key-value pairs with consistent styling across the app.
 *
 * @example
 * ```tsx
 * <InfoCard
 *   icon="bi bi-calendar3"
 *   label="Date"
 *   value="01 Jan 2024"
 * />
 *
 * <InfoCard
 *   icon="bi bi-person-circle"
 *   label="Paid By"
 *   value={<UserBadge user={userName} variant="small" />}
 *   size="lg"
 * />
 * ```
 */

"use client";

import React, { ReactNode } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

export interface InfoCardProps {
  /** Icon class (Bootstrap icons) */
  icon?: string;
  /** Label text displayed above the value */
  label: string;
  /** Value to display - can be string or React component */
  value: ReactNode;
  /** Card size */
  size?: "sm" | "md" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Custom icon color */
  iconColor?: string;
  /** Custom label style */
  labelStyle?: React.CSSProperties;
  /** Custom value style */
  valueStyle?: React.CSSProperties;
  /** Whether to show border */
  showBorder?: boolean;
  /** Custom border color */
  borderColor?: string;
  /** Background color variant */
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  /** Click handler */
  onClick?: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  label,
  value,
  size = "md",
  className = "",
  iconColor,
  labelStyle,
  valueStyle,
  showBorder = true,
  borderColor,
  variant = "default",
  onClick,
}) => {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: "p-2",
      iconSize: "0.85rem",
      labelSize: "0.6rem",
      valueSize: "0.8rem",
      gap: "mb-1",
    },
    md: {
      padding: "p-2",
      iconSize: "0.9rem",
      labelSize: "0.65rem",
      valueSize: "0.875rem",
      gap: "mb-1",
    },
    lg: {
      padding: "p-3",
      iconSize: "1rem",
      labelSize: "0.75rem",
      valueSize: "1rem",
      gap: "mb-2",
    },
  };

  const config = sizeConfig[size];

  // Get variant background color
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: `${colors.button.primary.background}15`,
          borderColor: colors.button.primary.background,
        };
      case "success":
        return {
          backgroundColor: `${colors.status.success}15`,
          borderColor: colors.status.success,
        };
      case "warning":
        return {
          backgroundColor: `${colors.status.warning}15`,
          borderColor: colors.status.warning,
        };
      case "danger":
        return {
          backgroundColor: `${colors.status.error}15`,
          borderColor: colors.status.error,
        };
      case "info":
        return {
          backgroundColor: `${colors.status.info}15`,
          borderColor: colors.status.info,
        };
      default:
        return {
          backgroundColor: colors.card.background,
          borderColor: borderColor || colors.card.border,
        };
    }
  };

  const variantStyles = getVariantStyles();

  const cardStyle: React.CSSProperties = {
    backgroundColor: variantStyles.backgroundColor,
    border: showBorder ? `1px solid ${variantStyles.borderColor}` : "none",
    cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s ease",
  };

  const defaultIconColor = iconColor || colors.text.secondary;
  const defaultLabelStyle: React.CSSProperties = {
    color: colors.text.secondary,
    fontSize: config.labelSize,
    ...labelStyle,
  };
  const defaultValueStyle: React.CSSProperties = {
    color: colors.text.primary,
    fontSize: config.valueSize,
    ...valueStyle,
  };

  const cardContent = (
    <>
      <div className={`d-flex align-items-center ${config.gap}`}>
        {icon && (
          <i
            className={`${icon} me-1`}
            style={{ color: defaultIconColor, fontSize: config.iconSize }}
            aria-hidden="true"
          ></i>
        )}
        <small className="text-uppercase fw-semibold" style={defaultLabelStyle}>
          {label}
        </small>
      </div>
      <div className="fw-semibold" style={defaultValueStyle}>
        {value}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`rounded ${config.padding} ${className}`}
        style={{
          ...cardStyle,
          width: "100%",
          textAlign: "left" as const,
          border: cardStyle.border || "none",
        }}
        onClick={onClick}
        aria-label={label}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div className={`rounded ${config.padding} ${className}`} style={cardStyle}>
      {cardContent}
    </div>
  );
};

export default InfoCard;
