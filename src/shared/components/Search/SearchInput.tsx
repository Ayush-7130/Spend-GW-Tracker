/**
 * SearchInput Component
 *
 * A reusable, accessible search input with debouncing support.
 * Can be used for both client-side filtering and server-side search.
 *
 * Features:
 * - Debounced input (configurable delay)
 * - Clear button
 * - Loading indicator
 * - Keyboard navigation (Escape to clear)
 * - ARIA accessibility attributes
 * - Customizable styling (inherits Bootstrap classes)
 *
 * @example
 * ```tsx
 * // Basic usage with client-side filtering
 * <SearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   placeholder="Search categories..."
 * />
 *
 * // Server-side search with debouncing
 * <SearchInput
 *   value={searchQuery}
 *   onChange={setSearchQuery}
 *   onSearch={handleServerSearch}
 *   debounceMs={500}
 *   loading={isLoading}
 * />
 * ```
 */

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { SearchInputProps, defaultSearchConfig, sizeClasses } from "./config";

export function SearchInput({
  value,
  onChange,
  onSearch,
  loading = false,
  placeholder = defaultSearchConfig.placeholder,
  debounceMs = defaultSearchConfig.debounceMs,
  minChars = defaultSearchConfig.minChars,
  className = "",
  size = defaultSearchConfig.size,
  showClearButton = defaultSearchConfig.showClearButton,
  showSearchIcon = defaultSearchConfig.showSearchIcon,
  iconPosition = defaultSearchConfig.iconPosition,
  disabled = defaultSearchConfig.disabled,
  autoFocus = defaultSearchConfig.autoFocus,
  ariaLabel = defaultSearchConfig.ariaLabel,
  id,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      onChange(newValue);

      // Handle debounced server-side search
      if (onSearch && debounceMs && debounceMs > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
          if (newValue.length >= (minChars || 0)) {
            onSearch(newValue);
          }
        }, debounceMs);
      } else if (onSearch && newValue.length >= (minChars || 0)) {
        onSearch(newValue);
      }
    },
    [onChange, onSearch, debounceMs, minChars]
  );

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
    onSearch?.("");
    inputRef.current?.focus();
  }, [onChange, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    },
    [handleClear]
  );

  const inputId =
    id || `search-input-${Math.random().toString(36).substr(2, 9)}`;
  const sizeClass = size ? sizeClasses[size] : "";
  const hasValue = localValue.length > 0;
  const showLeftIcon = showSearchIcon && iconPosition === "left";
  const showRightIcon =
    showSearchIcon && iconPosition === "right" && !hasValue && !loading;

  return (
    <div
      className={`search-input-container position-relative ${className}`}
      style={{ width: "100%" }}
    >
      {/* Left search icon */}
      {showLeftIcon && (
        <i
          className="bi bi-search position-absolute"
          style={{
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted, #6c757d)",
            pointerEvents: "none",
            zIndex: 1,
          }}
          aria-hidden="true"
        />
      )}

      <input
        ref={inputRef}
        type="text"
        id={inputId}
        className={`form-control ${sizeClass}${showLeftIcon ? " search-has-left-icon" : ""}${(hasValue && showClearButton) || loading || showRightIcon ? " search-has-right-icon" : ""}`}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-busy={loading}
        autoComplete="off"
        style={{
          backgroundColor: "var(--input-bg)",
          borderColor: "var(--input-border)",
          color: "var(--input-text)",
        }}
      />

      {/* Right side icons (loading, clear, or search icon) */}
      <div
        className="position-absolute d-flex align-items-center gap-1"
        style={{
          right: "8px",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {loading && (
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-label="Searching..."
            style={{ color: "var(--text-muted, #6c757d)" }}
          />
        )}

        {!loading && hasValue && showClearButton && (
          <button
            type="button"
            className="btn btn-link p-0 border-0"
            onClick={handleClear}
            aria-label="Clear search"
            style={{
              color: "var(--text-muted, #6c757d)",
              lineHeight: 1,
              minWidth: "28px",
              minHeight: "28px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <i className="bi bi-x-circle-fill" style={{ fontSize: "14px" }} />
          </button>
        )}

        {showRightIcon && (
          <i
            className="bi bi-search"
            style={{
              color: "var(--text-muted, #6c757d)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
}

export default SearchInput;
