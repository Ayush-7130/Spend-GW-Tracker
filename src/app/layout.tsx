import type { Metadata, Viewport } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import "@/styles/accessibility.css";
import { ClientWrapper } from "@/components/ClientWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

export const metadata: Metadata = {
  title: "Spend Tracker",
  description: "Track your expenses and manage your budget with ease",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {/* Skip to main content link for keyboard/screen reader users */}
        <a href="#main-content" className="visually-hidden-focusable">
          Skip to main content
        </a>
        <ErrorBoundary>
          <ClientWrapper>{children}</ClientWrapper>
        </ErrorBoundary>
        {/* Performance monitoring - only adds ~5KB gzipped */}
        <WebVitalsReporter />
      </body>
    </html>
  );
}
