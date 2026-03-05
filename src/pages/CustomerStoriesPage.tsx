import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Star, Send, MessageSquare, Shield, BookOpen } from "lucide-react";
import { staticReviews, type StaticReview } from "@/data/customerReviews";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const StarRating = ({ rating, interactive, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        disabled={!interactive}
        onClick={() => onRate?.(star)}
        className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"}
      >
        <Star
          className={`h-4 w-4 ${star <= rating ? "text-warning-amber fill-warning-amber" : "text-muted-foreground/30"}`}
        />
      </button>
    ))}
  </div>
);

const ReviewCard = ({ review }: { review: StaticReview | { id: string; displayName: string; rating: number; comment: string; petType: string; timeAgo: string } }) => (
  <div className="apple-card p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
          {review.displayName.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{review.displayName}</p>
          <p className="text-xs text-muted-foreground">{review.petType} parent • {review.timeAgo}</p>
        </div>
      </div>
      <StarRating rating={review.rating} />
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">"{review.comment}"</p>
  </div>
);

export default function CustomerStoriesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [rating, setRating] = useState(5);
  const [petType, setPetType] = useState("Dog");

  // Check session
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
  });

  // Fetch user-submitted reviews
  const { data: userReviews = [] } = useQuery({
    queryKey: ["customer-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_reviews_public")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        displayName: r.display_name,
        rating: r.rating,
        comment: r.comment,
        petType: r.pet_type || "Pet",
        timeAgo: getTimeAgo(new Date(r.created_at)),
      }));
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Please sign in to leave a review.");
      if (!name.trim() || !comment.trim()) throw new Error("Please fill in all fields.");
      if (comment.trim().length < 10) throw new Error("Comment must be at least 10 characters.");
      if (name.trim().length > 50) throw new Error("Name must be less than 50 characters.");
      if (comment.trim().length > 1000) throw new Error("Comment must be less than 1000 characters.");

      const { error } = await supabase.from("customer_reviews").insert({
        user_id: session.user.id,
        display_name: name.trim(),
        rating,
        comment: comment.trim(),
        pet_type: petType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Thank you! 🎉", description: "Your review has been submitted." });
      setName("");
      setComment("");
      setRating(5);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["customer-reviews"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const allReviews = [...userReviews, ...staticReviews];
  const avgRating = (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-5 pb-3 header-pt flex items-center gap-3 max-w-2xl mx-auto">
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Customer Stories</h1>
            <p className="text-xs text-muted-foreground">{allReviews.length} reviews • {avgRating} avg rating</p>
          </div>
        </div>
      </header>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">
        {/* Stats banner */}
        <div className="apple-card p-5 bg-gradient-to-br from-primary/5 to-accent/50 border border-primary/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-3xl font-bold text-foreground">{avgRating}</p>
              <StarRating rating={Math.round(Number(avgRating))} />
              <p className="text-xs text-muted-foreground mt-1">Based on {allReviews.length} reviews</p>
            </div>
            <div className="text-right space-y-1">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = allReviews.filter((r) => r.rating === star).length;
                const pct = Math.round((count / allReviews.length) * 100);
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-3">{star}</span>
                    <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted-foreground w-7 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Trust badges */}
          <div className="flex gap-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Verified Pet Parents</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Real Experiences</span>
            </div>
          </div>
        </div>

        {/* Write review CTA */}
        <Button
          onClick={() => setShowForm(!showForm)}
          variant={showForm ? "outline" : "default"}
          className="w-full rounded-2xl h-12 font-semibold"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {showForm ? "Cancel" : "Leave a Review & Rate Us"}
        </Button>

        {/* Review form */}
        {showForm && (
          <div className="apple-card p-5 space-y-4 animate-slide-up">
            {!session ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">Sign in to leave a review</p>
                <Link to="/auth">
                  <Button className="rounded-full">Sign In</Button>
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Your Rating</label>
                  <StarRating rating={rating} interactive onRate={setRating} />
                </div>
                <Input
                  placeholder="Your name (e.g. Sarah M.)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={50}
                  className="rounded-xl"
                />
                <Select value={petType} onValueChange={setPetType}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Dog", "Cat", "Bird", "Rabbit", "Hamster", "Other"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Share your experience with PetNurse AI..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  className="rounded-xl min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground text-right">{comment.length}/1000</p>
                <Button
                  onClick={() => submitReview.mutate()}
                  disabled={submitReview.isPending}
                  className="w-full rounded-2xl h-11 font-semibold"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitReview.isPending ? "Submitting..." : "Submit Review"}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Reviews list */}
        <div className="space-y-3">
          {allReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
