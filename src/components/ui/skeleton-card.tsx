import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-xl bg-card border border-border p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-8 w-20 rounded-lg" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-5 w-32" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonStatsCard() {
  return (
    <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 bg-slate-700" />
        <Skeleton className="h-8 w-8 rounded-lg bg-slate-700" />
      </div>
      <Skeleton className="h-8 w-20 bg-slate-700" />
      <Skeleton className="h-12 w-full bg-slate-700" />
    </div>
  );
}

export function SkeletonAdminDashboard() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
            <Skeleton className="h-5 w-32 bg-slate-700 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-slate-700 last:border-0">
                <Skeleton className="h-10 w-10 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3 bg-slate-700" />
                  <Skeleton className="h-3 w-1/4 bg-slate-700" />
                </div>
                <Skeleton className="h-8 w-16 rounded-lg bg-slate-700" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4 h-[350px]">
            <Skeleton className="h-5 w-24 bg-slate-700 mb-4" />
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Skeleton className="h-2 w-2 rounded-full bg-slate-700" />
                <Skeleton className="h-4 flex-1 bg-slate-700" />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
            <Skeleton className="h-5 w-28 bg-slate-700 mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0">
                <Skeleton className="h-4 w-20 bg-slate-700" />
                <Skeleton className="h-6 w-16 rounded-full bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTriageHistory() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      ))}
    </div>
  );
}
