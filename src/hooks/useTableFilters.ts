/**
 * Reusable hook for table filtering, sorting, and pagination logic.
 * Consolidates common patterns from expenses and settlements pages.
 */

import { useState, useCallback, useMemo } from "react";

// Pagination state and helpers
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Sort configuration
export interface SortConfig {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

// Generic filter configuration type
export type FilterConfig = Record<
  string,
  string | number | boolean | undefined
>;

// Options for useTableFilters hook
export interface UseTableFiltersOptions<T, F extends FilterConfig> {
  data: T[];
  initialFilters: F;
  initialSort?: SortConfig;
  initialPagination?: Partial<PaginationState>;
  filterFn?: (item: T, filters: F) => boolean;
  sortFn?: (a: T, b: T, sortConfig: SortConfig) => number;
  searchFields?: (keyof T)[];
  searchKey?: keyof F;
}

// Return type for useTableFilters hook
export interface UseTableFiltersReturn<T, F extends FilterConfig> {
  // Data
  filteredData: T[];
  paginatedData: T[];

  // Filters
  filters: F;
  setFilters: React.Dispatch<React.SetStateAction<F>>;
  updateFilter: <K extends keyof F>(key: K, value: F[K]) => void;
  clearFilters: () => void;

  // Sorting
  sortConfig: SortConfig;
  handleSort: (column: string) => void;
  getSortIcon: (column: string) => string;

  // Pagination
  pagination: PaginationState;
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>;
  goToPage: (page: number) => void;
  changeLimit: (limit: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Counts
  totalFiltered: number;
  totalItems: number;
}

/**
 * Hook for managing table filtering, sorting, and pagination
 */
export function useTableFilters<T, F extends FilterConfig>({
  data,
  initialFilters,
  initialSort = { sortBy: "date", sortOrder: "desc" },
  initialPagination = { page: 1, limit: 10 },
  filterFn,
  sortFn,
  searchFields = [],
  searchKey = "search" as keyof F,
}: UseTableFiltersOptions<T, F>): UseTableFiltersReturn<T, F> {
  // State
  const [filters, setFilters] = useState<F>(initialFilters);
  const [sortConfig, setSortConfig] = useState<SortConfig>(initialSort);
  const [pagination, setPagination] = useState<PaginationState>({
    page: initialPagination.page || 1,
    limit: initialPagination.limit || 10,
    total: data.length,
    pages: Math.ceil(data.length / (initialPagination.limit || 10)),
  });

  // Default search filter
  const defaultSearchFilter = useCallback(
    (item: T, searchValue: string): boolean => {
      if (!searchValue || searchFields.length === 0) return true;
      const lowerSearch = searchValue.toLowerCase();
      return searchFields.some((field) => {
        const value = item[field];
        if (typeof value === "string") {
          return value.toLowerCase().includes(lowerSearch);
        }
        if (typeof value === "number") {
          return value.toString().includes(lowerSearch);
        }
        return false;
      });
    },
    [searchFields]
  );

  // Default sort function
  const defaultSortFn = useCallback(
    (a: T, b: T, config: SortConfig): number => {
      const aValue = (a as Record<string, unknown>)[config.sortBy];
      const bValue = (b as Record<string, unknown>)[config.sortBy];

      let comparison = 0;
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime();
      } else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else if (typeof aValue === "string" && typeof bValue === "string") {
        comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
      }

      return config.sortOrder === "asc" ? comparison : -comparison;
    },
    []
  );

  // Filtered and sorted data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply custom filter function or default search
    if (filterFn) {
      result = result.filter((item) => filterFn(item, filters));
    } else {
      // Apply default search filter
      const searchValue = filters[searchKey] as string | undefined;
      if (searchValue) {
        result = result.filter((item) =>
          defaultSearchFilter(item, searchValue)
        );
      }
    }

    // Apply sorting
    const sortFunction = sortFn || defaultSortFn;
    result.sort((a, b) => sortFunction(a, b, sortConfig));

    return result;
  }, [
    data,
    filters,
    filterFn,
    sortFn,
    sortConfig,
    searchKey,
    defaultSearchFilter,
    defaultSortFn,
  ]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return filteredData.slice(start, end);
  }, [filteredData, pagination.page, pagination.limit]);

  // Update pagination when filtered data changes
  useMemo(() => {
    const newPages = Math.ceil(filteredData.length / pagination.limit) || 1;
    if (
      pagination.pages !== newPages ||
      pagination.total !== filteredData.length
    ) {
      setPagination((prev) => ({
        ...prev,
        total: filteredData.length,
        pages: newPages,
        page: Math.min(prev.page, newPages),
      }));
    }
  }, [
    filteredData.length,
    pagination.limit,
    pagination.pages,
    pagination.total,
  ]);

  // Filter helpers
  const updateFilter = useCallback(<K extends keyof F>(key: K, value: F[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on filter change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [initialFilters]);

  // Sort helpers
  const handleSort = useCallback((column: string) => {
    setSortConfig((prev) => ({
      sortBy: column,
      sortOrder:
        prev.sortBy === column && prev.sortOrder === "desc" ? "asc" : "desc",
    }));
  }, []);

  const getSortIcon = useCallback(
    (column: string) => {
      if (sortConfig.sortBy !== column) return "bi-arrow-down-up";
      return sortConfig.sortOrder === "asc" ? "bi-arrow-up" : "bi-arrow-down";
    },
    [sortConfig]
  );

  // Pagination helpers
  const goToPage = useCallback((page: number) => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.pages)),
    }));
  }, []);

  const changeLimit = useCallback((limit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit,
      page: 1,
      pages: Math.ceil(prev.total / limit),
    }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.min(prev.page + 1, prev.pages),
    }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      page: Math.max(prev.page - 1, 1),
    }));
  }, []);

  return {
    // Data
    filteredData,
    paginatedData,

    // Filters
    filters,
    setFilters,
    updateFilter,
    clearFilters,

    // Sorting
    sortConfig,
    handleSort,
    getSortIcon,

    // Pagination
    pagination,
    setPagination,
    goToPage,
    changeLimit,
    nextPage,
    prevPage,

    // Counts
    totalFiltered: filteredData.length,
    totalItems: data.length,
  };
}

export default useTableFilters;
