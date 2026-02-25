import { memo, useCallback } from "react";
import { TriageShareButtons } from "@/components/triage/TriageShareButtons";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight, 
  Download, 
  RefreshCw,
  Clock,
  FileText,
  Phone,
  Stethoscope,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TriageReport as TriageReportType, TriageStatus, PotentialDiagnosis, MedicalGlossaryEntry } from "@/hooks/useDiagnosticEngine";

interface TriageReportProps {
  report: TriageReportType;
  onReset: () => void;
}

const statusConfig: Record<TriageStatus, {
  icon: typeof AlertCircle;
  label: string;
  subtitle: string;
  headerClass: string;
  iconClass: string;
  badgeClass: string;
}> = {
  RED: {
    icon: AlertCircle,
    label: "RED",
    subtitle: "Immediate Action Required",
    headerClass: "bg-gradient-to-br from-emergency-red to-emergency-red/80 text-white",
    iconClass: "text-white",
    badgeClass: "bg-white/20 text-white",
  },
  YELLOW: {
    icon: AlertTriangle,
    label: "YELLOW",
    subtitle: "Veterinary Attention Advised",
    headerClass: "bg-gradient-to-br from-warning-amber to-warning-amber/80 text-warning-amber-foreground",
    iconClass: "text-warning-amber-foreground",
    badgeClass: "bg-black/10 text-warning-amber-foreground",
  },
  GREEN: {
    icon: CheckCircle2,
    label: "GREEN",
    subtitle: "Monitor at Home",
    headerClass: "bg-gradient-to-br from-safe-green to-safe-green/80 text-white",
    iconClass: "text-white",
    badgeClass: "bg-white/20 text-white",
  },
};

const likelihoodConfig = {
  "Highly Likely": { icon: TrendingUp, className: "text-emergency-red bg-emergency-red/10" },
  "Possible": { icon: Minus, className: "text-warning-amber bg-warning-amber/10" },
  "Less Likely": { icon: TrendingDown, className: "text-muted-foreground bg-muted" },
};

