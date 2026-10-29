"use client";

import dynamic from "next/dynamic";
import { ChartCardSkeleton } from "@/components/ui/Skeleton";

// recharts is loaded only when this chart mounts — the same pattern as the
// instructor StudentEngagement chart, keeping it out of the route bundle.
const PlatformTrend = dynamic(() => import("./PlatformTrend.chart"), {
    ssr: false,
    loading: () => <ChartCardSkeleton title="Loading trend" height="h-64" />,
});

export default PlatformTrend;
