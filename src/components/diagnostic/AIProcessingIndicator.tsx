import { memo, useState, useEffect, forwardRef } from "react";
import { Brain, Database, Stethoscope, FileSearch, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProcessingStep {
  id: string;
  label: string;
  icon: React.ElementType;
  duration: number;
}

const PROCESSING_STEPS: ProcessingStep[] = [
  { id: "analyzing", label: "Analyzing symptoms...", icon: Brain, duration: 1500 },
  { id: "database", label: "Cross-referencing toxicology database...", icon: Database, duration: 1200 },
  { id: "clinical", label: "Reviewing clinical guidelines...", icon: FileSearch, duration: 1000 },
  { id: "diagnosis", label: "Generating differential diagnoses...", icon: Stethoscope, duration: 1500 },
];

interface AIProcessingIndicatorProps {
  isProcessing: boolean;
  variant?: "minimal" | "detailed";
}

export const AIProcessingIndicator = memo(forwardRef<HTMLDivElement, AIProcessingIndicatorProps>(function AIProcessingIndicator({
  isProcessing,
  variant = "detailed",
}, ref) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStepIndex(0);
      setCompletedSteps([]);
      return;
    }

    let totalTime = 0;
    const timers: NodeJS.Timeout[] = [];

    PROCESSING_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStepIndex(index);
        if (index > 0) {
          setCompletedSteps((prev) => [...prev, PROCESSING_STEPS[index - 1].id]);
        }
      }, totalTime);
      timers.push(timer);
      totalTime += step.duration;
    });

    // Mark last step as completed
    const finalTimer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, PROCESSING_STEPS[PROCESSING_STEPS.length - 1].id]);
    }, totalTime);
    timers.push(finalTimer);

    return () => timers.forEach(clearTimeout);
  }, [isProcessing]);

  if (!isProcessing) return null;

  if (variant === "minimal") {
    const currentStep = PROCESSING_STEPS[currentStepIndex];
    return (
      <div ref={ref} className="flex items-center gap-2 text-sm text-muted-foreground animate-fade-in">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span>{currentStep?.label}</span>
      </div>
    );
  }

  return (
    <div ref={ref} className="apple-card p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="relative">
          <Brain className="h-6 w-6 text-primary" />
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary rounded-full animate-pulse" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">AI Analysis in Progress</h3>
          <p className="text-xs text-muted-foreground">Please wait while we analyze...</p>
        </div>
      </div>

      <div className="space-y-3">
        {PROCESSING_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = index === currentStepIndex && !isCompleted;
          const isPending = index > currentStepIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all duration-300",
                isCompleted && "bg-primary/10",
                isCurrent && "bg-accent border border-primary/20",
                isPending && "opacity-40"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg transition-colors duration-300",
                  isCompleted && "bg-primary/20",
                  isCurrent && "bg-primary/10",
                  isPending && "bg-muted"
                )}
              >
                {isCurrent ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isCompleted ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  isCompleted && "text-primary",
                  isCurrent && "text-foreground",
                  isPending && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
              {isCompleted && (
                <svg
                  className="h-4 w-4 text-primary ml-auto animate-scale-in"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}));
