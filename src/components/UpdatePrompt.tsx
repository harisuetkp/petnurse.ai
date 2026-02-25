import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppUpdate } from "@/hooks/useAppUpdate";

export function UpdatePrompt() {
  const { updateAvailable, applyUpdate, dismissUpdate } = useAppUpdate();

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-[70] animate-fade-in md:left-auto md:right-6 md:max-w-sm pointer-events-auto">
      <div className="bg-primary text-primary-foreground rounded-2xl p-4 shadow-xl flex items-center gap-3">
        <RefreshCw className="h-5 w-5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">Update available</p>
          <p className="text-xs opacity-90">Refresh to get the latest version</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={applyUpdate}
            className="h-8 px-3 text-xs font-medium"
          >
            Update
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={dismissUpdate}
            className="h-8 w-8 rounded-full hover:bg-primary-foreground/10"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
