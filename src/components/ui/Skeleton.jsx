'use client';

// Helper for standard pulsing container
function Pulse({ className = '', children }) {
  return (
    <div className={`animate-pulse bg-muted rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function ChartCardSkeleton({ height = "h-96" }) {
  return (
    <div className="rounded-2xl border border-card-border bg-card shadow-sm overflow-hidden">
      <div className="flex justify-between items-center border-b border-border/80 px-6 py-5">
        <div className="space-y-2">
          <Pulse className="h-5 w-32" />
          <Pulse className="h-3.5 w-48" />
        </div>
        <Pulse className="h-8 w-20 rounded-lg" />
      </div>
      <div className="p-6">
        <div className={`${height} flex items-end justify-between gap-3 pt-6 border-b border-l border-border`}>
          <Pulse className="h-[40%] w-full rounded-t-lg" />
          <Pulse className="h-[75%] w-full rounded-t-lg" />
          <Pulse className="h-[55%] w-full rounded-t-lg" />
          <Pulse className="h-[90%] w-full rounded-t-lg" />
          <Pulse className="h-[30%] w-full rounded-t-lg" />
          <Pulse className="h-[60%] w-full rounded-t-lg" />
          <Pulse className="h-[80%] w-full rounded-t-lg" />
        </div>
      </div>
    </div>
  );
}
