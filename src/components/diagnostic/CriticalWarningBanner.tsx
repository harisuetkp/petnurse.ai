import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CriticalWarningBannerProps {
  message: string;
  onDismiss: () => void;
}

export function CriticalWarningBanner({ message, onDismiss }: CriticalWarningBannerProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-emergency-red text-emergency-red-foreground rounded-2xl p-4 shadow-lg border-2 border-emergency-red/20 max-w-2xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-full bg-white/20 flex-shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Critical Warning</h4>
            <p className="text-sm opacity-90 mt-0.5">{message}</p>
            <p className="text-xs opacity-75 mt-2">
              Emergency veterinary care may be required. Continue assessment or seek help immediately.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-8 w-8 text-white hover:bg-white/20 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
