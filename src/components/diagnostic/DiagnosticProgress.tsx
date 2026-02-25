import { memo } from "react";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiagnosticProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

export const DiagnosticProgress = memo(function DiagnosticProgress({ 
  currentStep, 
  totalSteps, 
  progress 
}: DiagnosticProgressProps) {
  const { t } = useLanguage();

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">
          {t("diagnostic.stepOf", { current: currentStep + 1, total: totalSteps })}
        </span>
        <span className="text-muted-foreground">
          {t("diagnostic.complete", { percent: Math.round(progress) })}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
});
