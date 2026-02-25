import { memo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Eye, Lock } from "lucide-react";
import type { TriageStatus } from "@/hooks/useDiagnosticEngine";
import { cn } from "@/lib/utils";

interface BlurredReportPreviewProps {
  reportStatus?: TriageStatus;
  reportTitle?: string;
  petName?: string;
  previewData?: {
    diagnosesCount: number;
    hasEmergency: boolean;
  };
}

const statusConfig: Record<TriageStatus, {
  icon: typeof AlertCircle;
  bgClass: string;
  textClass: string;
}> = {
  RED: { icon: AlertCircle, bgClass: "bg-emergency-red/10", textClass: "text-emergency-red" },
  YELLOW: { icon: AlertTriangle, bgClass: "bg-warning-amber/10", textClass: "text-warning-amber" },
  GREEN: { icon: CheckCircle2, bgClass: "bg-safe-green/10", textClass: "text-safe-green" },
};

export const BlurredReportPreview = memo(function BlurredReportPreview({
  reportStatus = "YELLOW",
  reportTitle,
  petName,
  previewData,
}: BlurredReportPreviewProps) {
  const config = statusConfig[reportStatus];
  const Icon = config.icon;

  return (
    <div className="relative rounded-2xl border border-border overflow-hidden">
      {/* Visible header peek */}
      <div className={cn("p-4 flex items-center gap-3", config.bgClass)}>
        <div className="p-2 rounded-xl bg-background/80">
          <Icon className={cn("h-5 w-5", config.textClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-xs font-bold uppercase", config.textClass)}>
            {reportStatus} Priority
          </p>
          <p className="text-sm font-semibold text-foreground truncate">
            {reportTitle || `${petName || "Patient"} — Assessment complete`}
          </p>
        </div>
      </div>

      {/* Blurred content preview */}
      <div className="relative p-4 space-y-3">
        <div className="blur-[6px] select-none pointer-events-none space-y-3" aria-hidden>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Differential Possibilities</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emergency-red" />
                <span className="text-sm text-foreground">Gastric Dilatation Volvulus (Bloat)</span>
                <span className="text-xs text-emergency-red ml-auto">High Probability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-warning-amber" />
                <span className="text-sm text-foreground">Acute Pancreatitis</span>
                <span className="text-xs text-warning-amber ml-auto">Moderate</span>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Clinical Reasoning</p>
            <p className="text-sm text-muted-foreground">
              Based on the reported symptoms of abdominal distension and restlessness, combined with the breed predisposition...
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Vet Discussion Points</p>
            <p className="text-sm text-muted-foreground">
              Mention the timeline of symptom onset, any dietary changes in the last 48 hours...
            </p>
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent flex flex-col items-center justify-end pb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Eye className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary">
              {previewData?.diagnosesCount 
                ? `${previewData.diagnosesCount} differential possibilities identified` 
                : "Structured analysis complete — access to view"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
