import { useState, useCallback } from "react";
import { Pill, Search, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import { Pet } from "@/contexts/ActivePetContext";

export function MedicationSafetySection({ pet, isPremium = false }: { pet: Pet | null; isPremium?: boolean }) {
  const [medName, setMedName] = useState("");
  const [weight, setWeight] = useState(pet?.weight?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { trackEvent } = useAnalyticsEvent();

  const handleCheck = useCallback(async () => {
    if (!medName.trim()) return;
    setLoading(true);
    setError(null);
    trackEvent("medication_safety_check", { medication: medName.trim() });

    try {
      const { data, error: err } = await supabase.functions.invoke("check-toxicity", {
        body: {
          chemical: medName.trim(),
          petSpecies: pet?.species || "dog",
          isMedication: true,
          petWeight: weight ? parseFloat(weight) : undefined,
        },
      });
      if (err) throw err;
      setResult(data);
    } catch {
      setError("Unable to check medication safety. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [medName, weight, pet, trackEvent]);

  return (
    <div id="medication">
      <h3 className="text-sm font-semibold text-foreground mb-3">Medication Safety</h3>
      <div className="apple-card p-4 space-y-3">
        <Input
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          placeholder="Medication name (e.g. Ibuprofen)"
          className="h-10 rounded-xl"
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder={`Pet weight (${pet?.weight ? pet.weight + ' kg' : 'kg'})`}
            className="flex-1 h-10 rounded-xl"
          />
          <Button onClick={handleCheck} disabled={!medName.trim() || loading} className="shrink-0 h-10 rounded-xl">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check"}
          </Button>
        </div>

        {error && <p className="text-xs text-[hsl(var(--emergency-red))] text-center">{error}</p>}

        {result && (
          <div className={cn(
            "rounded-xl border p-3 space-y-2 animate-in fade-in",
            result.urgencyLevel === "HIGH" ? "border-[hsl(var(--emergency-red))] bg-[hsl(var(--emergency-red-bg))]" :
            result.urgencyLevel === "MODERATE" ? "border-[hsl(var(--warning-amber))] bg-[hsl(var(--warning-amber-bg))]" :
            "border-[hsl(var(--safe-green))] bg-[hsl(var(--safe-green-bg))]"
          )}>
            <div className="flex items-center gap-2">
              {result.urgencyLevel === "HIGH" ? (
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--emergency-red))]" />
              ) : (
                <CheckCircle className="h-4 w-4 text-[hsl(var(--safe-green))]" />
              )}
              <span className="text-sm font-semibold text-foreground">{result.chemical}</span>
            </div>
            {result.aiAnalysis && isPremium && (
              <p className="text-xs text-muted-foreground">{result.aiAnalysis}</p>
            )}
            {result.aiAnalysis && !isPremium && (
              <p className="text-xs text-muted-foreground">{result.aiAnalysis.substring(0, 80)}… <span className="text-primary font-semibold">Upgrade for full analysis</span></p>
            )}
            {result.urgencyLevel === "HIGH" && (
              <p className="text-xs font-bold text-[hsl(var(--emergency-red))]">
                ⚠️ Do NOT give this to your pet without veterinary guidance.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
