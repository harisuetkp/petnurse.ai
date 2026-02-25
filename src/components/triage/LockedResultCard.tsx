import { memo, useCallback, useState, forwardRef } from "react";
import { Lock, Sparkles, Shield, CheckCircle2, Zap, Clock, MessageCircle, History, Loader2, Star, Heart, DollarSign, RotateCcw } from "lucide-react";
import { ReviewsSocialProof } from "@/components/ReviewsSocialProof";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePurchases } from "@/hooks/usePurchases";
import type { TriageStatus } from "@/hooks/useDiagnosticEngine";
import { BlurredReportPreview } from "./BlurredReportPreview";
import { LiveActivityIndicator } from "./LiveActivityIndicator";
import { TrustCredibilityBadges } from "./TrustCredibilityBadges";
import { ExitIntentNudge } from "./ExitIntentNudge";

interface LockedResultCardProps {
  onUnlock: () => void;
  reportStatus?: TriageStatus;
  reportTitle?: string;
  previewData?: {
    diagnosesCount: number;
    hasEmergency: boolean;
  };
  petName?: string;
}

const features = [
  { icon: Zap, label: "Structured triage assessments" },
  { icon: Clock, label: "24/7 symptom analysis" },
  { icon: Shield, label: "Risk stratification guidance" },
  { icon: MessageCircle, label: "Vet discussion summaries" },
  { icon: History, label: "Longitudinal health records" },
];

const blurredSections = [
  "Differential Possibilities (3 identified)",
  "Risk Level Classification",
  "Immediate Care Indicators",
  "Home Monitoring Protocol",
  "Vet Discussion Points",
  "Health Timeline Records",
];

export const LockedResultCard = memo(forwardRef<HTMLDivElement, LockedResultCardProps>(function LockedResultCard({
  onUnlock,
  reportStatus,
  reportTitle,
  previewData,
  petName,
}, ref) {
  const { purchase, restore, isLoading, isNativeIAP } = usePurchases();

  return (
    <div ref={ref} className="animate-slide-up space-y-5">
      {/* Blurred Report Preview */}
      <BlurredReportPreview
        reportStatus={reportStatus}
        reportTitle={reportTitle}
        petName={petName}
        previewData={previewData}
      />

      {/* Blurred Premium Sections */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Clinical Sections — Access Required
        </p>
        {blurredSections.map((section, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <Lock className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-sm text-muted-foreground/70 blur-[2px] select-none pointer-events-none">
              {section}
            </span>
          </div>
        ))}
      </div>

      {/* Live Activity Indicator */}
      <LiveActivityIndicator />

      {/* Emotional Headline */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto">
          <Shield className="h-7 w-7 text-primary" />
        </div>
        <p className="text-[11px] text-primary font-semibold uppercase tracking-wider">
          Structured AI triage system
        </p>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">
          {petName ? `Complete Assessment for ${petName}` : "Access Complete Clinical Assessment"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Start with a <span className="font-semibold text-foreground">7-day free trial</span> on the annual plan. Full access to structured triage analysis.
        </p>
      </div>

      {/* Vet Cost Comparison */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h4 className="text-xs font-semibold text-center text-muted-foreground uppercase tracking-wide mb-3">
          Cost Comparison
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emergency-red/60" />
              <span className="text-sm text-muted-foreground">Average vet visit</span>
            </div>
            <span className="text-sm font-bold text-foreground">$120–$250</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-warning-amber/60" />
              <span className="text-sm text-muted-foreground">Emergency vet visit</span>
            </div>
            <span className="text-sm font-bold text-foreground">$500–$3,000</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-safe-green" />
              <span className="text-sm font-medium text-foreground">Full triage access</span>
            </div>
            <span className="text-sm font-bold text-primary">$3.99/month</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Structured clinical guidance for less than 13¢ per day.
        </p>
      </div>

      {/* Features */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
        {features.map((f, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
              <f.icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Trust Credibility Badges */}
      <TrustCredibilityBadges />

      {/* Pricing Cards */}
      <div className="space-y-3">
        {/* YEARLY — Best Value */}
        <div className="relative rounded-xl border-2 border-primary bg-primary/[0.03] p-5 shadow-md">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground px-3.5 py-1 text-[11px] font-bold rounded-full tracking-wide shadow-lg whitespace-nowrap">
              BEST VALUE — SAVE 60%
            </span>
          </div>

          <div className="mt-2 text-center">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-4xl font-extrabold text-foreground tracking-tight">$47.95</span>
              <span className="text-muted-foreground text-sm font-medium">/ year</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Only <span className="font-semibold text-foreground">$3.99/month</span> billed annually
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="line-through">$119.88</span>
            </p>
            <div className="inline-flex items-center gap-1.5 mt-2 bg-safe-green/10 border border-safe-green/20 rounded-lg px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-safe-green" />
              <span className="text-xs font-semibold text-safe-green">
                You save $71.93
              </span>
            </div>
            <p className="text-sm font-semibold text-primary mt-3">
              Start FREE — 7 days free trial
            </p>
          </div>

          <Button
            onClick={() => purchase("yearly")}
            disabled={isLoading !== null}
            size="lg"
            className="w-full h-13 mt-4 text-base font-bold rounded-xl"
          >
            {isLoading === "yearly" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              "Start 7-Day Free Trial"
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* MONTHLY */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl font-bold text-foreground">$9.99</span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Billed monthly • No trial</p>
          </div>

          <Button
            onClick={() => purchase("monthly")}
            disabled={isLoading !== null}
            variant="outline"
            className="w-full h-11 mt-4 text-sm font-semibold rounded-xl border-2"
          >
            {isLoading === "monthly" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              "Continue Monthly"
            )}
          </Button>
        </div>

        {/* One-time unlock */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Just this report</p>
              <p className="text-xs text-muted-foreground">One-time unlock — $5.99</p>
            </div>
            <Button
              onClick={() => purchase("oneTime")}
              disabled={isLoading !== null}
              variant="ghost"
              size="sm"
              className="text-xs font-semibold text-primary"
            >
              {isLoading === "oneTime" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Unlock — $5.99"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Restore Purchases (native only) */}
      {isNativeIAP && (
        <Button
          onClick={restore}
          disabled={isLoading !== null}
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restore Purchases
        </Button>
      )}

      {/* Reassurance */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Cancel anytime
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          No hidden fees
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3.5 w-3.5" />
          Secure payments
        </span>
      </div>

      {/* Real Customer Reviews Social Proof */}
      <ReviewsSocialProof maxReviews={3} />

      {/* Disclaimer */}
      <div className="bg-muted/50 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong>NOT A DIAGNOSIS.</strong> This is a priority assessment.
          If your pet is in distress, go to a vet immediately regardless of this result.
        </p>
      </div>

      {/* Legal Footer */}
      <div className="pt-4 border-t border-border">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <button className="hover:underline" onClick={() => window.open("/terms-of-service", "_blank")}>
              Terms of Service
            </button>
            <span>·</span>
            <button className="hover:underline" onClick={() => window.open("/privacy-policy", "_blank")}>
              Privacy Policy
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2025 PetNurse AI LLC. Structured triage guidance system.
          </p>
        </div>
      </div>

      {/* Exit-Intent Nudge */}
      <ExitIntentNudge petName={petName} onUnlock={() => purchase("oneTime")} />
    </div>
  );
}));
