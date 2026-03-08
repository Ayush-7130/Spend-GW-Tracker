/**
 * Web Vitals Reporter Component
 *
 * Automatically tracks and reports Web Vitals metrics for the application.
 * Should be included in the root layout.
 *
 * Uses reportWebVitals from performance.ts for consistent reporting behavior.
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { reportWebVitals, type WebVitalsMetric } from "@/lib/utils/performance";

export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // Mark navigation
    if (performance.mark) {
      performance.mark(`page-${pathname}-start`);
    }

    return () => {
      // Mark navigation end
      if (performance.mark && performance.measure) {
        performance.mark(`page-${pathname}-end`);
        try {
          performance.measure(
            `page-${pathname}`,
            `page-${pathname}-start`,
            `page-${pathname}-end`
          );
        } catch {
          // Ignore if marks don't exist
        }
      }
    };
  }, [pathname]);

  useEffect(() => {
    // Import web-vitals dynamically to reduce initial bundle
    import("web-vitals")
      .then((webVitals) => {
        const { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } = webVitals;

        // Track Core Web Vitals using centralized reporter
        onCLS((metric) => {
          reportWebVitals(metric as WebVitalsMetric);
        });

        onFID((metric) => {
          reportWebVitals(metric as WebVitalsMetric);
        });

        onLCP((metric) => {
          reportWebVitals(metric as WebVitalsMetric);
        });

        onFCP((metric) => {
          reportWebVitals(metric as WebVitalsMetric);
        });

        onTTFB((metric) => {
          reportWebVitals(metric as WebVitalsMetric);
        });

        onINP((metric) => {
          reportWebVitals(metric as WebVitalsMetric);
        });
      })
      .catch(() => {});
  }, []);

  return null;
}
