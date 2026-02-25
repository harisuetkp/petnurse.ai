import { memo, useState, useEffect, useRef } from "react";
import { Stethoscope, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

interface BlogExitIntentNudgeProps {
  slug?: string;
}

export const BlogExitIntentNudge = memo(function BlogExitIntentNudge({ slug }: BlogExitIntentNudgeProps) {
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const triggered = useRef(false);
  const { trackEvent } = useAnalyticsEvent();

  useEffect(() => {
    if (dismissed.current) return;

    // Desktop: mouse leaves viewport (top)
    const handleMouseLeave = (e: MouseEvent) => {
      if (triggered.current || dismissed.current) return;
      if (e.clientY <= 5) {
        triggered.current = true;
        setVisible(true);
        trackEvent("blog_exit_intent_shown", { slug, trigger: "mouse_leave" });
      }
    };

    // Mobile: scroll back up after reading (same pattern as ExitIntentNudge)
    const handleScroll = () => {
      if (triggered.current || dismissed.current) return;
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollY / (docHeight - winHeight);

      if (scrollPercent < 0.3 && sessionStorage.getItem("pn_blog_deep") === "1") {
        triggered.current = true;
        setVisible(true);
        trackEvent("blog_exit_intent_shown", { slug, trigger: "scroll_back" });
      }
      if (scrollPercent > 0.7) {
        sessionStorage.setItem("pn_blog_deep", "1");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [slug, trackEvent]);

  const handleDismiss = () => {
    dismissed.current = true;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl p-6 z-10">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto">
            <Stethoscope className="h-7 w-7 text-primary" />
          </div>

          <h3 className="text-lg font-bold text-foreground">
            Before you go…
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Concerned about something you read? Get a <span className="font-semibold text-foreground">free AI symptom check</span> for your pet in under 2 minutes.
          </p>

          <Button
            asChild
            className="w-full h-12 rounded-xl text-base font-semibold mt-2"
            onClick={() => {
              handleDismiss();
              trackEvent("blog_exit_intent_click", { slug });
            }}
          >
            <Link to="/triage">
              Start Free Symptom Check
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>

          <p className="text-xs text-muted-foreground">
            No account required · 24/7 · Evidence-based
          </p>
        </div>
      </div>
    </div>
  );
});
