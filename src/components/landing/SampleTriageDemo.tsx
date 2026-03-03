import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const sampleResult = {
  symptom: "My dog has been vomiting and won't eat since this morning",
  urgency: "AMBER" as const,
  urgencyLabel: "Moderate — Monitor Closely",
  conditions: [
    "Dietary indiscretion (most common)",
    "Gastritis or stomach irritation",
    "Possible toxin ingestion",
  ],
  actions: [
    "Withhold food for 2–4 hours, offer small sips of water",
    "Monitor for additional symptoms (lethargy, diarrhea, blood)",
    "If vomiting persists beyond 12 hours → see vet",
  ],
};

const urgencyColors = {
  AMBER: {
    bg: "bg-warning-amber/10",
    border: "border-warning-amber/30",
    text: "text-warning-amber",
    icon: AlertTriangle,
  },
};

export function SampleTriageDemo() {
  const [revealed, setRevealed] = useState(false);
  const colors = urgencyColors.AMBER;
  const UrgencyIcon = colors.icon;

  return (
    <div className="apple-card overflow-hidden border border-border">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Sample Assessment
          </span>
        </div>
        <p className="text-sm text-foreground font-medium italic">
          "{sampleResult.symptom}"
        </p>
      </div>

      {/* Urgency Badge */}
      <div className="px-5 py-2">
        <div className={`inline-flex items-center gap-2 ${colors.bg} ${colors.border} border rounded-lg px-3 py-1.5`}>
          <UrgencyIcon className={`h-4 w-4 ${colors.text}`} />
          <span className={`text-xs font-bold ${colors.text}`}>{sampleResult.urgencyLabel}</span>
        </div>
      </div>

      {/* Blurred / Revealed Content */}
      <div className="px-5 pb-5 relative">
        {!revealed && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm rounded-b-xl">
            <Button
              onClick={() => setRevealed(true)}
              variant="outline"
              size="sm"
              className="rounded-xl gap-2"
            >
              <Eye className="h-4 w-4" />
              Preview full report
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1.5">Free preview — no sign-up needed</p>
          </div>
        )}

        <div className={`space-y-4 ${!revealed ? "blur-sm select-none" : "animate-in fade-in duration-500"}`}>
          {/* Possible Conditions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Possible Conditions</p>
            <ul className="space-y-1.5">
              {sampleResult.conditions.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground mt-0.5">{i + 1}.</span>
                  <span className="text-sm text-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended Actions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recommended Actions</p>
            <ul className="space-y-1.5">
              {sampleResult.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-safe-green mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {revealed && (
          <div className="mt-4 pt-3 border-t border-border">
            <Link to="/auth">
              <Button size="lg" className="w-full rounded-xl h-11 text-sm font-semibold gap-2">
                Get Your Pet's Assessment Free
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
            <p className="text-[10px] text-center text-muted-foreground mt-1.5">
              2 free assessments • No credit card required
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
