import { memo, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Stethoscope, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

interface BlogStickyCtaBarProps {
  slug?: string;
}

export const BlogStickyCtaBar = memo(function BlogStickyCtaBar({ slug }: BlogStickyCtaBarProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { trackEvent } = useAnalyticsEvent();
  const hasTrackedImpression = useRef(false);

  useEffect(() => {
    if (dismissed) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollY / (docHeight - winHeight);

      if (scrollPercent > 0.5) {
        setVisible(true);
        if (!hasTrackedImpression.current) {
          hasTrackedImpression.current = true;
          trackEvent("blog_sticky_cta_impression", { slug });
        }
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [dismissed, slug, trackEvent]);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 animate-fade-in px-3">
      <div className="max-w-2xl mx-auto rounded-2xl bg-primary shadow-2xl border border-primary/20 px-4 py-3 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-2.5 min-w-0">
          <Stethoscope className="h-5 w-5 text-primary-foreground shrink-0" />
          <p className="text-sm font-semibold text-primary-foreground truncate">
            Worried? Check your pet's symptoms free
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="secondary"
          className="shrink-0 rounded-xl text-xs font-bold"
          onClick={() => trackEvent("blog_sticky_cta_click", { slug })}
        >
          <Link to="/triage">Start Check</Link>
        </Button>
        <button
          onClick={() => {
            setDismissed(true);
            trackEvent("blog_sticky_cta_dismiss", { slug });
          }}
          className="p-1 rounded-full hover:bg-primary-foreground/10 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-primary-foreground/70" />
        </button>
      </div>
    </div>
  );
});
