import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Minimum time (ms) the AI processing indicator must display so users see the full
// "Analyzing → Cross-referencing → Reviewing → Generating" animation on every device.
const MIN_PROCESSING_DISPLAY_MS = 5200;

/** Returns a promise that enforces a minimum elapsed time since `start`. */
function enforceMinDelay(start: number): Promise<void> {
  const elapsed = Date.now() - start;
  const remaining = MIN_PROCESSING_DISPLAY_MS - elapsed;
  return remaining > 0 ? new Promise((r) => setTimeout(r, remaining)) : Promise.resolve();
}

export type InputType = "single-choice" | "color-swatch" | "slider" | "multi-choice" | "text-area";

export interface DiagnosticOption {
  value: string;
  label: string;
  icon?: string;
  isCritical?: boolean;
  color?: string;
}

export interface DiagnosticStep {
  id: string;
  title: string;
  subtitle?: string;
  inputType: InputType;
  options?: DiagnosticOption[];
  min?: number;
  max?: number;
  infoTerm?: string;
  infoDefinition?: string;
  placeholder?: string;
}

export interface DiagnosticAnswer {
  stepId: string;
  value: string | number;
  label?: string;
  isCritical?: boolean;
}

interface ConversationEntry {
  question: string;
  answer: string;
}

export type TriageStatus = "RED" | "YELLOW" | "GREEN";

export interface PotentialDiagnosis {
  condition: string;
  commonName: string;
  likelihood: "Highly Likely" | "Possible" | "Less Likely";
  reasoning: string;
  urgency: string;
}

export interface MedicalGlossaryEntry {
  term: string;
  definition: string;
}

export interface TriageReport {
  id: string;
  status: TriageStatus;
  title: string;
  potentialDiagnoses: PotentialDiagnosis[];
  clinicalSummary: string[];
  recommendedActions: string[];
  warningSignsToWatch: string[];
  knowledgeBaseReferences?: string[];
  vetCommunicationTips?: string[];
  medicalGlossary?: MedicalGlossaryEntry[];
  generatedAt: Date;
  petName?: string;
  petSpecies?: string;
  // Server-side paywall indicator (prevents network inspection bypass)
  isPremiumRequired?: boolean;
  previewData?: {
    diagnosesCount: number;
    hasEmergency: boolean;
  };
}

// Storage keys for persistence
const STORAGE_KEYS = {
  REPORT: "petnurse_triage_report",
  ANSWERS: "petnurse_triage_answers",
  CONVERSATION: "petnurse_triage_conversation",
  SYMPTOM: "petnurse_triage_symptom",
  PET_INFO: "petnurse_triage_pet",
} as const;

// Helper to save triage state to sessionStorage
function saveTriageState(
  report: TriageReport | null,
  answers: DiagnosticAnswer[],
  conversationHistory: ConversationEntry[],
  symptomDescription: string,
  petName?: string,
  petSpecies?: string
) {
  try {
    if (report) {
      sessionStorage.setItem(STORAGE_KEYS.REPORT, JSON.stringify({
        ...report,
        generatedAt: report.generatedAt.toISOString(),
      }));
    }
    if (answers.length > 0) {
      sessionStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
    }
    if (conversationHistory.length > 0) {
      sessionStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(conversationHistory));
    }
    if (symptomDescription) {
      sessionStorage.setItem(STORAGE_KEYS.SYMPTOM, symptomDescription);
    }
    if (petName || petSpecies) {
      sessionStorage.setItem(STORAGE_KEYS.PET_INFO, JSON.stringify({ petName, petSpecies }));
    }
  } catch {
    // Storage might be full or unavailable
  }
}

// Helper to load triage state from sessionStorage
function loadTriageState(): {
  report: TriageReport | null;
  answers: DiagnosticAnswer[];
  conversationHistory: ConversationEntry[];
  symptomDescription: string;
  petInfo: { petName?: string; petSpecies?: string } | null;
} {
  try {
    const reportStr = sessionStorage.getItem(STORAGE_KEYS.REPORT);
    const answersStr = sessionStorage.getItem(STORAGE_KEYS.ANSWERS);
    const conversationStr = sessionStorage.getItem(STORAGE_KEYS.CONVERSATION);
    const symptomStr = sessionStorage.getItem(STORAGE_KEYS.SYMPTOM);
    const petInfoStr = sessionStorage.getItem(STORAGE_KEYS.PET_INFO);

    let report: TriageReport | null = null;
    if (reportStr) {
      const parsed = JSON.parse(reportStr);
      report = {
        ...parsed,
        generatedAt: new Date(parsed.generatedAt),
      };
    }

    return {
      report,
      answers: answersStr ? JSON.parse(answersStr) : [],
      conversationHistory: conversationStr ? JSON.parse(conversationStr) : [],
      symptomDescription: symptomStr || "",
      petInfo: petInfoStr ? JSON.parse(petInfoStr) : null,
    };
  } catch {
    return {
      report: null,
      answers: [],
      conversationHistory: [],
      symptomDescription: "",
      petInfo: null,
    };
  }
}

