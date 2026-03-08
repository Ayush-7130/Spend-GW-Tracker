"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { AnalyticsOverviewSkeleton } from "@/shared/components";

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/analytics/overview");
  }, [router]);

  return (
    <MainLayout>
      <AnalyticsOverviewSkeleton />
    </MainLayout>
  );
}
