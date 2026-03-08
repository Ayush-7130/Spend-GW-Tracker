/**
 * Chart.js configuration utilities and common options
 */

import { ChartOptions, TooltipItem } from "chart.js";
import { formatCurrency } from "./currency";
import { chartPalettes } from "@/styles/colors";

/**
 * Helper function to get CSS variable value from the document
 * @param varName - CSS variable name (without --)
 * @returns The computed value or fallback
 */
const getCSSVar = (varName: string): string => {
  if (typeof document !== "undefined") {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(`--${varName}`)
      .trim();
  }
  return "";
};

/**
 * Get current theme from document
 * @returns 'light' or 'dark'
 */
export const getCurrentTheme = (): "light" | "dark" => {
  if (typeof document !== "undefined") {
    const theme = document.documentElement.getAttribute("data-theme");
    return theme === "dark" ? "dark" : "light";
  }
  return "light";
};

/**
 * Standard color palette for charts - uses CSS variables for theme-awareness
 */
export const getChartColorPalette = () => {
  const theme = getCurrentTheme();
  return {
    primary:
      getCSSVar("chart-primary") || (theme === "light" ? "#A294F9" : "#3B82F6"),
    success:
      getCSSVar("chart-secondary") ||
      (theme === "light" ? "#22C55E" : "#10B981"),
    warning: getCSSVar("chart-tertiary") || "#F59E0B",
    danger: getCSSVar("chart-quaternary") || "#EF4444",
    indigo: "#8B5CF6",
    orange: "#F97316",
    teal: "#06B6D4",
    pink: "#EC4899",
  };
};

/**
 * Legacy constant - use getChartColorPalette() instead
 * @deprecated
 */
export const CHART_COLORS = {
  get primary() {
    return getChartColorPalette().primary;
  },
  get success() {
    return getChartColorPalette().success;
  },
  get warning() {
    return getChartColorPalette().warning;
  },
  get danger() {
    return getChartColorPalette().danger;
  },
  get indigo() {
    return getChartColorPalette().indigo;
  },
  get orange() {
    return getChartColorPalette().orange;
  },
  get teal() {
    return getChartColorPalette().teal;
  },
  get pink() {
    return getChartColorPalette().pink;
  },
} as const;

/**
 * Get an array of chart colors
 * @param count - Number of colors needed
 * @param theme - Theme to use ('light' | 'dark')
 * @returns Array of color strings
 */
export const getChartColors = (
  count: number = 8,
  theme: "light" | "dark" = "light"
): string[] => {
  const palette =
    theme === "light" ? chartPalettes.primary : chartPalettes.professional;
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    result.push(palette[i % palette.length]);
  }

  return result;
};

/**
 * Common chart options for line charts with currency formatting
 */
export const getLineChartOptions = (
  hideGrid: boolean = false,
  theme?: "light" | "dark"
): ChartOptions<"line"> => {
  const currentTheme = theme || getCurrentTheme();
  const textPrimary =
    getCSSVar("text-primary") ||
    (currentTheme === "light" ? "#2D1B69" : "#E2E8F0");
  const textSecondary =
    getCSSVar("text-secondary") ||
    (currentTheme === "light" ? "#4C3D8B" : "#CBD5E1");
  const textTertiary =
    getCSSVar("text-tertiary") ||
    (currentTheme === "light" ? "#6B5B95" : "#94A3B8");
  const borderSecondary =
    getCSSVar("border-secondary") ||
    (currentTheme === "light" ? "#E5D9F2" : "#374151");

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
        labels: {
          color: textPrimary,
        },
      },
      tooltip: {
        backgroundColor:
          currentTheme === "light"
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(30, 41, 59, 0.95)",
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: borderSecondary,
        borderWidth: 1,
        callbacks: {
          label: function (context: TooltipItem<"line">) {
            const value = context.parsed.y ?? 0;
            return `${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: !hideGrid,
          color: borderSecondary,
        },
        ticks: {
          color: textTertiary,
          callback: function (value: string | number) {
            return formatCurrency(Number(value));
          },
        },
      },
      x: {
        grid: {
          display: !hideGrid,
          color: borderSecondary,
        },
        ticks: {
          color: textTertiary,
        },
      },
    },
  };
};

/**
 * Common chart options for bar charts with currency formatting
 */
export const getBarChartOptions = (
  stacked: boolean = false,
  theme?: "light" | "dark"
): ChartOptions<"bar"> => {
  const currentTheme = theme || getCurrentTheme();
  const textPrimary =
    getCSSVar("text-primary") ||
    (currentTheme === "light" ? "#2D1B69" : "#E2E8F0");
  const textSecondary =
    getCSSVar("text-secondary") ||
    (currentTheme === "light" ? "#4C3D8B" : "#CBD5E1");
  const textTertiary =
    getCSSVar("text-tertiary") ||
    (currentTheme === "light" ? "#6B5B95" : "#94A3B8");
  const borderSecondary =
    getCSSVar("border-secondary") ||
    (currentTheme === "light" ? "#E5D9F2" : "#374151");

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          color: textPrimary,
          padding: 15,
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor:
          currentTheme === "light"
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(30, 41, 59, 0.95)",
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: borderSecondary,
        borderWidth: 1,
        callbacks: {
          label: function (context: TooltipItem<"bar">) {
            const label = context.dataset.label || "";
            const value = context.parsed.y ?? 0;
            return `${label}: ${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      x: {
        stacked: stacked,
        grid: {
          color: borderSecondary,
        },
        ticks: {
          color: textTertiary,
        },
      },
      y: {
        stacked: stacked,
        beginAtZero: true,
        grid: {
          color: borderSecondary,
        },
        ticks: {
          color: textTertiary,
          callback: function (value: string | number) {
            return formatCurrency(Number(value));
          },
        },
      },
    },
  };
};

/**
 * Common chart options for pie/doughnut charts with currency formatting
 */
export const getPieChartOptions = (
  showPercentage: boolean = true,
  theme?: "light" | "dark"
): ChartOptions<"pie"> => {
  const currentTheme = theme || getCurrentTheme();
  const textPrimary =
    getCSSVar("text-primary") ||
    (currentTheme === "light" ? "#2D1B69" : "#E2E8F0");
  const textSecondary =
    getCSSVar("text-secondary") ||
    (currentTheme === "light" ? "#4C3D8B" : "#CBD5E1");
  const borderSecondary =
    getCSSVar("border-secondary") ||
    (currentTheme === "light" ? "#E5D9F2" : "#374151");

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          color: textPrimary,
        },
      },
      tooltip: {
        backgroundColor:
          currentTheme === "light"
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(30, 41, 59, 0.95)",
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: borderSecondary,
        borderWidth: 1,
        callbacks: {
          label: function (context: TooltipItem<"pie">) {
            const value = context.parsed ?? 0;
            const dataArray = context.dataset.data as number[];
            const total = dataArray.reduce(
              (a: number, b: number) => a + (b ?? 0),
              0
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

            if (showPercentage) {
              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
            }
            return `${context.label}: ${formatCurrency(value)}`;
          },
        },
      },
    },
  };
};

