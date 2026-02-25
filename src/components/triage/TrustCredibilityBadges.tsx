import { memo } from "react";
import { Shield, Database, FlaskConical, BookOpen } from "lucide-react";

const sources = [
  {
    icon: BookOpen,
    label: "Veterinary Clinical Guidelines",
    detail: "Evidence-based triage protocols",
  },
  {
    icon: FlaskConical,
    label: "Toxicology Reference Data",
    detail: "Structured substance hazard analysis",
  },
  {
    icon: Database,
    label: "Symptom Pattern Database",
    detail: "Multi-factor cross-referencing",
  },
  {
    icon: Shield,
    label: "Structured Clinical Reasoning",
    detail: "Risk stratification engine",
  },
];

export const TrustCredibilityBadges = memo(function TrustCredibilityBadges() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="text-xs font-semibold text-center uppercase tracking-wide text-primary">
        Assessment Methodology
      </p>
      <div className="grid grid-cols-2 gap-2">
        {sources.map(({ icon: Icon, label, detail }, i) => (
          <div
            key={i}
            className="flex items-start gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/50"
          >
            <Icon className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-tight">{label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{detail}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">
        Assessments cross-reference structured veterinary data sources for evidence-informed guidance
      </p>
    </div>
  );
});
