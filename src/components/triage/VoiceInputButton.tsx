import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export function VoiceInputButton({
  onTranscript,
  disabled,
  className,
}: VoiceInputButtonProps) {
  const { toast } = useToast();

  const {
    isListening,
    isSupported,
    transcript,
    toggleListening,
  } = useVoiceInput({
    onTranscript: (text) => {
      onTranscript(text);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Voice Input Error",
        description: error,
      });
    },
  });

  // Show live transcript feedback
  useEffect(() => {
    if (isListening && transcript) {
      // Could show a live preview here if desired
    }
  }, [isListening, transcript]);

  if (!isSupported) {
    return (
      <Button
        variant="outline"
        size="icon"
        disabled
        className={cn("shrink-0 h-12 w-12 opacity-50", className)}
        title="Voice input not supported in this browser"
      >
        <MicOff className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Button
      variant={isListening ? "destructive" : "outline"}
      size="icon"
      onClick={toggleListening}
      disabled={disabled}
      className={cn(
        "shrink-0 h-12 w-12 transition-all duration-200",
        isListening && "animate-pulse",
        className
      )}
      title={isListening ? "Stop listening" : "Start voice input"}
    >
      {isListening ? (
        <Mic className="h-5 w-5 text-white" />
      ) : (
        <Mic className="h-5 w-5" />
      )}
    </Button>
  );
}
