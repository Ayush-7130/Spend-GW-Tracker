"use client";

import React, { useEffect } from "react";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GroupProvider } from "@/contexts/GroupContext";
import { CategoriesProvider } from "@/contexts/CategoriesContext";
import AuthGuard from "./AuthGuard";

interface ClientWrapperProps {
  children: React.ReactNode;
}

export const ClientWrapper: React.FC<ClientWrapperProps> = ({ children }) => {
  // Load Bootstrap JS from npm (replaces CDN script blocked by CSP)
  useEffect(() => {
    import("bootstrap/dist/js/bootstrap.bundle.min.js").catch(() => {
      // Bootstrap JS failed to load - non-critical, dropdowns may not work
    });
  }, []);

  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <AuthGuard>
            <GroupProvider>
              <CategoriesProvider>{children}</CategoriesProvider>
            </GroupProvider>
          </AuthGuard>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};
