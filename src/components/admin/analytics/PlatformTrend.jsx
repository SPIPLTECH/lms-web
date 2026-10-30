"use client";

import dynamic from "next/dynamic";

// recharts is loaded only when this chart mounts, keeping it out of the
// route bundle.
const PlatformTrend = dynamic(() => import("./PlatformTrend.chart"), {
    ssr: false,
    loading: () => (
        <div className="h-64 rounded-xl bg-muted/50 animate-pulse" role="status" aria-label="Loading trend" />
    ),
});

export default PlatformTrend;
