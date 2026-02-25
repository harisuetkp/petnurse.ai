import { memo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * A polished skeleton loader for diagnostic step cards.
 * Provides a professional loading state during question generation.
 */
export const DiagnosticSkeleton = memo(function DiagnosticSkeleton() {
  return (
    <div className="apple-card p-6 animate-fade-in">
      {/* Title skeleton */}
      <Skeleton className="h-6 w-3/4 mb-2 rounded-lg" />
      {/* Subtitle skeleton */}
      <Skeleton className="h-4 w-1/2 mb-6 rounded-lg" />

      {/* Option buttons skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </div>
  );
});
