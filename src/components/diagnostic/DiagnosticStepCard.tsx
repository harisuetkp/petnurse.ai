import { memo, useState, useCallback } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { InfoTooltip } from "./InfoTooltip";
import { AIProcessingIndicator } from "./AIProcessingIndicator";
import { cn } from "@/lib/utils";
import type { DiagnosticStep, DiagnosticOption } from "@/hooks/useDiagnosticEngine";

interface DiagnosticStepCardProps {
  step: DiagnosticStep;
  onAnswer: (value: string | number, label?: string, isCritical?: boolean) => void;
  onBack?: () => void;
  canGoBack: boolean;
  isLoading?: boolean;
}

export const DiagnosticStepCard = memo(function DiagnosticStepCard({ 
  step, 
  onAnswer, 
  onBack, 
  canGoBack, 
  isLoading 
}: DiagnosticStepCardProps) {
  const [sliderValue, setSliderValue] = useState(5);
  const [textValue, setTextValue] = useState("");

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextValue(e.target.value);
  }, []);

  const handleSliderChange = useCallback((val: number[]) => {
    setSliderValue(val[0]);
  }, []);

  const renderTitle = () => {
    if (step.infoTerm && step.infoDefinition) {
      const parts = step.title.split(step.infoTerm);
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}
            <InfoTooltip term={step.infoTerm} definition={step.infoDefinition} />
            {parts[1]}
          </>
        );
      }
    }
    return step.title;
  };

  const renderSubtitle = () => {
    if (!step.subtitle) return null;
    
    if (step.infoTerm && step.infoDefinition && step.subtitle.includes(step.infoTerm)) {
      const parts = step.subtitle.split(step.infoTerm);
      return (
        <p className="text-muted-foreground text-sm mt-1">
          {parts[0]}
          <InfoTooltip term={step.infoTerm} definition={step.infoDefinition} />
          {parts[1]}
        </p>
      );
    }
    return <p className="text-muted-foreground text-sm mt-1">{step.subtitle}</p>;
  };

  const renderTextArea = () => (
    <div className="mt-6 space-y-4">
      <Textarea
        value={textValue}
        onChange={handleTextChange}
        placeholder={step.placeholder}
        className="min-h-[150px] rounded-xl border-2 border-border focus:border-primary resize-none text-base"
        disabled={isLoading}
      />
      <Button
        onClick={() => onAnswer(textValue, textValue.slice(0, 50))}
        disabled={textValue.trim().length < 10 || isLoading}
        className="w-full h-12 rounded-2xl text-base"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Analyzing symptoms...
          </>
        ) : (
          "Continue"
        )}
      </Button>
      {textValue.trim().length > 0 && textValue.trim().length < 10 && (
        <p className="text-xs text-muted-foreground text-center">
          Please provide more detail (at least 10 characters)
        </p>
      )}
    </div>
  );

  const renderSingleChoice = (options: DiagnosticOption[]) => (
    <div className="grid gap-3 mt-6">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onAnswer(option.value, option.label, option.isCritical)}
          disabled={isLoading}
          className={cn(
            "w-full p-4 rounded-2xl text-left transition-all duration-200",
            "border-2 border-border hover:border-primary hover:bg-accent",
            "active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "bg-card shadow-sm",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <span className="font-medium text-foreground">{option.label}</span>
        </button>
      ))}
    </div>
  );

  const renderColorSwatch = (options: DiagnosticOption[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onAnswer(option.value, option.label, option.isCritical)}
          disabled={isLoading}
          className={cn(
            "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-200",
            "border-2 border-border hover:border-primary",
            "active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "bg-card shadow-sm",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          <div 
            className="w-12 h-12 rounded-full border-2 border-border shadow-inner"
            style={{ backgroundColor: option.color }}
          />
          <span className="text-sm font-medium text-foreground text-center">{option.label}</span>
        </button>
      ))}
    </div>
  );

  const renderSlider = () => (
    <div className="mt-8 space-y-6">
      <div className="px-2">
        <Slider
          value={[sliderValue]}
          onValueChange={handleSliderChange}
          min={step.min ?? 0}
          max={step.max ?? 10}
          step={1}
          className="w-full"
          disabled={isLoading}
        />
      </div>
      <div className="flex justify-between text-sm text-muted-foreground px-1">
        <span>No pain</span>
        <span className="font-semibold text-2xl text-foreground">{sliderValue}</span>
        <span>Severe pain</span>
      </div>
      <Button
        onClick={() => onAnswer(sliderValue, `${sliderValue}/10`, sliderValue >= 7)}
        className="w-full h-12 rounded-2xl text-base"
        disabled={isLoading}
      >
        Continue
      </Button>
    </div>
  );

  const renderInput = () => {
    switch (step.inputType) {
      case "text-area":
        return renderTextArea();
      case "single-choice":
        return step.options ? renderSingleChoice(step.options) : null;
      case "color-swatch":
        return step.options ? renderColorSwatch(step.options) : null;
      case "slider":
        return renderSlider();
      default:
        return null;
    }
  };

  // Show loading state between questions with detailed AI processing indicator
  if (isLoading && step.inputType !== "text-area") {
    return (
      <div className="animate-fade-in">
        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            disabled
            className="mb-4 -ml-2 text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}
        <AIProcessingIndicator isProcessing={true} variant="detailed" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      {canGoBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={isLoading}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      )}

      {/* Card */}
      <div className="apple-card p-6">
        <h2 className="text-xl font-semibold text-foreground leading-tight">
          {step.id === "symptom_description" ? "1. " : ""}{renderTitle()}
        </h2>
        {renderSubtitle()}
        {renderInput()}
      </div>
    </div>
  );
});
