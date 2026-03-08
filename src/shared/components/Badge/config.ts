import { ReactNode } from "react";

// User badge configuration - now accepts any username
export interface UserBadgeProps {
  user: string; // Dynamic username from group members
  variant?: "default" | "small" | "avatar";
  showName?: boolean;
  className?: string;
}

// Status badge configuration
export interface StatusBadgeProps {
  status: string;
  type: "user" | "split" | "settlement" | "category" | "custom";
  variant?: "default" | "small";
  className?: string;
  color?: string;
}

// Generic badge configuration
export interface BadgeProps {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "light"
    | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
  outline?: boolean;
  title?: string;
}

// Helper function to generate user config dynamically for any user
export function getUserConfig(username: string) {
  // Generate config for users based on their username
  // Use consistent color based on username hash for visual consistency
  const colors = [
    "primary",
    "success",
    "info",
    "warning",
    "danger",
    "secondary",
  ];
  const colorIndex =
    username.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
    colors.length;

  return {
    name: username.charAt(0).toUpperCase() + username.slice(1),
    color: colors[colorIndex],
    avatar: username.charAt(0).toUpperCase(),
  };
}

export const statusTypeConfig = {
  user: {
    // No hardcoded users - all users are dynamic now
  },
  split: {
    split: "warning",
    personal: "light",
  },
  settlement: {
    owes: "danger",
    settled: "success",
    pending: "warning",
    completed: "success",
    cancelled: "secondary",
    borrow: "danger",
  },
  category: {
    default: "secondary",
  },
} as const;
