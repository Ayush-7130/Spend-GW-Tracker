"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";
import { useGroup } from "./GroupContext";
import { CategoriesDataSource } from "@/datasource";

export interface Category {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  groupId?: string; // Categories are group-specific
  createdAt: string;
  updatedAt: string;
  subcategories?: Array<{
    name: string;
    description: string;
  }>;
}

interface CategoriesContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(
  undefined
);

// Cache duration - defined outside component to avoid re-creation on every render
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { activeGroup, isLoading: groupLoading } = useGroup();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [lastGroupId, setLastGroupId] = useState<string | null>(null);

  // Delegates to CategoriesDataSource for consistent API access
  const fetchCategories = useCallback(
    async (force = false) => {
      // Don't fetch if not authenticated or no active group
      if (!isAuthenticated || !activeGroup) {
        setCategories([]);
        setLoading(false);
        setError(null);
        return;
      }

      const now = Date.now();
      const groupChanged = lastGroupId !== activeGroup._id;

      // Use lastFetch and groupChanged for cache validation
      if (!force && !groupChanged && now - lastFetch < CACHE_DURATION) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch categories via datasource layer
        const categoriesData = await CategoriesDataSource.getCategories(
          activeGroup._id
        );
        setCategories(categoriesData as Category[]);
        setLastFetch(now);
        setLastGroupId(activeGroup._id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch categories"
        );
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, activeGroup, lastFetch, lastGroupId]
  );

  useEffect(() => {
    // Only fetch if not in loading state and authenticated with active group
    if (!authLoading && !groupLoading && isAuthenticated && activeGroup) {
      fetchCategories();
    }
  }, [
    isAuthenticated,
    authLoading,
    groupLoading,
    activeGroup,
    fetchCategories,
  ]);

  // Listen for group change events to refetch categories
  useEffect(() => {
    const handleGroupChange = () => {
      fetchCategories(true);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("groupChanged", handleGroupChange);
      return () =>
        window.removeEventListener("groupChanged", handleGroupChange);
    }
  }, [fetchCategories]);

  // Clear categories when user logs out or no active group
  useEffect(() => {
    if (!isAuthenticated || !activeGroup) {
      setCategories([]);
      setError(null);
      setLastFetch(0);
      setLastGroupId(null);
    }
  }, [isAuthenticated, activeGroup]);

  const refetchCategories = () => fetchCategories(true);

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        loading,
        error,
        refetchCategories,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
