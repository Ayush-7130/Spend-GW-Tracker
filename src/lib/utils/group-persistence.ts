/**
 * Group Persistence Utilities
 *
 * Handles localStorage persistence for group state.
 * Extracted from GroupContext to separate persistence concerns.
 *
 * @module group-persistence
 */

const STORAGE_KEY = "selectedGroupId";

/**
 * Get the persisted selected group ID from localStorage
 * Returns null if no selection is stored or if running on server
 */
export function getPersistedGroupId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage may be blocked in some browsers
    return null;
  }
}

/**
 * Persist the selected group ID to localStorage
 * Fails silently if localStorage is unavailable
 */
export function persistGroupId(groupId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, groupId);
  } catch {
    // localStorage may be blocked in some browsers - fail silently
  }
}

/**
 * Clear the persisted group ID from localStorage
 */
export function clearPersistedGroupId(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
