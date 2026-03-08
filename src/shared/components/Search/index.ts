/**
 * Search Component Exports
 *
 * This module provides reusable search functionality including:
 * - SearchInput: A styled, accessible search input with debouncing
 * - SearchableSelect: A searchable dropdown/combobox with typeahead
 * - useSearch: A hook for client-side filtering with debounce support
 * - Configuration types and defaults
 *
 * @example
 * ```tsx
 * import { SearchInput, useSearch, SearchableSelect } from '@/shared/components/Search';
 *
 * // Using the hook for client-side filtering
 * const { query, setQuery, filteredData } = useSearch({
 *   data: items,
 *   searchFields: ['name', 'description'],
 * });
 *
 * // Using the input component directly
 * <SearchInput value={query} onChange={setQuery} placeholder="Search..." />
 *
 * // Using searchable select for dropdowns
 * <SearchableSelect
 *   options={options}
 *   value={selected}
 *   onChange={setSelected}
 *   placeholder="Select..."
 * />
 * ```
 */

export { SearchInput, default as SearchInputDefault } from "./SearchInput";
export {
  SearchableSelect,
  default as SearchableSelectDefault,
} from "./SearchableSelect";
export type { SelectOption, SearchableSelectProps } from "./SearchableSelect";
export { useSearch, default as useSearchDefault } from "./useSearch";
export * from "./config";
