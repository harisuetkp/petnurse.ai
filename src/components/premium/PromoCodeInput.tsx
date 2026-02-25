import { useState, useCallback, useRef, useEffect } from "react";
import { Check, Loader2, Tag, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromoCodeInputProps {
  onValidCode: (influencerId: string, discountPercent: number) => void;
  onClear: () => void;
  disabled?: boolean;
  /** Pre-fill with referral code from URL */
  initialCode?: string | null;
  /** If already validated externally */
  initialValidated?: boolean;
  initialDiscount?: number | null;
}

export function PromoCodeInput({ 
  onValidCode, 
  onClear, 
  disabled,
  initialCode,
  initialValidated,
  initialDiscount,
}: PromoCodeInputProps) {
  const [code, setCode] = useState(initialCode?.toUpperCase() || "");
  const [validating, setValidating] = useState(false);
  const [validatedCode, setValidatedCode] = useState<string | null>(
    initialValidated && initialCode ? initialCode.toUpperCase() : null
  );
  const [discount, setDiscount] = useState<number | null>(initialDiscount || null);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track validation state and prevent race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  // Sync with external validation state
  useEffect(() => {
    if (initialValidated && initialCode && initialDiscount) {
      setValidatedCode(initialCode.toUpperCase());
      setDiscount(initialDiscount);
      setCode(initialCode.toUpperCase());
    }
  }, [initialValidated, initialCode, initialDiscount]);
  
  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleValidate = useCallback(async () => {
    const trimmedCode = code.trim();
    if (!trimmedCode || validating) return;
    
    // Cancel any pending request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setValidating(true);
    setError(null);
    
    // Create a timeout promise
    const timeoutPromise = new Promise<{ timedOut: true }>((resolve) => {
      setTimeout(() => resolve({ timedOut: true }), 8000);
    });
    
    try {
      const fetchPromise = supabase.functions.invoke("validate-promo", {
        body: { promoCode: trimmedCode },
      });
      
      // Race between fetch and timeout
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Check if component unmounted
      if (!isMountedRef.current) return;
      
      // Handle timeout
      if ("timedOut" in result) {
        setError("Request timed out. Please try again.");
        setValidating(false);
        return;
      }
      
      const { data, error: fnError } = result;
      
      if (fnError) {
        setError("Failed to validate code. Please try again.");
        setValidatedCode(null);
        setDiscount(null);
        setValidating(false);
        return;
      }
      
      if (data?.valid) {
        setValidatedCode(trimmedCode.toUpperCase());
        setDiscount(data.discountPercent || 10);
        setValidating(false);
        onValidCode(data.influencerId, data.discountPercent || 10);
      } else {
        setError(data?.error || "Invalid or inactive promo code");
        setValidatedCode(null);
        setDiscount(null);
        setValidating(false);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      // Ignore abort errors
      if (err instanceof Error && err.name === "AbortError") return;
      
      setError("Failed to validate code. Please try again.");
      setValidatedCode(null);
      setDiscount(null);
      setValidating(false);
    }
  }, [code, onValidCode, validating]);

  const handleClear = useCallback(() => {
    setCode("");
    setValidatedCode(null);
    setDiscount(null);
    setError(null);
    onClear();
  }, [onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !validating && code.trim()) {
      e.preventDefault();
      handleValidate();
    }
  }, [handleValidate, validating, code]);

  if (validatedCode) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-safe-green/10 border border-safe-green/20">
        <div className="p-2 rounded-full bg-safe-green/20">
          <Check className="h-4 w-4 text-safe-green" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Code <span className="font-mono">{validatedCode}</span> applied
          </p>
          <p className="text-xs text-muted-foreground">
            {discount}% discount will be applied at checkout
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClear}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter promo code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            className="pl-10 uppercase"
            disabled={disabled || validating}
          />
        </div>
        <Button 
          onClick={handleValidate} 
          disabled={!code.trim() || validating || disabled}
          variant="secondary"
        >
          {validating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
