import { useState, useCallback } from "react";
import { Dog, Frown, Volume2, Droplets, Lock, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const behaviors = [
  { id: "anxiety", icon: Frown, label: "Anxiety", color: "bg-[hsl(var(--primary-accent))]/10 text-[hsl(var(--primary-accent))]" },
  { id: "aggression", icon: Dog, label: "Aggression", color: "bg-[hsl(var(--emergency-red))]/10 text-[hsl(var(--emergency-red))]" },
  { id: "barking", icon: Volume2, label: "Barking", color: "bg-[hsl(var(--warning-amber))]/10 text-[hsl(var(--warning-amber))]" },
  { id: "potty", icon: Droplets, label: "Potty Issues", color: "bg-primary/10 text-primary" },
];

const behaviorData: Record<string, { causes: string[]; plan: string[]; seeVet: string }> = {
  anxiety: {
    causes: ["Separation from owner", "Loud noises (thunderstorms, fireworks)", "New environment or routine change"],
    plan: ["Create a safe, quiet space with familiar items", "Use calming aids (pheromone diffusers, anxiety wraps)", "Gradual desensitization training with positive reinforcement"],
    seeVet: "If anxiety causes self-harm, destructive behavior, or appetite loss lasting 48+ hours.",
  },
  aggression: {
    causes: ["Fear or feeling cornered", "Pain or illness", "Resource guarding (food, toys)"],
    plan: ["Avoid punishment — it worsens aggression", "Identify and remove triggers when possible", "Consult a certified animal behaviorist"],
    seeVet: "If aggression is sudden/new, or if your pet has bitten someone.",
  },
  barking: {
    causes: ["Boredom or excess energy", "Alerting to sounds or strangers", "Attention seeking"],
    plan: ["Increase daily exercise and mental stimulation", "Teach 'quiet' command with treats", "Ignore attention-seeking barking; reward silence"],
    seeVet: "If barking is accompanied by distress, pacing, or occurs mostly at night (may indicate cognitive decline in older pets).",
  },
  potty: {
    causes: ["Incomplete house training", "Urinary tract infection", "Stress or territorial marking"],
    plan: ["Establish consistent outdoor/litter schedule", "Clean accidents with enzyme cleaner (not ammonia)", "Reward successful outdoor/litter box use immediately"],
    seeVet: "If there's blood in urine, straining to urinate, or sudden regression in a trained pet.",
  },
};

interface Props {
  isPremium?: boolean;
  petSpecies?: string;
}

export function BehaviorCoachSection({ isPremium = false, petSpecies }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const advice = selected ? behaviorData[selected] : null;

  const fetchAiAdvice = useCallback(async (behaviorId: string) => {
    if (!isPremium) return;
    setAiLoading(true);
    setAiAdvice(null);
    try {
      const { data, error } = await supabase.functions.invoke("triage", {
        body: {
          messages: [
            { role: "user", content: `My ${petSpecies || "pet"} is showing ${behaviorId} behavior. Give a brief personalized 3-sentence coaching recommendation. Be warm, professional, and specific.` }
          ],
          mode: "behavior_coach",
        },
      });
      if (!error && data?.reply) {
        setAiAdvice(data.reply);
      }
    } catch {
      // Fail silently, static content is still shown
    } finally {
      setAiLoading(false);
    }
  }, [isPremium, petSpecies]);

  const handleSelect = (id: string) => {
    setSelected(id);
    setAiAdvice(null);
    if (isPremium) fetchAiAdvice(id);
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Behavior Coach</h3>
      <div className="apple-card p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🐾</span>
          <p className="text-xs text-muted-foreground">Get guidance on common behavior issues</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {behaviors.map((b) => {
            const Icon = b.icon;
            return (
              <button
                key={b.id}
                onClick={() => handleSelect(b.id)}
                className="p-3 rounded-xl border border-border hover:border-primary/30 flex items-center gap-2 transition-colors active:scale-[0.97]"
              >
                <div className={`w-8 h-8 rounded-lg ${b.color} flex items-center justify-center shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-medium text-foreground">{b.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg flex items-center gap-2">
              🐾 {behaviors.find((b) => b.id === selected)?.label}
            </SheetTitle>
          </SheetHeader>
          {advice && (
            <div className="mt-4 pb-8 space-y-4">
              {/* AI Personalized Advice (Premium) */}
              {isPremium && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold text-primary">AI Coach Recommendation</p>
                  </div>
                  {aiLoading ? (
                    <div className="flex items-center gap-2 py-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Generating personalized advice…</p>
                    </div>
                  ) : aiAdvice ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">{aiAdvice}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Personalized advice unavailable right now.</p>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">Likely Causes:</p>
                <ul className="space-y-1">
                  {advice.causes.map((c, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {c}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-2">3-Step Plan:</p>
                <ul className="space-y-2">
                  {advice.plan.map((step, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl bg-[hsl(var(--warning-amber-bg))] border border-[hsl(var(--warning-amber))]/30 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">When to See a Vet/Trainer:</p>
                <p className="text-xs text-muted-foreground">{advice.seeVet}</p>
              </div>

              {!isPremium && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">AI-personalized coaching</p>
                    <Link to="/premium" className="text-[10px] text-primary font-semibold">Upgrade to Pro →</Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