// Helper to clear triage state from sessionStorage
export function clearTriageState() {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      sessionStorage.removeItem(key);
    });
  } catch {
    // Ignore errors
  }
}

// Helper to check if there's a saved report
export function hasSavedTriageReport(): boolean {
  try {
    return !!sessionStorage.getItem(STORAGE_KEYS.REPORT);
  } catch {
    return false;
  }
}

// Initial symptom description step
const INITIAL_STEP: DiagnosticStep = {
  id: "symptom_description",
  title: "Describe the Symptoms",
  subtitle: "Provide a detailed description of what you've observed. Include when it started, any changes in behavior, and specific concerns.",
  inputType: "text-area",
  placeholder: "Example: My dog has been vomiting since this morning. He seems lethargic and won't eat his food. I noticed he got into the trash last night...",
};

const TOTAL_QUESTIONS = 5;

function generateReportId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "PN-";
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export type TriageError = "auth_required" | "generation_failed" | null;

export function useDiagnosticEngine(petName?: string, petSpecies?: string) {
  // Try to restore state from storage on initial load
  const savedState = useRef(loadTriageState());
  const hasRestoredReport = useRef(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<DiagnosticAnswer[]>([]);
  const [dynamicSteps, setDynamicSteps] = useState<DiagnosticStep[]>([INITIAL_STEP]);
  const [criticalWarning, setCriticalWarning] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [report, setReport] = useState<TriageReport | null>(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [triageError, setTriageError] = useState<TriageError>(null);
  
  // Track conversation history for adaptive questions
  const conversationHistory = useRef<ConversationEntry[]>([]);
  const symptomDescriptionRef = useRef<string>("");
  
  // MEMORY LEAK FIX: Track active AbortControllers for cleanup
  const activeAbortControllers = useRef<Set<AbortController>>(new Set());

  // Restore saved report on mount (only once)
  useEffect(() => {
    if (!hasRestoredReport.current && savedState.current.report) {
      setReport(savedState.current.report);
      setIsComplete(true);
      setAnswers(savedState.current.answers);
      conversationHistory.current = savedState.current.conversationHistory;
      symptomDescriptionRef.current = savedState.current.symptomDescription;
      hasRestoredReport.current = true;
    }
  }, []);

  // Save state whenever report is generated
  useEffect(() => {
    if (report && isComplete) {
      saveTriageState(
        report,
        answers,
        conversationHistory.current,
        symptomDescriptionRef.current,
        petName,
        petSpecies
      );
    }
  }, [report, isComplete, answers, petName, petSpecies]);

  // MEMORY LEAK FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Abort all pending requests
      activeAbortControllers.current.forEach(controller => {
        controller.abort();
      });
      activeAbortControllers.current.clear();
      
      // Clear refs to prevent memory retention
      conversationHistory.current = [];
      symptomDescriptionRef.current = "";
    };
  }, []);

  // Total steps = 1 initial + 5 follow-up questions = 6
  const totalSteps = TOTAL_QUESTIONS + 1;
  // Progress based on how many questions have been answered
  const progress = currentStep === 0 ? 10 : Math.min(((currentStep + 1) / totalSteps) * 100, 100);

  const currentStepData = dynamicSteps[currentStep];

  // Generate a SINGLE adaptive follow-up question based on conversation so far
  // Uses direct fetch with explicit auth headers for reliable cross-device behavior
  // NEVER silently falls back to static questions — retries aggressively or throws
  const generateNextQuestion = useCallback(async (questionNumber: number, retries = 3): Promise<DiagnosticStep | "AUTH_REQUIRED" | null> => {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    console.log(`[Triage] Generating dynamic question ${questionNumber} (max ${retries + 1} attempts)`);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Re-fetch session on EVERY attempt (token may have refreshed between retries)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.error(`[Triage] No auth session found on attempt ${attempt + 1}`);
          // On mobile, session might take a moment to load. Wait and retry.
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          return "AUTH_REQUIRED";
        }

        console.log(`[Triage] Attempt ${attempt + 1}: calling triage API with token ${session.access_token.slice(0, 10)}...`);

        const response = await fetch(`${SUPABASE_URL}/functions/v1/triage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "apikey": SUPABASE_KEY,
          },
          body: JSON.stringify({
            type: "generate-next-question",
            symptomDescription: symptomDescriptionRef.current,
            previousAnswers: conversationHistory.current,
            questionNumber,
            petName,
            petSpecies,
          }),
        });

        // Validate response is actually JSON (catches HTML error pages)
        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          const textResponse = await response.text();
          console.error(`[Triage] Expected JSON but got ${contentType}:`, textResponse.substring(0, 200));
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          throw new Error(`API returned non-JSON response (${response.status})`);
        }

        if (!response.ok) {
          const errData = await response.json();
          console.warn(`[Triage] Attempt ${attempt + 1} failed (${response.status}):`, errData);
          if (attempt < retries) {
            await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            continue;
          }
          throw new Error(`Triage API error: ${response.status}`);
        }

        const data = await response.json();
        const question = data?.question;
        
        if (question) {
          console.log(`[Triage] ✓ Dynamic question ${questionNumber} generated: "${question.title}"`);
          return {
            id: question.id || `question_${questionNumber}`,
            title: `${questionNumber + 1}. ${question.title}`,
            subtitle: question.subtitle,
            inputType: question.inputType || "single-choice",
            options: question.options,
            min: question.min,
            max: question.max,
            infoTerm: question.infoTerm,
            infoDefinition: question.infoDefinition,
          };
        }
        
        // Response came back but no question — retry
        if (attempt < retries) {
          console.warn(`[Triage] Empty question in response, retrying (${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        
        console.error(`[Triage] All ${retries + 1} attempts returned empty questions`);
        return null;
      } catch (err) {
        console.error(`[Triage] Attempt ${attempt + 1} error:`, err);
        if (attempt < retries) {
          await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        console.error(`[Triage] All ${retries + 1} attempts failed for question ${questionNumber}`);
        return null;
      }
    }
    return null;
  }, [petName, petSpecies]);

  // Generate first question after symptom description
  // Returns true if a question was generated, false otherwise
  // Returns "success", "auth_required", or "failed"
  const generateFirstFollowUpQuestion = useCallback(async (symptomDescription: string): Promise<"success" | "auth_required" | "failed"> => {
    setIsGeneratingQuestions(true);
    symptomDescriptionRef.current = symptomDescription;
    conversationHistory.current = [];
    const startTime = Date.now();
    
    try {
      const nextQuestion = await generateNextQuestion(1);
      await enforceMinDelay(startTime);
      
      if (nextQuestion === "AUTH_REQUIRED") return "auth_required";
      
      if (nextQuestion) {
        setDynamicSteps([INITIAL_STEP, nextQuestion]);
        return "success";
      }

      // AI failed after all retries — retry once more
      console.warn("[Triage] First question generation failed, making final retry...");
      const retryQuestion = await generateNextQuestion(1, 2);
      if (retryQuestion === "AUTH_REQUIRED") return "auth_required";
      if (retryQuestion) {
        setDynamicSteps([INITIAL_STEP, retryQuestion]);
        return "success";
      }

      console.error("[Triage] All question generation attempts exhausted");
      return "failed";
    } catch (err) {
      console.error("[Triage] First follow-up question error:", err);
      await enforceMinDelay(startTime);
      return "failed";
    } finally {
      setIsGeneratingQuestions(false);
    }
  }, [generateNextQuestion]);

  // Generate final report based on all answers
  const generateReport = useCallback(async (allAnswers: DiagnosticAnswer[]) => {
    // MEMORY LEAK FIX: Create AbortController and track it
    const controller = new AbortController();
    activeAbortControllers.current.add(controller);
    
    try {
      // Ensure user is authenticated before generating report
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        // Silently use fallback when no session
        const fallbackReport = generateLocalReport(allAnswers, petName, petSpecies);
        setReport(fallbackReport);
        setIsComplete(true);
        return;
      }

      const symptomAnswer = allAnswers.find(a => a.stepId === "symptom_description");
      const followUpAnswers = allAnswers.filter(a => a.stepId !== "symptom_description");

      // Set a timeout for the API call
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        // Check if already aborted (component unmounted)
        if (controller.signal.aborted) {
          return;
        }

        const { data, error } = await supabase.functions.invoke("triage", {
          body: {
            type: "generate-report",
            symptomDescription: symptomAnswer?.value || "",
            answers: followUpAnswers,
            petName,
            petSpecies,
          },
        });

        clearTimeout(timeoutId);

        // Don't update state if aborted (component unmounted)
        if (controller.signal.aborted) {
          return;
        }

        if (error) {
          throw error;
        }

        // Handle case where data might be null or undefined
        if (!data) {
          throw new Error("No response from triage service");
        }

        const newReport: TriageReport = {
          id: generateReportId(),
          status: data.status || "YELLOW",
          title: data.title || "Assessment Complete",
          potentialDiagnoses: data.potentialDiagnoses || [],
          clinicalSummary: data.clinicalSummary || [],
          recommendedActions: data.recommendedActions || [],
          warningSignsToWatch: data.warningSignsToWatch || [],
          knowledgeBaseReferences: data.knowledgeBaseReferences || [],
          vetCommunicationTips: data.vetCommunicationTips || [],
          medicalGlossary: data.medicalGlossary || [],
          generatedAt: new Date(),
          petName,
          petSpecies,
        };

        setReport(newReport);
        setIsComplete(true);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Don't update state if aborted
        if (controller.signal.aborted) {
          return;
        }
        throw fetchError;
      }
    } catch {
      // Don't update state if aborted (component unmounted)
      if (controller.signal.aborted) {
        return;
      }
      // Fallback to local report generation - ALWAYS generate a report
      const newReport = generateLocalReport(allAnswers, petName, petSpecies);
      setReport(newReport);
      setIsComplete(true);
    } finally {
      // MEMORY LEAK FIX: Remove controller from tracking set
      activeAbortControllers.current.delete(controller);
    }
  }, [petName, petSpecies]);

  const submitAnswer = useCallback(async (value: string | number, label?: string, isCritical?: boolean) => {
    const answer: DiagnosticAnswer = {
      stepId: currentStepData.id,
      value,
      label,
      isCritical,
    };

    const newAnswers = [...answers.filter(a => a.stepId !== currentStepData.id), answer];
    setAnswers(newAnswers);

    // Check for critical condition (but don't reveal urgency level)
    if (isCritical) {
      setCriticalWarning(`Important finding noted. Please continue the assessment.`);
    }

    // If this is the first step (symptom description), generate first follow-up question
    if (currentStep === 0 && currentStepData.id === "symptom_description") {
      const result = await generateFirstFollowUpQuestion(String(value));
      if (result === "success") {
        setCurrentStep(1);
        setTriageError(null);
      } else if (result === "auth_required") {
        setTriageError("auth_required");
      } else {
        // All question generation failed — show error, don't skip to report
        setTriageError("generation_failed");
      }
    } else {
      // Record this Q&A in conversation history for adaptive questioning
      conversationHistory.current.push({
        question: currentStepData.title.replace(/^\d+\.\s*/, ""), // Remove numbering
        answer: String(label || value),
      });

      // Check if we need more questions or if we're done
      const questionsAnswered = conversationHistory.current.length;
      
      if (questionsAnswered < TOTAL_QUESTIONS) {
        // Generate next adaptive question — NEVER fall back to static questions
        setIsGeneratingQuestions(true);
        const startTime = Date.now();
        try {
          const nextQuestion = await generateNextQuestion(questionsAnswered + 1);
          await enforceMinDelay(startTime);

          if (nextQuestion === "AUTH_REQUIRED") {
            setTriageError("auth_required");
          } else if (nextQuestion) {
            setDynamicSteps((prev) => [...prev, nextQuestion as DiagnosticStep]);
            setCurrentStep((prev) => prev + 1);
            setTriageError(null);
          } else {
            // AI exhausted all retries — generate report with what we have (enough answers to be useful)
            if (questionsAnswered >= 2) {
              console.warn(`[Triage] Could not generate question ${questionsAnswered + 1}, generating report with ${questionsAnswered} answers`);
              await generateReport(newAnswers);
            } else {
              setTriageError("generation_failed");
            }
          }
        } catch (err) {
          console.error("[Triage] Question generation error:", err);
          await enforceMinDelay(startTime);
          if (questionsAnswered >= 2) {
            await generateReport(newAnswers);
          } else {
            setTriageError("generation_failed");
          }
        } finally {
          setIsGeneratingQuestions(false);
        }
      } else {
        // All questions answered, generate final report
        setIsGeneratingQuestions(true);
        const startTime = Date.now();
        try {
          await generateReport(newAnswers);
          await enforceMinDelay(startTime);
        } catch {
          await enforceMinDelay(startTime);
          // Ensure we always show something even if everything fails
          const fallbackReport = generateLocalReport(newAnswers, petName, petSpecies);
          setReport(fallbackReport);
          setIsComplete(true);
        } finally {
          setIsGeneratingQuestions(false);
        }
      }
    }
  }, [currentStep, currentStepData, answers, generateFirstFollowUpQuestion, generateNextQuestion, generateReport, petName, petSpecies]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      // Remove the last conversation entry when going back
      if (currentStep > 1 && conversationHistory.current.length > 0) {
        conversationHistory.current.pop();
      }
      setCurrentStep(prev => prev - 1);
      setCriticalWarning(null);
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    // MEMORY LEAK FIX: Abort any pending requests when resetting
    activeAbortControllers.current.forEach(controller => {
      controller.abort();
    });
    activeAbortControllers.current.clear();
    
    setCurrentStep(0);
    setAnswers([]);
    setDynamicSteps([INITIAL_STEP]);
    setCriticalWarning(null);
    setIsComplete(false);
    setReport(null);
    setIsGeneratingQuestions(false);
    setTriageError(null);
    conversationHistory.current = [];
    symptomDescriptionRef.current = "";
    
    // Clear persisted state when user explicitly resets
    clearTriageState();
  }, []);

  const dismissCriticalWarning = useCallback(() => {
    setCriticalWarning(null);
  }, []);

  return {
    currentStep,
    totalSteps,
    progress,
    currentStepData,
    answers,
    criticalWarning,
    isComplete,
    report,
    isGeneratingQuestions,
    triageError,
    submitAnswer,
    goBack,
    reset,
    dismissCriticalWarning,
  };
}


