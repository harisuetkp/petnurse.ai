import { memo, useState, useCallback } from "react";
import { Info } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  term: string;
  definition: string;
  className?: string;
}

/**
 * InfoTooltip - Mobile-friendly tooltip for medical terms
 * Uses HoverCard for desktop (hover) and tap-to-toggle for mobile
 */
export const InfoTooltip = memo(function InfoTooltip({ 
  term, 
  definition,
  className 
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(prev => !prev);
  }, []);

  return (
    <HoverCard open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          className={cn(
            "inline-flex items-center gap-1 text-primary hover:text-primary/80",
            "transition-all duration-100 active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 rounded",
            className
          )}
        >
          <span className="text-sm font-medium underline decoration-dotted underline-offset-2">
            {term}
          </span>
          <Info className="h-3.5 w-3.5 flex-shrink-0" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center"
        className="max-w-xs p-3 bg-popover text-popover-foreground rounded-xl shadow-lg border z-50"
        sideOffset={8}
      >
        <div className="space-y-1">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
            What does this mean?
          </p>
          <p className="text-sm leading-relaxed text-foreground">{definition}</p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
});

/**
 * Inline glossary term component for reports
 */
interface GlossaryTermProps {
  term: string;
  definition: string;
}

export const GlossaryTerm = memo(function GlossaryTerm({ term, definition }: GlossaryTermProps) {
  return (
    <InfoTooltip 
      term={term} 
      definition={definition}
      className="mx-0.5"
    />
  );
});