export const TriageReport = memo(function TriageReport({ report, onReset }: TriageReportProps) {
  const config = statusConfig[report.status];
  const Icon = config.icon;

  const handleDownload = useCallback(() => {
    const diagnosesText = report.potentialDiagnoses?.length > 0
      ? `
DIFFERENTIAL POSSIBILITIES
--------------------------
${report.potentialDiagnoses.map((d, i) => `
${i + 1}. ${d.condition} (${d.commonName})
   Probability: ${d.likelihood}
   Reasoning: ${d.reasoning}
   ${d.urgency ? `Urgency: ${d.urgency}` : ''}
`).join("\n")}`
      : "";

    const vetTipsText = report.vetCommunicationTips?.length > 0
      ? `
VET DISCUSSION POINTS
---------------------
${report.vetCommunicationTips.map(t => `• ${t}`).join("\n")}`
      : "";

    const glossaryText = report.medicalGlossary?.length > 0
      ? `
MEDICAL TERMS EXPLAINED
-----------------------
${report.medicalGlossary.map(g => `• ${g.term}: ${g.definition}`).join("\n")}`
      : "";

    const content = `
PETNURSE AI — STRUCTURED TRIAGE ASSESSMENT
==========================
Report ID: ${report.id}
Generated: ${report.generatedAt.toLocaleString()}
${report.petName ? `Patient: ${report.petName} (${report.petSpecies})` : ""}

PRIORITY: ${config.label} - ${report.title}
${config.subtitle}
${diagnosesText}

PRESENTING SYMPTOMS SUMMARY
---------------------------
${report.clinicalSummary.map(s => `• ${s}`).join("\n")}

MONITORING RECOMMENDATIONS
--------------------------
${report.recommendedActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}

WHEN TO SEEK IMMEDIATE CARE
----------------------------
${report.warningSignsToWatch.map(w => `• ${w}`).join("\n")}
${vetTipsText}
${glossaryText}

${report.knowledgeBaseReferences && report.knowledgeBaseReferences.length > 0 ? `
CLINICAL REFERENCES
-------------------
${report.knowledgeBaseReferences.map(r => `• ${r}`).join("\n")}
Source: Veterinary Clinical Sciences, Purdue University & VCA Emergency Medicine
` : ""}

==========================
DISCLAIMER: This is a structured priority assessment identifying possible
conditions for discussion with your veterinarian. Not a medical diagnosis.
If your pet is in distress, seek emergency veterinary care immediately
regardless of this result.
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `petnurse-report-${report.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [report, config]);

  const handleFindEmergencyVet = useCallback(() => {
    if (!navigator.geolocation) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const searchQuery = encodeURIComponent("Emergency Veterinarian");
      const mapsUrl = isIOS
        ? `maps://maps.apple.com/?q=${searchQuery}`
        : `https://www.google.com/maps/search/${searchQuery}`;
      window.open(mapsUrl, "_blank");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const searchQuery = encodeURIComponent("Emergency Veterinarian");
        const mapsUrl = isIOS
          ? `maps://maps.apple.com/?q=${searchQuery}&sll=${latitude},${longitude}`
          : `https://www.google.com/maps/search/${searchQuery}/@${latitude},${longitude},14z`;
        window.open(mapsUrl, "_blank");
      },
      () => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const searchQuery = encodeURIComponent("Emergency Veterinarian");
        const mapsUrl = isIOS
          ? `maps://maps.apple.com/?q=${searchQuery}`
          : `https://www.google.com/maps/search/${searchQuery}`;
        window.open(mapsUrl, "_blank");
      },
      { timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const renderDiagnosis = (diagnosis: PotentialDiagnosis, index: number) => {
    const likelihoodInfo = likelihoodConfig[diagnosis.likelihood] || likelihoodConfig["Possible"];
    const LikelihoodIcon = likelihoodInfo.icon;
    
    return (
      <div 
        key={index} 
        className={cn(
          "rounded-xl border p-4 space-y-2",
          index === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-card"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h4 className="font-semibold text-foreground">{diagnosis.condition}</h4>
            <p className="text-sm text-muted-foreground">{diagnosis.commonName}</p>
          </div>
          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", likelihoodInfo.className)}>
            <LikelihoodIcon className="h-3 w-3" />
            <span>{diagnosis.likelihood}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{diagnosis.reasoning}</p>
        {diagnosis.urgency && (
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-primary" />
            {diagnosis.urgency}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="animate-slide-up space-y-4">
      {/* Header with status */}
      <div className={cn("rounded-2xl p-6", config.headerClass)}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-white/20">
            <Icon className={cn("h-8 w-8", config.iconClass)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-bold", config.badgeClass)}>
                {config.label}
              </span>
            </div>
            <h2 className="text-xl font-bold">{report.title}</h2>
            <p className="text-sm opacity-90 mt-1">{config.subtitle}</p>
          </div>
        </div>
        
        {/* Report metadata */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/20 text-sm opacity-75">
          <div className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span>{report.id}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{report.generatedAt.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Emergency Vet Button - Only show for RED status */}
      {report.status === "RED" && (
        <Button
          variant="destructive"
          size="lg"
          onClick={handleFindEmergencyVet}
          className="w-full h-14 text-base font-semibold active:scale-[0.98]"
        >
          <Phone className="h-5 w-5 mr-2" />
          Find Nearest Emergency Vet
        </Button>
      )}

      {/* Potential Diagnoses - MOST IMPORTANT SECTION */}
      {report.potentialDiagnoses && report.potentialDiagnoses.length > 0 && (
        <div className="apple-card p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-primary" />
            Differential Possibilities
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Based on symptom pattern analysis, the following conditions should be considered. These are possibilities to discuss with your veterinarian — not confirmed diagnoses.
          </p>
          <div className="space-y-3">
            {report.potentialDiagnoses.map((diagnosis, index) => renderDiagnosis(diagnosis, index))}
          </div>
        </div>
      )}

      {/* Clinical Summary */}
      <div className="apple-card p-5">
        <h3 className="font-semibold text-foreground mb-3">Presenting Symptoms Summary</h3>
        <ul className="space-y-2">
          {report.clinicalSummary.map((item, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Recommended Actions */}
      <div className="apple-card p-5">
        <h3 className="font-semibold text-foreground mb-3">Monitoring Recommendations</h3>
        <ul className="space-y-3">
          {report.recommendedActions.map((action, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm text-foreground">{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* What to Tell Your Vet */}
      {report.vetCommunicationTips && report.vetCommunicationTips.length > 0 && (
        <div className="apple-card p-5 bg-primary/5 border border-primary/20">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            Suggested Vet Discussion Points
          </h3>
          <ul className="space-y-2">
            {report.vetCommunicationTips.map((tip, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">→</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warning Signs */}
      <div className="apple-card p-5 bg-warning-amber-bg border border-warning-amber/20">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning-amber" />
            When to Seek Immediate Care
          </h3>
        <ul className="space-y-2">
          {report.warningSignsToWatch.map((warning, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="text-warning-amber">⚠</span>
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Medical Terms Glossary */}
      {report.medicalGlossary && report.medicalGlossary.length > 0 && (
        <div className="apple-card p-5 bg-primary/5 border border-primary/20">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Medical Terms Explained
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Tap any term below to understand what it means in simple words.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {report.medicalGlossary.map((entry, index) => (
              <div 
                key={index} 
                className="bg-background rounded-lg p-3 border border-border"
              >
                <dt className="text-sm font-semibold text-primary capitalize">
                  {entry.term}
                </dt>
                <dd className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {entry.definition}
                </dd>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Base References */}
      {report.knowledgeBaseReferences && report.knowledgeBaseReferences.length > 0 && (
        <div className="apple-card p-5 bg-muted/30 border border-border/50">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Clinical Reference Information
          </h3>
          <ul className="space-y-2">
            {report.knowledgeBaseReferences.map((reference, index) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{reference}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Source: Veterinary Clinical Sciences, Purdue University & VCA Emergency Medicine
          </p>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-muted/50 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>NOT A DIAGNOSIS.</strong> This is a structured priority assessment identifying possible conditions for discussion with your veterinarian. 
          If your pet is in distress, seek emergency veterinary care immediately regardless of this result.
        </p>
      </div>

      {/* Share with fellow pet owners */}
      <TriageShareButtons reportStatus={report.status} petName={report.petName} />

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onReset}
          className="flex-1 h-12 rounded-2xl"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          New Assessment
        </Button>
        <Button
          onClick={handleDownload}
          className="flex-1 h-12 rounded-2xl"
        >
          <Download className="h-4 w-4 mr-2" />
          Download for Vet
        </Button>
      </div>
    </div>
  );
});