// Local fallback report generation
function generateLocalReport(answers: DiagnosticAnswer[], petName?: string, petSpecies?: string): TriageReport {
  const hasCritical = answers.some(a => a.isCritical);
  
  let status: TriageStatus = "GREEN";
  if (hasCritical) status = "RED";
  else if (answers.some(a => a.value === "lethargic" || a.value === "rapid" || a.value === "hours")) {
    status = "YELLOW";
  }

  const titles: Record<TriageStatus, string> = {
    RED: "Emergency Care Required",
    YELLOW: "Veterinary Attention Advised",
    GREEN: "Monitor at Home",
  };

  const symptomDescription = answers.find(a => a.stepId === "symptom_description")?.value || "";

  return {
    id: generateReportId(),
    status,
    title: titles[status],
    potentialDiagnoses: hasCritical ? [
      {
        condition: "Emergency Condition",
        commonName: "Critical symptoms detected",
        likelihood: "Highly Likely" as const,
        reasoning: "Based on critical symptoms reported in assessment",
        urgency: "Immediate veterinary evaluation required"
      }
    ] : [],
    clinicalSummary: [
      `Initial concern: ${String(symptomDescription).slice(0, 100)}...`,
      ...answers.filter(a => a.stepId !== "symptom_description" && a.label).map(a => a.label!),
    ],
    recommendedActions: status === "RED" 
      ? ["Seek emergency veterinary care immediately", "Keep your pet calm", "Call ahead to the clinic"]
      : status === "YELLOW"
      ? ["Contact your veterinarian within 24 hours", "Monitor symptoms closely", "Keep notes of any changes"]
      : ["Continue monitoring", "Ensure fresh water and rest", "Schedule routine check-up if symptoms persist"],
    warningSignsToWatch: [
      "Difficulty breathing",
      "Loss of consciousness",
      "Severe lethargy",
      "Refusal to eat or drink",
    ],
    knowledgeBaseReferences: [],
    vetCommunicationTips: [],
    generatedAt: new Date(),
    petName,
    petSpecies,
  };
}
