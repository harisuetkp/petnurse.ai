import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showBack?: boolean;
  rightContent?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, icon, showBack = true, rightContent, className }: PageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Show back button unless we're on a main tab route
  const mainTabs = ["/", "/triage", "/care", "/community", "/account"];
  const isMainTab = mainTabs.includes(location.pathname);
  const shouldShowBack = showBack && !isMainTab;

  return (
    <header className={cn("sticky top-0 z-40 bg-background/90 backdrop-blur-lg border-b border-border/30", className)}>
      <div className="flex items-center gap-2 px-4 pb-2.5 max-w-lg mx-auto header-pt">
        {shouldShowBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 rounded-xl shrink-0 -ml-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-foreground leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>}
        </div>
        {rightContent}
      </div>
    </header>
  );
}
