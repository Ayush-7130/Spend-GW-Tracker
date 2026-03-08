/**
 * SearchableSelect Component
 *
 * A searchable dropdown/combobox component that provides typeahead functionality.
 * Supports both single and multi-select modes with keyboard navigation.
 *
 * Features:
 * - Typeahead search filtering
 * - Keyboard navigation (Arrow keys, Enter, Escape)
 * - Multi-select support
 * - Accessible with ARIA attributes
 * - Customizable styling
 * - Option grouping support
 *
 * @example
 * ```tsx
 * // Single select
 * <SearchableSelect
 *   options={categories}
 *   value={selectedCategory}
 *   onChange={setSelectedCategory}
 *   placeholder="Select category..."
 *   searchPlaceholder="Search categories..."
 * />
 *
 * // Multi-select
 * <SearchableSelect
 *   options={members}
 *   value={selectedMembers}
 *   onChange={setSelectedMembers}
 *   multiple
 *   placeholder="Select members..."
 * />
 * ```
 */

"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  KeyboardEvent,
} from "react";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
  group?: string;
  /** Additional data for custom rendering */
  data?: any;
}

export interface SearchableSelectProps {
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Currently selected value(s) */
  value: string | string[];
  /** Callback when selection changes */
  onChange: (value: string | string[]) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Placeholder for the search input */
  searchPlaceholder?: string;
  /** Enable multi-select mode */
  multiple?: boolean;
  /** Disable the select */
  disabled?: boolean;
  /** Show loading indicator */
  loading?: boolean;
  /** Error message to display */
  error?: string;
  /** Label for the field */
  label?: string;
  /** Whether field is required */
  required?: boolean;
  /** Helper text below the field */
  helperText?: string;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Minimum characters before showing options */
  minSearchChars?: number;
  /** Custom render function for options */
  renderOption?: (option: SelectOption, isSelected: boolean) => React.ReactNode;
  /** Custom render function for selected value display */
  renderValue?: (selected: SelectOption | SelectOption[]) => React.ReactNode;
  /** ID for the input element */
  id?: string;
  /** Callback for server-side search */
  onSearch?: (query: string) => void;
  /** Max height of dropdown */
  maxHeight?: number;
  /** Show clear button */
  clearable?: boolean;
  /** No options message */
  noOptionsMessage?: string;
  /** ARIA label */
  ariaLabel?: string;
}

