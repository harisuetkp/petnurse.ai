import { memo } from "react";
import { Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReviewsSocialProofProps {
  maxReviews?: number;
  className?: string;
}

export const ReviewsSocialProof = memo(function ReviewsSocialProof({
  maxReviews = 3,
  className = "",
}: ReviewsSocialProofProps) {
  const { data: reviews } = useQuery({
    queryKey: ["public-reviews-proof", maxReviews],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_reviews_public")
        .select("display_name, comment, rating, pet_type")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(maxReviews);
      if (error) throw error;
      return data;
    },
    staleTime: 60000,
  });

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className={className}>
      <div className="text-center mb-4">
        <p className="text-sm font-semibold text-foreground">What pet owners are saying</p>
        <div className="flex items-center justify-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="h-3.5 w-3.5 text-warning-amber fill-warning-amber" />
          ))}
          <span className="text-xs text-muted-foreground ml-1.5 font-medium">4.9/5</span>
        </div>
      </div>
      <div className="space-y-3">
        {reviews.map((review, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-1 mb-1.5">
              {Array.from({ length: review.rating || 5 }).map((_, s) => (
                <Star key={s} className="h-3 w-3 text-warning-amber fill-warning-amber" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              "{review.comment}"
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              — {review.display_name}
              {review.pet_type && (
                <span className="text-muted-foreground/60"> · {review.pet_type} owner</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});
