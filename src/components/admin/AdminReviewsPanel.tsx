import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Star, Trash2, Bell, Eye, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface AdminReviewsPanelProps {
  isReadOnly?: boolean;
}

export function AdminReviewsPanel({ isReadOnly = false }: AdminReviewsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [lastSeenCount, setLastSeenCount] = useState<number>(() => {
    return parseInt(localStorage.getItem("admin_reviews_seen_count") || "0", 10);
  });

  // Fetch all reviews (admin can see all via RLS)
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-reviews", filter],
    queryFn: async () => {
      let query = supabase
        .from("customer_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === "approved") query = query.eq("is_approved", true);
      if (filter === "pending") query = query.eq("is_approved", false);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Count new reviews since last seen
  const newReviewCount = Math.max(0, reviews.length - lastSeenCount);

  // Mark as seen when panel is viewed
  useEffect(() => {
    if (reviews.length > 0) {
      localStorage.setItem("admin_reviews_seen_count", String(reviews.length));
      setLastSeenCount(reviews.length);
    }
  }, [reviews.length]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase
        .from("customer_reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review Deleted", description: "The review has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete review.", variant: "destructive" });
    },
  });

  // Toggle approval mutation
  const toggleApprovalMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("customer_reviews")
        .update({ is_approved: approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({ title: "Review Updated" });
    },
  });

  // Realtime subscription for new reviews
  useEffect(() => {
    const channel = supabase
      .channel("admin-reviews-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_reviews" },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
          toast({
            title: "🔔 New Review Submitted!",
            description: `${(payload.new as any).display_name} left a ${(payload.new as any).rating}-star review.`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, toast]);

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn("h-3.5 w-3.5", s <= rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600")}
        />
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Customer Reviews</h2>
          {newReviewCount > 0 && (
            <Badge className="bg-red-500 text-white animate-pulse">
              <Bell className="h-3 w-3 mr-1" />
              {newReviewCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-[140px] bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({reviews.length})</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]">
          <p className="text-xs text-slate-400">Total</p>
          <p className="text-lg font-bold text-white">{reviews.length}</p>
        </div>
        <div className="p-3 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]">
          <p className="text-xs text-slate-400">Avg Rating</p>
          <p className="text-lg font-bold text-white">
            {reviews.length > 0
              ? (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)
              : "—"}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]">
          <p className="text-xs text-slate-400">Pending</p>
          <p className="text-lg font-bold text-amber-400">
            {reviews.filter((r) => !r.is_approved).length}
          </p>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
        {reviews.length === 0 ? (
          <div className="text-center py-12 text-slate-400">No reviews found.</div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className={cn(
                "p-4 rounded-xl border transition-colors",
                review.is_approved
                  ? "bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]"
                  : "bg-amber-500/5 border-amber-500/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{review.display_name}</span>
                    {review.pet_type && (
                      <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                        {review.pet_type}
                      </Badge>
                    )}
                    {!review.is_approved && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">Pending</Badge>
                    )}
                  </div>
                  {renderStars(review.rating)}
                  <p className="text-sm text-slate-300 mt-2 line-clamp-3">{review.comment}</p>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    {new Date(review.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {!isReadOnly && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-white"
                      onClick={() =>
                        toggleApprovalMutation.mutate({
                          id: review.id,
                          approved: !review.is_approved,
                        })
                      }
                      title={review.is_approved ? "Hide review" : "Approve review"}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                      onClick={() => deleteMutation.mutate(review.id)}
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
