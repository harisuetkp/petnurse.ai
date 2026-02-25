import { memo, useState, useEffect, useRef } from "react";
import { FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExitIntentNudgeProps {
  petName?: string;
  onUnlock: () => void;
}

export const ExitIntentNudge = memo(function ExitIntentNudge({ petName, onUnlock }: ExitIntentNudgeProps) {
  const [visible, setVisible] = useState(false);
  const dismissed = useRef(false);
  const triggered = useRef(false);

  useEffect(() => {
    if (dismissed.current) return;

    const handleScroll = () => {
      if (triggered.current || dismissed.current) return;
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const winHeight = window.innerHeight;
      const scrollPercent = scrollY / (docHeight - winHeight);

      if (scrollPercent < 0.3 && sessionStorage.getItem("pn_scroll_deep") === "1") {
        triggered.current = true;
        setVisible(true);
      }
      if (scrollPercent > 0.7) {
        sessionStorage.setItem("pn_scroll_deep", "1");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDismiss = () => {
    dismissed.current = true;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-fade-in max-w-md mx-auto">
      <div className="relative rounded-2xl bg-card border border-border shadow-2xl p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 shrink-0">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 pr-4">
            <p className="text-sm font-semibold text-foreground">
              Assessment complete for {petName || "your pet"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your structured triage analysis is ready for review.
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => {
            handleDismiss();
            onUnlock();
          }}
          size="sm"
          className="w-full mt-3 rounded-xl text-sm font-semibold"
        >
          Access Full Report — $5.99
        </Button>
      </div>
    </div>
  );
});
