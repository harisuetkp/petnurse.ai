import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, History, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PetSelector } from "@/components/triage/PetSelector";
import { TriageHistoryList } from "@/components/triage/TriageHistoryList";
import { DiagnosticProgress } from "@/components/diagnostic/DiagnosticProgress";
import { DiagnosticStepCard } from "@/components/diagnostic/DiagnosticStepCard";
import { DiagnosticSkeleton } from "@/components/diagnostic/DiagnosticSkeleton";
import { CriticalWarningBanner } from "@/components/diagnostic/CriticalWarningBanner";
import { TriageReport } from "@/components/diagnostic/TriageReport";
import { LockedResultCard } from "@/components/triage/LockedResultCard";
import { ToxicologyCheckCard } from "@/components/triage/ToxicologyCheckCard";
import { ErrorState } from "@/components/ui/error-state";
import { useDiagnosticEngine, hasSavedTriageReport, clearTriageState, type TriageError } from "@/hooks/useDiagnosticEngine";
import { useTriageHistory } from "@/hooks/useTriageHistory";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useActivePet } from "@/contexts/ActivePetContext";
import petnurseLogo from "@/assets/petnurse-logo-v2.png";
import { SeoHead } from "@/components/seo/SeoHead";
import { TriageHowToSchema } from "@/components/seo/TriageHowToSchema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function TriagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pets, activePet, setActivePetId } = useActivePet();
  const [isPremium, setIsPremium] = useState(false);
  // Auto-start if there's a saved report (returning from payment) or if start param is set
  const [hasStarted, setHasStarted] = useState(() => 
    searchParams.get("start") === "true" || 
    searchParams.get("payment") === "success" || 
    hasSavedTriageReport()
  );
  const [historySaved, setHistorySaved] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(() => searchParams.get("payment") === "success");
  const { toast } = useToast();
  const { saveTriage } = useTriageHistory();

  const {
    currentStep,
    totalSteps,
    progress,
    currentStepData,
    criticalWarning,
    isComplete,
    report,
    isGeneratingQuestions,
    triageError,
    submitAnswer,
    goBack,
    reset,
    dismissCriticalWarning,
  } = useDiagnosticEngine(activePet?.name, activePet?.species);

  // Check session with caching
  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  // Premium status with React Query for caching
  const { data: profileData } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 30000,
  });

  // Sync premium state from query
  useEffect(() => {
    setIsPremium(profileData?.is_premium || false);
  }, [profileData]);

  // Handle payment success redirect - verify subscription and unlock results
  useEffect(() => {
    if (!isCheckingPayment || !session) return;

    const verifyPayment = async () => {
      try {
        // Check subscription status
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (!error && data?.subscribed) {
          setIsPremium(true);
          // Start the assessment automatically if not already started
          setHasStarted(true);
          toast({
            title: "Payment successful!",
            description: "Your results are now unlocked.",
          });
          // Clear the saved triage state after successful payment since results are now accessible
          // This is done after a delay to ensure the report is displayed first
          setTimeout(() => {
            clearTriageState();
          }, 5000);
        }
      } catch (e) {
        console.error("Payment verification error:", e);
      } finally {
        setIsCheckingPayment(false);
        // Clear the payment param from URL
        setSearchParams((prev) => {
          prev.delete("payment");
          return prev;
        }, { replace: true });
      }
    };

    // Small delay to allow Stripe webhook to process
    const timer = setTimeout(verifyPayment, 1500);
    return () => clearTimeout(timer);
  }, [isCheckingPayment, session, toast, setSearchParams]);

  // Active pet is managed by context — no need for local auto-select

  // Save triage when report is generated
  useEffect(() => {
    if (report && isPremium && !historySaved && session) {
      saveTriage({
        petId: activePet?.id || null,
        symptoms: report.clinicalSummary.join("; "),
        result: {
          status: report.status,
          title: report.title,
          summary: report.clinicalSummary.join(" "),
          next_steps: report.recommendedActions,
          warning_signs: report.warningSignsToWatch,
        },
        conversation: [],
      });
      setHistorySaved(true);
      toast({
        title: "Assessment saved",
        description: "Your triage report has been saved to history.",
      });
    }
  }, [report, isPremium, historySaved, activePet, saveTriage, session, toast]);

  const handleStart = useCallback(() => {
    setHasStarted(true);
    setHistorySaved(false);
  }, []);

  const handleReset = useCallback(() => {
    reset();
    setHasStarted(false);
    setHistorySaved(false);
  }, [reset]);

  const handleAddPet = useCallback(() => {
    window.location.href = "/pets";
  }, []);

  const handleUnlock = useCallback(() => {
    window.location.href = "/premium";
  }, []);

  // Fail-safe: if we're mid-assessment but have no step data, show recovery UI
  const showRecoveryState = hasStarted && !isComplete && !currentStepData && !isGeneratingQuestions && !triageError;

  // Show error states for auth or generation failures
  const showTriageError = hasStarted && !isComplete && triageError;

  return (
    <div className="flex flex-col h-screen">
      <SeoHead
        title="Pet Symptom Checker — Free AI Triage | PetNurse AI"
        description="Free 24/7 AI-powered pet symptom checker. Get a structured triage assessment for your dog or cat's symptoms in minutes. Backed by clinical veterinary data."
        canonicalPath="/triage"
      />
      <TriageHowToSchema />
      {/* Header */}
      <header className="safe-area-top glass sticky top-0 z-40">
        <div className="flex items-center justify-between px-5 py-3 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            {session ? (
              <PetSelector
                pets={pets as any}
                selectedPet={activePet as any}
                onSelect={(pet: any) => setActivePetId(pet.id)}
                onAddPet={handleAddPet}
              />
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-primary/10">
                  <Stethoscope className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-base font-semibold text-foreground">PetNurse AI</h1>
                  <p className="text-xs text-muted-foreground">Diagnostic Engine</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {session && (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <History className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle className="text-xl">Triage History</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <TriageHistoryList />
                  </div>
                </SheetContent>
              </Sheet>
            )}
            
            {hasStarted && !isComplete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-6">
        <div className="max-w-2xl mx-auto">
          {!hasStarted ? (
            /* Landing State */
            <div className="text-center py-2 animate-fade-in">
              <div className="flex justify-center mb-3">
                <img 
                  src={petnurseLogo} 
                  alt="PetNurse AI" 
                  loading="eager"
                  fetchPriority="high"
                  decoding="sync"
                  className="h-28 w-28 sm:h-36 sm:w-36 rounded-[28px] object-contain"
                />
              </div>
              
              <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
                {activePet ? `Assess ${activePet.name}'s Health` : "Pet Health Assessment"}
              </h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm leading-relaxed">
                Complete a structured clinical assessment to determine the urgency of your pet's symptoms.
              </p>
              
              {/* Start Assessment CTA - Mobile-optimized */}
              <Button
                onClick={handleStart}
                size="lg"
                className="h-14 w-full max-w-xs mx-auto px-6 rounded-2xl text-base font-semibold shadow-lg"
              >
                <Stethoscope className="h-5 w-5 mr-2" />
                Begin Assessment
              </Button>

              {/* Features list */}
              <div className="mt-8 grid gap-3 text-left max-w-sm mx-auto">
                {[
                  "6-step clinical evaluation",
                  "Instant priority classification",
                  "EPA toxicology database check",
                  "Downloadable report for your vet",
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Toxicology Check */}
              <div className="mt-8 max-w-sm mx-auto">
                <ToxicologyCheckCard petSpecies={activePet?.species} />
              </div>

              <p className="text-xs text-muted-foreground mt-8 max-w-xs mx-auto">
                ⚠️ This is not a replacement for professional veterinary care. Always consult a vet for emergencies.
              </p>
            </div>
          ) : isComplete && report ? (
            /* Report State - Show paywall for non-premium users OR if server flagged premium required */
            isPremium && !report.isPremiumRequired ? (
              <TriageReport report={report} onReset={handleReset} />
            ) : (
            <LockedResultCard
                onUnlock={handleUnlock}
                reportStatus={report.status}
                reportTitle={report.title}
                previewData={report.previewData}
                petName={report.petName}
              />
            )
          ) : showTriageError ? (
            /* Auth or generation error */
            <ErrorState
              variant="card"
              type="generic"
              title={triageError === "auth_required" ? "Sign in required" : "Connection issue"}
              message={
                triageError === "auth_required"
                  ? "Please sign in to use the AI diagnostic engine. Your assessment needs a secure connection to our veterinary AI."
                  : "We couldn't connect to the AI engine. This is usually temporary — please try again."
              }
              onRetry={triageError === "auth_required" ? () => { window.location.href = "/auth"; } : handleReset}
            />
          ) : showRecoveryState ? (
            /* Fail-safe: Recovery UI when step data is missing */
            <ErrorState
              variant="card"
              type="generic"
              title="Assessment interrupted"
              message="We encountered an issue loading the next question. You can restart the assessment or try again."
              onRetry={handleReset}
            />
          ) : (
            /* Assessment Steps */
            <div className="space-y-6">
              <DiagnosticProgress
                currentStep={currentStep}
                totalSteps={totalSteps}
                progress={progress}
              />
              
              {currentStepData ? (
                <DiagnosticStepCard
                  step={currentStepData}
                  onAnswer={submitAnswer}
                  onBack={goBack}
                  canGoBack={currentStep > 0}
                  isLoading={isGeneratingQuestions}
                />
              ) : isGeneratingQuestions ? (
                <DiagnosticSkeleton />
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Critical Warning Banner - Only show AFTER report is unlocked for premium users */}
      {isPremium && isComplete && report && !report.isPremiumRequired && criticalWarning && (
        <CriticalWarningBanner
          message={criticalWarning}
          onDismiss={dismissCriticalWarning}
        />
      )}
    </div>
  );
}

export default TriagePage;
