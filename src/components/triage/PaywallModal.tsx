import { useState, useCallback } from "react";
import {
  CheckCircle2,
  Shield,
  Clock,
  MessageCircle,
  Zap,
  History,
  Sparkles,
  Loader2,
  TrendingUp,
  RotateCcw,
  Star,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { usePurchases } from "@/hooks/usePurchases";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubscribe: () => void;
  onOneTimePurchase?: () => void;
  triggerContext?: string;
}

const features = [
  { icon: Zap, label: "Unlimited symptom checks" },
  { icon: TrendingUp, label: "Health trend reports" },
  { icon: Clock, label: "24/7 — nights & weekends" },
  { icon: Shield, label: "Food & toxin safety checks" },
  { icon: MessageCircle, label: "Vet-ready report summaries" },
  { icon: History, label: "Multi-pet health records" },
];

export function PaywallModal({ open, onOpenChange, triggerContext }: PaywallModalProps) {
  const { purchase, restore, isLoading, isNativeIAP } = usePurchases();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg mx-4 rounded-2xl p-0 overflow-hidden border border-border bg-background max-h-[92vh] overflow-y-auto [&>button]:text-muted-foreground" aria-label="Upgrade to Premium">
        <div className="px-6 pt-8 pb-2">
          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Structured AI Triage System</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center tracking-tight leading-tight">
            See What's Going On With Your Pet
          </h2>
          {triggerContext && (
            <p className="text-sm text-foreground/80 text-center mt-2 font-medium bg-primary/5 rounded-lg py-2 px-3">
              {triggerContext}
            </p>
          )}
          <p className="text-sm text-muted-foreground text-center mt-3">
            Your pet's symptoms have been analyzed. Unlock the full report to see possible causes, severity, and what to do next.
          </p>
          {/* Authority markers */}
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">4.9 rating</span>
            <span>·</span>
            <span>5,000+ assessments</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Evidence-informed</span>
          </div>
        </div>

        {/* Vet Cost Comparison */}
        <div className="px-6 py-3">
          <div className="rounded-xl bg-muted/40 border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">
              Cost Comparison
            </p>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emergency-red/60" />
                <span className="text-muted-foreground">Avg vet visit</span>
              </div>
              <span className="font-bold text-foreground">$120–$250</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-safe-green" />
                <span className="text-muted-foreground">Full triage access</span>
              </div>
              <span className="font-bold text-primary">$3.99/mo</span>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Structured clinical guidance for less than 13¢/day.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 py-3">
          <div className="grid grid-cols-2 gap-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                  <f.icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-medium text-foreground">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="px-6 pb-2 space-y-3">
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
        </div>

        {/* One-time unlock */}
        <div className="px-6 pb-2">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Just this assessment</p>
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
        {/* Testimonial */}
        <div className="px-6 pb-3">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <div className="flex items-center justify-center gap-0.5 mb-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="h-3 w-3 fill-warning-amber text-warning-amber" />)}
            </div>
            <p className="text-xs text-foreground">"My dog was acting off — the report showed early warning signs I'd have missed. My vet said it was caught just in time."</p>
            <p className="text-[10px] text-muted-foreground mt-1">— Jessica R., verified user</p>
          </div>
        </div>

        {/* Restore Purchases (native only) */}
        {isNativeIAP && (
          <div className="px-6 pb-1">
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
          </div>
        )}

        {/* Reassurance */}
        <div className="px-6 pb-3">
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
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
        </div>

        {/* Disclaimer */}
        <div className="px-6 pb-2">
          <p className="text-[10px] text-muted-foreground text-center">
            Structured triage guidance. Not a replacement for veterinary care.
          </p>
        </div>

        {/* Legal Footer */}
        <div className="px-6 pb-5 flex items-center justify-center gap-3 text-[11px] text-muted-foreground">
          <button className="hover:underline" onClick={() => window.open("/terms-of-service", "_blank")}>
            Terms of Service
          </button>
          <span>·</span>
          <button className="hover:underline" onClick={() => window.open("/privacy-policy", "_blank")}>
            Privacy Policy
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
