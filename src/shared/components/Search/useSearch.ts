/**
 * useSearch Hook
 *
 * A reusable hook for client-side filtering with debouncing support.
 * Can be used independently or with the SearchInput component.
 *
 * @example
 * ```tsx
 * const { query, setQuery, filteredData, clearSearch } = useSearch({
 *   data: categories,
 *   searchFields: ['name', 'description'],
 *   debounceMs: 300,
 * });
 * ```
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { UseSearchOptions, UseSearchResult } from "./config";

/**
 * Get nested value from an object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((current, key) => current?.[key], obj);
}

/**
 * Default filter function that checks if any of the specified fields
 * contain the search query (case-insensitive by default)
 */
function defaultFilterFn<T>(
  item: T,
  query: string,
  searchFields: (keyof T | string)[],
  caseSensitive: boolean
): boolean {
  const normalizedQuery = caseSensitive ? query : query.toLowerCase();

  return searchFields.some((field) => {
    const value = getNestedValue(item, String(field));
    if (value == null) return false;

    const stringValue = String(value);
    const normalizedValue = caseSensitive
      ? stringValue
      : stringValue.toLowerCase();

    return normalizedValue.includes(normalizedQuery);
  });
}

export function useSearch<T>(options: UseSearchOptions<T>): UseSearchResult<T> {
  const {
    data,
    searchFields,
    initialQuery = "",
    caseSensitive = false,
    customFilter,
    onResultsChange,
    debounceMs = 0,
  } = options;

  const [query, setQueryState] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle debounced query updates
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);

      if (debounceMs > 0) {
        setIsSearching(true);

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          setDebouncedQuery(newQuery);
          setIsSearching(false);
        }, debounceMs);
      } else {
        setDebouncedQuery(newQuery);
      }
    },
    [debounceMs]
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Filter data based on debounced query
  const filteredData = useMemo(() => {
    // Ensure we always return an array, even if data is undefined
    const safeData = data || [];

    if (!debouncedQuery.trim()) {
      return safeData;
    }

    if (customFilter) {
      return safeData.filter((item) => customFilter(item, debouncedQuery));
    }

    return safeData.filter((item) =>
      defaultFilterFn(item, debouncedQuery, searchFields, caseSensitive)
    );
  }, [data, debouncedQuery, searchFields, caseSensitive, customFilter]);

  // Notify parent of results change
  useEffect(() => {
    onResultsChange?.(filteredData, debouncedQuery);
  }, [filteredData, debouncedQuery, onResultsChange]);

  const clearSearch = useCallback(() => {
    setQuery("");
  }, [setQuery]);

  return {
    query,
    setQuery,
    filteredData,
    isSearching,
    clearSearch,
    hasResults: filteredData.length > 0,
    totalCount: data?.length || 0,
    resultCount: filteredData.length,
  };
}

export default useSearch;
