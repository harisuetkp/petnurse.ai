/**
 * Reusable upgrade prompt component shown at various trigger points.
 * Professional, calm clinical design — never aggressive.
 */

import { memo } from "react";
import { Shield, FileText, Heart, TrendingUp, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { UpgradeTrigger } from "@/hooks/useUpgradeTriggers";
import { useUpgradeTriggers } from "@/hooks/useUpgradeTriggers";

interface UpgradePromptProps {
  trigger: Exclude<UpgradeTrigger, null>;
  userId?: string;
  petName?: string;
  className?: string;
}

const triggerIcons: Record<Exclude<UpgradeTrigger, null>, typeof Shield> = {
  usage_limit: Lock,
  risk_detection: Shield,
  second_pet: Heart,
  timeline_access: TrendingUp,
  checkin_streak: FileText,
};

export const UpgradePrompt = memo(function UpgradePrompt({
  trigger,
  userId,
  petName,
  className = "",
}: UpgradePromptProps) {
  const navigate = useNavigate();
  const { getTriggerMessage } = useUpgradeTriggers(userId);
  const { title, message, cta } = getTriggerMessage(trigger);
  const Icon = triggerIcons[trigger];

  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden ${className}`}>
      {/* Header with calm clinical design */}
      <div className="bg-primary/[0.03] p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {message}
        </p>
      </div>

      {/* Vet cost comparison */}
      <div className="px-6 py-4 bg-muted/30 border-y border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">
          Cost Comparison
        </p>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emergency-red/60" />
            <span className="text-muted-foreground">Average vet visit</span>
          </div>
          <span className="font-semibold text-foreground">$120–$250</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-safe-green" />
            <span className="text-muted-foreground">Full triage access</span>
          </div>
          <span className="font-semibold text-primary">$3.99/month</span>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Structured clinical guidance for less than 13¢ per day.
        </p>
      </div>

      {/* CTA */}
      <div className="p-6 space-y-3">
        <Button
          onClick={() => navigate("/premium")}
          size="lg"
          className="w-full h-13 rounded-xl text-base font-bold"
        >
          {cta}
        </Button>
        <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" /> 7-day free trial
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> Cancel anytime
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 pb-4">
        <p className="text-[10px] text-muted-foreground text-center">
          Structured triage guidance. Not a replacement for veterinary care.
        </p>
      </div>
    </div>
  );
});
