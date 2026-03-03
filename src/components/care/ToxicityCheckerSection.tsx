import { useState, useCallback } from "react";
import { FlaskConical, Search, Loader2, AlertTriangle, CheckCircle, Info, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

const quickChips = ["Chocolate", "Grapes", "Onion", "Xylitol", "Lilies", "Avocado"];

interface ToxResult {
  chemical: string;
  found: boolean;
  urgencyLevel: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  aiAnalysis?: string;
  petSpecificRisks?: string[];
}

export function ToxicityCheckerSection({ petSpecies, isPremium = false }: { petSpecies?: string; isPremium?: boolean }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ToxResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { trackEvent } = useAnalyticsEvent();

  const handleCheck = useCallback(async (substance: string) => {
    const trimmed = substance.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    trackEvent("toxicity_search", { substance: trimmed });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const { data, error: err } = await supabase.functions.invoke("check-toxicity", {
        body: { chemical: trimmed, petSpecies },
      });
      clearTimeout(timeout);
      if (err) throw err;
      setResult(data);
    } catch (e) {
      setError("Unable to check. Please try again.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [petSpecies, trackEvent]);

  const statusConfig = {
    HIGH: { label: "Toxic", color: "bg-[hsl(var(--emergency-red))] text-white", icon: AlertTriangle },
    MODERATE: { label: "Caution", color: "bg-[hsl(var(--warning-amber))] text-white", icon: AlertTriangle },
    LOW: { label: "Safe", color: "bg-[hsl(var(--safe-green))] text-white", icon: CheckCircle },
    UNKNOWN: { label: "Unknown", color: "bg-muted text-muted-foreground", icon: Info },
  };

  return (
    <div id="toxicity">
      <h3 className="text-sm font-semibold text-foreground mb-3">Can my pet eat this?</h3>
      <div className="apple-card p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search food, plant, medicine…"
            className="flex-1 h-10 rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleCheck(query)}
            disabled={loading}
          />
          <Button onClick={() => handleCheck(query)} disabled={!query.trim() || loading} className="shrink-0 h-10 rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {quickChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleCheck(chip)}
              className="px-3 py-1.5 text-xs font-medium rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors active:scale-[0.97]"
            >
              {chip}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button variant="ghost" size="sm" className="mt-1 text-xs text-primary" onClick={() => handleCheck(query)}>
              <RefreshCw className="h-3 w-3 mr-1" /> Try Again
            </Button>
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-border p-3 space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-foreground">{result.chemical}</span>
              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", statusConfig[result.urgencyLevel].color)}>
                {statusConfig[result.urgencyLevel].label}
              </span>
            </div>
            {result.aiAnalysis && (
              <p className="text-xs text-muted-foreground leading-relaxed">{result.aiAnalysis}</p>
            )}
            {result.petSpecificRisks && result.petSpecificRisks.length > 0 && isPremium && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] font-semibold text-foreground mb-1">What to do:</p>
                <ul className="space-y-0.5">
                  {result.petSpecificRisks.map((r, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.petSpecificRisks && result.petSpecificRisks.length > 0 && !isPremium && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-[10px] text-primary font-semibold">🔒 Upgrade for full action steps & dosage guidance</p>
              </div>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">
          Data from EPA CCTE & veterinary toxicology databases
        </p>
      </div>
    </div>
  );
}
