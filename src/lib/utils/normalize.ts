/**
 * ID Normalization Utilities
 *
 * Normalizes MongoDB _id fields to consistent 'id' fields for UI consumption.
 * Addresses Consistency #4 from the audit report - mixture of _id, groupId, and id.
 *
 * @module normalize
 */

/**
 * Base type for objects that may have MongoDB _id
 */
interface WithMongoId {
  _id?: string;
  id?: string;
  [key: string]: unknown;
}

/**
 * Normalize a single object's _id to id
 * Preserves existing id if present, otherwise uses _id
 */
export function normalizeId<T extends WithMongoId>(obj: T): T & { id: string } {
  if (!obj) {
    return obj as T & { id: string };
  }

  const id = obj.id || obj._id || "";
  return {
    ...obj,
    id,
  };
}

/**
 * Normalize an array of objects, converting _id to id
 */
export function normalizeIds<T extends WithMongoId>(
  arr: T[]
): (T & { id: string })[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(normalizeId);
}

/**
 * Normalize group ID from various sources
 * Groups may use _id, groupId, or id interchangeably
 */
export function normalizeGroupId(
  group: { _id?: string; groupId?: string; id?: string } | null
): string {
  if (!group) {
    return "";
  }
  return group.id || group.groupId || group._id || "";
}

/**
 * Extract ID from an object that may have _id or id
 * Useful for comparison operations
 */
export function extractId(
  obj: WithMongoId | string | null | undefined
): string {
  if (!obj) {
    return "";
  }
  if (typeof obj === "string") {
    return obj;
  }
  return obj.id || obj._id || "";
}

/**
 * Check if two objects/IDs refer to the same entity
 */
export function isSameId(
  a: WithMongoId | string | null | undefined,
  b: WithMongoId | string | null | undefined
): boolean {
  return extractId(a) === extractId(b) && extractId(a) !== "";
}
