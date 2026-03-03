import { useState } from "react";
import { HelpCircle, UtensilsCrossed, Bug, Wind, Droplets, EyeOff, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "react-router-dom";

const checks = [
  { id: "not-eating", icon: UtensilsCrossed, label: "Not Eating", color: "bg-[hsl(var(--warning-amber))]/10 text-[hsl(var(--warning-amber))]" },
  { id: "itchy-skin", icon: Bug, label: "Itchy Skin", color: "bg-primary/10 text-primary" },
  { id: "coughing", icon: Wind, label: "Coughing", color: "bg-[hsl(var(--primary-accent))]/10 text-[hsl(var(--primary-accent))]" },
  { id: "odd-stool", icon: Droplets, label: "Odd Stool", color: "bg-[hsl(var(--warning-amber))]/10 text-[hsl(var(--warning-amber))]" },
  { id: "hiding", icon: EyeOff, label: "Hiding", color: "bg-muted text-muted-foreground" },
];

const quickAdvice: Record<string, { severity: string; monitor: string; home: string[]; redFlags: string[] }> = {
  "not-eating": {
    severity: "Mild to Moderate",
    monitor: "If less than 24 hours and pet is otherwise active, monitor at home.",
    home: ["Offer bland food (boiled chicken + rice)", "Ensure fresh water", "Check for mouth pain or broken teeth"],
    redFlags: ["Not eating for 24+ hours", "Vomiting or diarrhea", "Lethargy or weakness"],
  },
  "itchy-skin": {
    severity: "Mild",
    monitor: "Most itching is manageable at home unless persistent or severe.",
    home: ["Check for fleas or ticks", "Rinse with lukewarm water", "Avoid harsh soaps"],
    redFlags: ["Skin is raw or bleeding", "Hair loss in patches", "Swelling or hives"],
  },
  "coughing": {
    severity: "Mild to Moderate",
    monitor: "Occasional coughing may be normal. Persistent cough needs a vet.",
    home: ["Keep environment dust-free", "Avoid smoke or strong scents", "Monitor frequency"],
    redFlags: ["Coughing blood", "Difficulty breathing", "Blue gums"],
  },
  "odd-stool": {
    severity: "Mild",
    monitor: "One episode usually isn't concerning. Watch for patterns.",
    home: ["Fast for 12 hours, then bland diet", "Keep pet hydrated", "Monitor for worms or blood"],
    redFlags: ["Blood in stool", "Black tarry stool", "Diarrhea lasting 24+ hours"],
  },
  "hiding": {
    severity: "Mild (may indicate pain)",
    monitor: "Cats especially may hide when stressed or unwell.",
    home: ["Provide a quiet, safe space", "Check for injuries", "Offer favorite treats"],
    redFlags: ["Not eating or drinking", "Hiding for 24+ hours", "Crying or whimpering"],
  },
};

export function QuickChecksCarousel({ isPremium = false }: { isPremium?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { trackEvent } = useAnalyticsEvent();

  const advice = selected ? quickAdvice[selected] : null;

  return (
    <div id="quickchecks">
      <h3 className="text-sm font-semibold text-foreground mb-3">Is This Normal?</h3>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {checks.map((check) => {
          const Icon = check.icon;
          return (
            <button
              key={check.id}
              onClick={() => {
                setSelected(check.id);
                trackEvent("quick_check_opened", { check: check.id });
              }}
              className="apple-card p-3 flex flex-col items-center gap-1.5 min-w-[80px] shrink-0 hover:shadow-md transition-all active:scale-[0.97]"
            >
              <div className={`w-9 h-9 rounded-lg ${check.color} flex items-center justify-center`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-[10px] font-medium text-foreground whitespace-nowrap">{check.label}</p>
            </button>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg">{checks.find((c) => c.id === selected)?.label}</SheetTitle>
          </SheetHeader>
          {advice && (
            <div className="mt-4 pb-8 space-y-4">
              <div className="rounded-xl bg-[hsl(var(--warning-amber-bg))] border border-[hsl(var(--warning-amber))]/30 p-3">
                <p className="text-xs font-semibold text-foreground">Severity: {advice.severity}</p>
                <p className="text-xs text-muted-foreground mt-1">{advice.monitor}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Home Care Steps:</p>
                <ul className="space-y-1.5">
                  {advice.home.map((step, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-[hsl(var(--safe-green))] font-bold">{i + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              {isPremium ? (
                <div>
                  <p className="text-xs font-semibold text-[hsl(var(--emergency-red))] mb-2">🚩 Red Flags — See a Vet:</p>
                  <ul className="space-y-1">
                    {advice.redFlags.map((flag, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {flag}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Red flags & detailed guidance</p>
                    <Link to="/premium" className="text-[10px] text-primary font-semibold">Upgrade to Pro →</Link>
                  </div>
                </div>
              )}

              <Link to="/triage?start=true">
                <Button className="w-full h-11 rounded-xl mt-2">Run Full Symptom Check</Button>
              </Link>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
