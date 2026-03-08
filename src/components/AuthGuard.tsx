"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthPageSkeleton, AppShellSkeleton } from "@/shared/components";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/signup",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
  ];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !pathname) return;

    // Don't do anything while still loading
    if (loading) {
      return;
    }

    // Public routes - no redirect needed for unauthenticated users
    if (isPublicRoute && !isAuthenticated) {
      return;
    }

    // FIX M25: Use Next.js router instead of window.location.href for client-side navigation
    // Redirect authenticated users away from public auth pages
    if (isPublicRoute && isAuthenticated) {
      router.replace("/");
      return;
    }

    // Redirect unauthenticated users from protected routes to login
    if (!isPublicRoute && !isAuthenticated) {
      router.replace("/login");
      return;
    }
  }, [isAuthenticated, loading, isPublicRoute, isMounted, pathname, router]);

  // Prevent hydration mismatch by not rendering anything during SSR
  if (!isMounted) {
    return null;
  }

  // Show loading during authentication check
  if (loading) {
    // Show app shell for protected routes, auth form skeleton for public routes
    return isPublicRoute ? <AuthPageSkeleton /> : <AppShellSkeleton />;
  }

  // Show public routes without authentication check
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show protected content only if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // This will rarely show as the useEffect handles redirection
  return <AppShellSkeleton />;
}
