import { memo } from "react";
import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message?: string;
  variant?: "default" | "inline" | "card";
  type?: "generic" | "network" | "server" | "auth";
  onRetry?: () => void;
  className?: string;
}

const iconConfig = {
  generic: AlertCircle,
  network: WifiOff,
  server: ServerCrash,
  auth: AlertCircle,
};

const defaultMessages = {
  generic: {
    title: "Something went wrong",
    message: "We couldn't complete your request. Please try again.",
  },
  network: {
    title: "Connection issue",
    message: "Please check your internet connection and try again.",
  },
  server: {
    title: "Service unavailable",
    message: "Our servers are temporarily busy. Please try again in a moment.",
  },
  auth: {
    title: "Session expired",
    message: "Please sign in again to continue.",
  },
};

export const ErrorState = memo(function ErrorState({
  title,
  message,
  variant = "default",
  type = "generic",
  onRetry,
  className,
}: ErrorStateProps) {
  const Icon = iconConfig[type];
  const defaults = defaultMessages[type];
  const displayTitle = title || defaults.title;
  const displayMessage = message || defaults.message;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50",
          className
        )}
      >
        <div className="p-2 rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">{displayMessage}</p>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="shrink-0 h-8 px-3"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "apple-card p-6 text-center",
          className
        )}
      >
        <div className="inline-flex p-3 rounded-2xl bg-muted/50 mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{displayTitle}</h3>
        <p className="text-sm text-muted-foreground mb-4">{displayMessage}</p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="rounded-xl"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Default full-page style
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <div className="p-4 rounded-2xl bg-muted/50 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">{displayTitle}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{displayMessage}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
});