/**
 * Common chart options for doughnut charts with currency formatting
 */
export const getDoughnutChartOptions = (
  showPercentage: boolean = true,
  theme?: "light" | "dark"
): ChartOptions<"doughnut"> => {
  const currentTheme = theme || getCurrentTheme();
  const textPrimary =
    getCSSVar("text-primary") ||
    (currentTheme === "light" ? "#2D1B69" : "#E2E8F0");
  const textSecondary =
    getCSSVar("text-secondary") ||
    (currentTheme === "light" ? "#4C3D8B" : "#CBD5E1");
  const borderSecondary =
    getCSSVar("border-secondary") ||
    (currentTheme === "light" ? "#E5D9F2" : "#374151");

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          color: textPrimary,
        },
      },
      tooltip: {
        backgroundColor:
          currentTheme === "light"
            ? "rgba(255, 255, 255, 0.95)"
            : "rgba(30, 41, 59, 0.95)",
        titleColor: textPrimary,
        bodyColor: textSecondary,
        borderColor: borderSecondary,
        borderWidth: 1,
        callbacks: {
          label: function (context: TooltipItem<"doughnut">) {
            const value = context.parsed ?? 0;
            const dataArray = context.dataset.data as number[];
            const total = dataArray.reduce(
              (a: number, b: number) => a + (b ?? 0),
              0
            );
            const percentage =
              total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

            if (showPercentage) {
              return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
            }
            return `${context.label}: ${formatCurrency(value)}`;
          },
        },
      },
    },
  };
};

/**
 * Create line chart dataset configuration
 * @param label - Dataset label
 * @param data - Data points
 * @param color - Primary color
 * @param filled - Whether to fill area under line
 * @param highlightToday - Whether to highlight today's point
 * @param todayIndex - Index of today's data point
 */
export const createLineDataset = (
  label: string,
  data: number[],
  color: string = CHART_COLORS.primary,
  filled: boolean = true,
  highlightToday: boolean = false,
  todayIndex: number = -1
) => {
  const pointColors = data.map((_, index) =>
    highlightToday && index === todayIndex ? CHART_COLORS.danger : color
  );

  const pointRadii = data.map((_, index) =>
    highlightToday && index === todayIndex ? 6 : 3
  );

  return {
    label,
    data,
    borderColor: color,
    backgroundColor: filled ? `${color}1A` : color, // 1A = 10% opacity
    fill: filled,
    tension: 0.4,
    pointBackgroundColor: pointColors,
    pointBorderColor: pointColors,
    pointRadius: pointRadii,
    pointHoverRadius: data.map((_, index) =>
      highlightToday && index === todayIndex ? 8 : 5
    ),
  };
};

/**
 * Create bar chart dataset configuration
 * @param label - Dataset label
 * @param data - Data points
 * @param color - Bar color
 */
export const createBarDataset = (
  label: string,
  data: number[],
  color: string = CHART_COLORS.primary
) => ({
  label,
  data,
  backgroundColor: color,
  borderColor: color,
  borderWidth: 1,
});

/**
 * Get user-specific color
 * @param userName - User name
 * @param theme - Theme to use ('light' | 'dark')
 * @returns Color string
 */
export const getUserColor = (
  userName: string,
  theme?: "light" | "dark"
): string => {
  const currentTheme = theme || getCurrentTheme();
  const palette = getChartColorPalette();

  // Generate a consistent color based on username hash
  const hash = userName.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  const colors =
    currentTheme === "light"
      ? [palette.primary, palette.success, palette.indigo, palette.warning]
      : [palette.primary, palette.success, palette.teal, palette.warning];

  return colors[Math.abs(hash) % colors.length];
};
