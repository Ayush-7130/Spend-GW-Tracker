/**
 * Search Component Configuration
 *
 * Provides type definitions and configuration options for the shared Search component.
 * Supports both client-side filtering and server-side search with optional debouncing.
 */

export interface SearchConfig {
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 300ms) */
  debounceMs?: number;
  /** Minimum characters required before triggering search (default: 0) */
  minChars?: number;
  /** Whether search is case-sensitive (default: false) */
  caseSensitive?: boolean;
  /** Custom CSS class for the search container */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show clear button when input has value */
  showClearButton?: boolean;
  /** Whether to show search icon */
  showSearchIcon?: boolean;
  /** Icon position when search icon is shown */
  iconPosition?: "left" | "right";
  /** Whether the search input is disabled */
  disabled?: boolean;
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
  /** ARIA label for accessibility */
  ariaLabel?: string;
}

export interface SearchInputProps extends SearchConfig {
  /** Current search value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Optional callback for server-side search (called after debounce) */
  onSearch?: (query: string) => void;
  /** Loading state indicator */
  loading?: boolean;
  /** ID for the input element */
  id?: string;
}

export interface UseSearchOptions<T> {
  /** The data array to filter (can be undefined during loading) */
  data: T[] | undefined;
  /** Fields to search within each item */
  searchFields: (keyof T | string)[];
  /** Initial search query */
  initialQuery?: string;
  /** Whether search is case-sensitive */
  caseSensitive?: boolean;
  /** Custom filter function (overrides default) */
  customFilter?: (item: T, query: string) => boolean;
  /** Callback when filtered results change */
  onResultsChange?: (results: T[], query: string) => void;
  /** Debounce delay for the search */
  debounceMs?: number;
}

export interface UseSearchResult<T> {
  /** Current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Filtered data based on search query */
  filteredData: T[];
  /** Whether currently searching (for debounced searches) */
  isSearching: boolean;
  /** Clear the search query */
  clearSearch: () => void;
  /** Check if there are any results */
  hasResults: boolean;
  /** Total count of original data */
  totalCount: number;
  /** Count of filtered results */
  resultCount: number;
}

export const defaultSearchConfig: SearchConfig = {
  placeholder: "Search...",
  debounceMs: 300,
  minChars: 0,
  caseSensitive: false,
  size: "md",
  showClearButton: true,
  showSearchIcon: true,
  iconPosition: "left",
  disabled: false,
  autoFocus: false,
  ariaLabel: "Search",
};

export const sizeClasses = {
  sm: "form-control-sm",
  md: "",
  lg: "form-control-lg",
} as const;
