import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  variant?: "default" | "success" | "warning" | "primary";
}

const variantStyles = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    valueColor: "text-foreground",
  },
  success: {
    iconBg: "bg-safe-green/10 dark:bg-safe-green/20",
    iconColor: "text-safe-green",
    valueColor: "text-safe-green",
  },
  warning: {
    iconBg: "bg-warning-amber/10 dark:bg-warning-amber/20",
    iconColor: "text-warning-amber",
    valueColor: "text-warning-amber",
  },
  primary: {
    iconBg: "bg-primary/10 dark:bg-primary/20",
    iconColor: "text-primary",
    valueColor: "text-foreground",
  },
};

export function FinancialStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
}: FinancialStatsCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 p-5 transition-all hover:border-border hover:shadow-lg dark:bg-card/50 dark:backdrop-blur-sm">
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-muted/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative z-10">
        {/* Icon */}
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", styles.iconBg)}>
          <Icon className={cn("h-5 w-5", styles.iconColor)} />
        </div>

        {/* Value */}
        <p className={cn("text-3xl font-bold tracking-tight mb-1", styles.valueColor)}>
          {value}
        </p>

        {/* Title */}
        <p className="text-sm font-medium text-muted-foreground">{title}</p>

        {/* Trend indicator */}
        {trend !== undefined && (
          <div className={cn(
            "mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            trend >= 0 
              ? "bg-safe-green/10 text-safe-green" 
              : "bg-destructive/10 text-destructive"
          )}>
            <span>{trend >= 0 ? "↑" : "↓"}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs text-muted-foreground/70 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
