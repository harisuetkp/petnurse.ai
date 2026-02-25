import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISSED_KEY = "pn_dismissed_blog_";

export function NewBlogNotification() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string | null>(null);

  const { data: latestPost } = useQuery({
    queryKey: ["latest-blog-notification"],
    queryFn: async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, category, published_at, excerpt")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    staleTime: 60000,
    refetchInterval: 5 * 60 * 1000, // re-check every 5 min
  });

  useEffect(() => {
    if (latestPost) {
      const key = DISMISSED_KEY + latestPost.id;
      if (localStorage.getItem(key)) {
        setDismissed(latestPost.id);
      }
    }
  }, [latestPost]);

  if (!latestPost) return null;

  // Only show for posts published in the last 3 days
  const publishedAt = new Date(latestPost.published_at || "");
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  if (publishedAt < threeDaysAgo) return null;

  if (dismissed === latestPost.id) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem(DISMISSED_KEY + latestPost.id, "true");
    setDismissed(latestPost.id);
  };

  const handleClick = () => {
    navigate(`/blog/${latestPost.slug}`);
    localStorage.setItem(DISMISSED_KEY + latestPost.id, "true");
    setDismissed(latestPost.id);
  };

  const categoryColors: Record<string, string> = {
    Emergency: "bg-red-500/15 text-red-600",
    Wellness: "bg-emerald-500/15 text-emerald-600",
    Nutrition: "bg-amber-500/15 text-amber-600",
    Behavior: "bg-violet-500/15 text-violet-600",
  };

  const badgeClass = categoryColors[latestPost.category] || "bg-primary/10 text-primary";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed top-[calc(env(safe-area-inset-top,0px)+0.75rem)] left-3 right-3 z-[60] cursor-pointer"
        onClick={handleClick}
      >
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-background to-accent/10 shadow-lg shadow-primary/10 backdrop-blur-xl">
          {/* Shimmer accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

          <div className="flex items-start gap-3 p-3.5 pr-10">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5 rounded-xl bg-primary/10 p-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                  New Article
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badgeClass}`}>
                  {latestPost.category}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
                {latestPost.title}
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
                Read now
                <ArrowRight className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground/60 hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