const sizeClasses = {
  sm: "form-control-sm",
  md: "",
  lg: "form-control-lg",
};

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Type to search...",
  multiple = false,
  disabled = false,
  loading = false,
  error,
  label,
  required = false,
  helperText,
  className = "",
  size = "md",
  minSearchChars = 0,
  renderOption,
  renderValue,
  id,
  onSearch,
  maxHeight = 250,
  clearable = true,
  noOptionsMessage = "No options found",
  ariaLabel,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Convert value to array for consistent handling
  const selectedValues = useMemo(() => {
    if (multiple) {
      return Array.isArray(value) ? value : [];
    }
    return value ? [value as string] : [];
  }, [value, multiple]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (searchQuery.length < minSearchChars) {
      return options;
    }
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query)
    );
  }, [options, searchQuery, minSearchChars]);

  // Get selected option objects
  const selectedOptions = useMemo(() => {
    return options.filter((opt) => selectedValues.includes(opt.value));
  }, [options, selectedValues]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle server-side search
  useEffect(() => {
    if (onSearch && searchQuery.length >= minSearchChars) {
      onSearch(searchQuery);
    }
  }, [searchQuery, onSearch, minSearchChars]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
      if (!isOpen) {
        // Focus search input when opening
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
  }, [disabled, isOpen]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange(newValues);
      } else {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery("");
      }
      setHighlightedIndex(-1);
    },
    [multiple, selectedValues, onChange]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(multiple ? [] : "");
      setSearchQuery("");
    },
    [multiple, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < filteredOptions.length - 1 ? prev + 1 : 0
            );
          }
          break;

        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) =>
              prev > 0 ? prev - 1 : filteredOptions.length - 1
            );
          }
          break;

        case "Enter":
          e.preventDefault();
          if (
            isOpen &&
            highlightedIndex >= 0 &&
            filteredOptions[highlightedIndex]
          ) {
            const option = filteredOptions[highlightedIndex];
            if (!option.disabled) {
              handleSelect(option.value);
            }
          } else if (!isOpen) {
            setIsOpen(true);
          }
          break;

        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery("");
          setHighlightedIndex(-1);
          break;

        case "Tab":
          setIsOpen(false);
          setSearchQuery("");
          break;
      }
    },
    [disabled, isOpen, highlightedIndex, filteredOptions, handleSelect]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newQuery = e.target.value;
      setSearchQuery(newQuery);
      setHighlightedIndex(0);
    },
    []
  );

  const fieldId =
    id || `searchable-select-${Math.random().toString(36).substr(2, 9)}`;
  const sizeClass = sizeClasses[size];

  // Display value for the trigger
  const displayValue = useMemo(() => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }

    if (renderValue) {
      return renderValue(multiple ? selectedOptions : selectedOptions[0]);
    }

    if (multiple) {
      return selectedOptions.map((opt) => opt.label).join(", ");
    }

    return selectedOptions[0]?.label || placeholder;
  }, [selectedOptions, placeholder, multiple, renderValue]);

  const hasValue = selectedOptions.length > 0;

  return (
    <div className={`searchable-select ${className}`} ref={containerRef}>
      {label && (
        <label htmlFor={fieldId} className="form-label">
          {label}
          {required && <span className="text-danger ms-1">*</span>}
        </label>
      )}

      <div
        className={`position-relative`}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={ariaLabel || label || placeholder}
        aria-controls={`${fieldId}-listbox`}
      >
        {/* Trigger — visual form-control wrapper containing accessible button + clear button */}
        <div
          className={`form-control ${sizeClass} d-flex align-items-center p-0 ${
            error ? "is-invalid" : ""
          } ${disabled ? "disabled" : ""}`}
          style={{
            cursor: disabled ? "not-allowed" : "pointer",
            backgroundColor: "var(--input-bg)",
            borderColor: error ? "var(--status-error)" : "var(--input-border)",
            minHeight: size === "sm" ? "31px" : size === "lg" ? "48px" : "38px",
            overflow: "hidden",
          }}
        >
          <button
            type="button"
            className="flex-grow-1 border-0 text-start text-truncate"
            onClick={handleToggle}
            disabled={disabled}
            aria-label={
              hasValue
                ? `${ariaLabel || label || placeholder}: ${displayValue}`
                : ariaLabel || label || placeholder
            }
            style={{
              background: "none",
              color: hasValue ? "var(--input-text)" : "var(--text-muted)",
              padding:
                size === "sm"
                  ? "0.25rem 0.5rem"
                  : size === "lg"
                    ? "0.5rem 1rem"
                    : "0.375rem 0.75rem",
              minWidth: 0,
              maxWidth: "calc(100% - 40px)",
            }}
          >
            <span className="text-truncate d-block">{displayValue}</span>
          </button>
          <span
            className="d-flex align-items-center gap-1 pe-2"
            style={{ flexShrink: 0 }}
          >
            {loading && (
              <span
                className="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              >
                <span className="visually-hidden">Loading...</span>
              </span>
            )}
            {clearable && hasValue && !disabled ? (
              <button
                type="button"
                className="btn btn-link p-0 border-0"
                onClick={handleClear}
                aria-label="Clear selection"
                style={{ color: "var(--text-muted)", lineHeight: 1 }}
              >
                <i className="bi bi-x" style={{ fontSize: "20px" }} />
              </button>
            ) : (
              <i
                className="bi bi-chevron-down"
                aria-hidden="true"
                style={{ fontSize: "12px", color: "var(--text-muted)" }}
              />
            )}
          </span>
        </div>

        {/* Dropdown */}
        {isOpen && (
          <div
            className="position-absolute w-100 mt-1 shadow-sm rounded border"
            style={{
              backgroundColor: "var(--card-bg)",
              borderColor: "var(--border-color)",
              zIndex: 1060, // Higher than Bootstrap modal (1055) and modal backdrop (1050)
            }}
          >
            {/* Search Input */}
            <div
              className="p-2 border-bottom"
              style={{ borderColor: "var(--border-color)" }}
            >
              <input
                ref={inputRef}
                type="text"
                className={`form-control ${sizeClass}`}
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={handleSearchChange}
                onClick={(e) => e.stopPropagation()}
                aria-label="Search options"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                  color: "var(--input-text)",
                }}
              />
            </div>

            {/* Options List */}
            <div
              ref={listRef}
              className="list-unstyled mb-0"
              style={{
                maxHeight: `${maxHeight}px`,
                overflowY: "auto",
              }}
              id={`${fieldId}-listbox`}
              role="listbox"
              aria-label={ariaLabel || label || placeholder || "Options"}
              aria-multiselectable={multiple}
            >
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-muted text-center">
                  {loading ? "Loading..." : noOptionsMessage}
                </div>
              ) : (
                filteredOptions.map((option, index) => {
                  const isSelected = selectedValues.includes(option.value);
                  const isHighlighted = index === highlightedIndex;
                  const ariaDisabled: "true" | "false" = option.disabled
                    ? "true"
                    : "false";

                  return (
                    <div
                      key={option.value}
                      className={`px-3 py-2 ${option.disabled ? "text-muted" : ""}`}
                      style={{
                        cursor: option.disabled ? "not-allowed" : "pointer",
                        backgroundColor: isHighlighted
                          ? "var(--hover-bg)"
                          : isSelected
                            ? "var(--primary-bg-subtle)"
                            : "transparent",
                        color: option.disabled
                          ? "var(--text-muted)"
                          : "var(--text-primary)",
                      }}
                      onClick={() =>
                        !option.disabled && handleSelect(option.value)
                      }
                      onKeyDown={(e) => {
                        if (
                          (e.key === "Enter" || e.key === " ") &&
                          !option.disabled
                        ) {
                          e.preventDefault();
                          handleSelect(option.value);
                        }
                      }}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      role="option"
                      tabIndex={-1}
                      aria-selected={isSelected}
                      aria-disabled={ariaDisabled}
                      aria-label={
                        typeof option.label === "string"
                          ? option.label
                          : undefined
                      }
                    >
                      {renderOption ? (
                        renderOption(option, isSelected)
                      ) : (
                        <div className="d-flex align-items-center justify-content-between">
                          <span>{option.label}</span>
                          {isSelected && (
                            <i
                              className="bi bi-check2"
                              style={{ color: "var(--status-success)" }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <div className="invalid-feedback d-block">{error}</div>}
      {helperText && !error && (
        <div className="form-text text-muted">{helperText}</div>
      )}

      <style jsx>{`
        .searchable-select .form-select.disabled {
          background-color: var(--input-disabled-bg, #e9ecef);
          opacity: 0.65;
        }

        .searchable-select .form-select:focus {
          box-shadow: 0 0 0 0.25rem rgba(var(--primary-rgb, 13, 110, 253), 0.25);
        }
      `}</style>
    </div>
  );
}

export default SearchableSelect;
