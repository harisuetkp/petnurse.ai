import { memo, useState, useCallback } from "react";
import { FlaskConical, AlertTriangle, CheckCircle, Loader2, Search, Info, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface ToxicityResult {
  chemical: string;
  found: boolean;
  urgencyLevel: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  hazardData?: {
    humanHealth: string[];
    ecological: string[];
    cancerClassification?: string;
    developmentalToxicity?: boolean;
    reproductiveToxicity?: boolean;
    acuteToxicity?: string;
  };
  petSpecificRisks?: string[];
  aiAnalysis?: string;
  error?: string;
}

interface ToxicologyCheckCardProps {
  petSpecies?: string;
  onResult?: (result: ToxicityResult) => void;
}

type ErrorType = "timeout" | "network" | "server" | "generic";

interface ErrorState {
  type: ErrorType;
  message: string;
  suggestion: string;
}

const getErrorState = (error: unknown): ErrorState => {
  const errorStr = String(error).toLowerCase();
  
  if (errorStr.includes("abort") || errorStr.includes("timeout")) {
    return {
      type: "timeout",
      message: "Database temporarily busy",
      suggestion: "The toxicology database is experiencing high traffic. Please try again in a moment.",
    };
  }
  
  if (errorStr.includes("network") || errorStr.includes("fetch")) {
    return {
      type: "network",
      message: "Connection issue",
      suggestion: "Please check your internet connection and try again.",
    };
  }
  
  if (errorStr.includes("500") || errorStr.includes("502") || errorStr.includes("503")) {
    return {
      type: "server",
      message: "Service temporarily unavailable",
      suggestion: "Our toxicology service is being updated. Please try again shortly.",
    };
  }
  
  return {
    type: "generic",
    message: "Unable to check toxicity",
    suggestion: "Please try again. If the issue persists, consult your veterinarian directly.",
  };
};

const urgencyConfig = {
  HIGH: {
    icon: AlertTriangle,
    label: "HIGH RISK",
    cardClass: "border-emergency-red bg-emergency-red/5",
    iconClass: "text-emergency-red",
    badgeClass: "bg-emergency-red text-white",
  },
  MODERATE: {
    icon: AlertTriangle,
    label: "MODERATE RISK",
    cardClass: "border-warning-amber bg-warning-amber/5",
    iconClass: "text-warning-amber",
    badgeClass: "bg-warning-amber text-warning-amber-foreground",
  },
  LOW: {
    icon: CheckCircle,
    label: "LOW RISK",
    cardClass: "border-safe-green bg-safe-green/5",
    iconClass: "text-safe-green",
    badgeClass: "bg-safe-green text-white",
  },
  UNKNOWN: {
    icon: Info,
    label: "UNKNOWN",
    cardClass: "border-muted bg-muted/20",
    iconClass: "text-muted-foreground",
    badgeClass: "bg-muted text-muted-foreground",
  },
} as const;

export const ToxicologyCheckCard = memo(function ToxicologyCheckCard({ 
  petSpecies, 
  onResult 
}: ToxicologyCheckCardProps) {
  const [ingredient, setIngredient] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<ToxicityResult | null>(null);
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIngredient(e.target.value);
    // Clear error when user starts typing
    if (errorState) setErrorState(null);
  }, [errorState]);

  const handleCheck = useCallback(async () => {
    const trimmedIngredient = ingredient.trim();
    if (!trimmedIngredient) return;

    setIsChecking(true);
    setErrorState(null);
    
    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const { data, error: invokeError } = await supabase.functions.invoke("check-toxicity", {
        body: {
          chemical: trimmedIngredient,
          petSpecies,
        },
      });

      clearTimeout(timeoutId);

      if (invokeError) throw invokeError;

      setResult(data);
      onResult?.(data);
    } catch (err) {
      const errorInfo = getErrorState(err);
      setErrorState(errorInfo);
      setResult(null);
    } finally {
      setIsChecking(false);
    }
  }, [ingredient, petSpecies, onResult]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCheck();
  }, [handleCheck]);

  const config = result ? urgencyConfig[result.urgencyLevel] : null;
  const Icon = config?.icon;

  return (
    <div className="apple-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-primary/10">
          <FlaskConical className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Toxicology Check</h3>
          <p className="text-xs text-muted-foreground">
            Check if an ingredient is toxic to pets
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          value={ingredient}
          onChange={handleInputChange}
          placeholder="Enter chemical or ingredient..."
          className="flex-1"
          onKeyDown={handleKeyDown}
          disabled={isChecking}
        />
        <Button
          onClick={handleCheck}
          disabled={!ingredient.trim() || isChecking}
          className="shrink-0"
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </Button>
      </div>

      {errorState && (
        <div className="rounded-xl border-2 border-muted bg-muted/10 p-4 space-y-3 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted/50">
              {errorState.type === "timeout" ? (
                <Clock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Info className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="font-medium text-foreground text-sm">{errorState.message}</p>
              <p className="text-xs text-muted-foreground">{errorState.suggestion}</p>
            </div>
          </div>
          <Button
            onClick={handleCheck}
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Try Again
          </Button>
        </div>
      )}

      {result && config && Icon && (
        <div className={cn("rounded-xl border-2 p-4 space-y-3 animate-fade-in", config.cardClass)}>
          <div className="flex items-start gap-3">
            <Icon className={cn("h-5 w-5 mt-0.5", config.iconClass)} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground">{result.chemical}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", config.badgeClass)}>
                  {config.label}
                </span>
              </div>

              {result.aiAnalysis && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.aiAnalysis}
                </p>
              )}
            </div>
          </div>

          {result.petSpecificRisks && result.petSpecificRisks.length > 0 && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs font-semibold text-foreground mb-2">Pet-Specific Risks:</p>
              <ul className="space-y-1">
                {result.petSpecificRisks.slice(0, 4).map((risk, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className={cn("mt-1", config.iconClass)}>•</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.hazardData?.humanHealth && result.hazardData.humanHealth.length > 0 && !result.petSpecificRisks && (
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs font-semibold text-foreground mb-2">Health Effects:</p>
              <ul className="space-y-1">
                {result.hazardData.humanHealth.slice(0, 4).map((effect, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className={cn("mt-1", config.iconClass)}>•</span>
                    <span>{effect}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!result.found && !result.aiAnalysis && (
            <p className="text-xs text-muted-foreground italic">
              No toxicity data found. If concerned, consult your veterinarian.
            </p>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Data sourced from EPA CCTE and veterinary toxicology databases
      </p>
    </div>
  );
});
