import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ElementType;
  sparklineData?: number[];
  variant?: "default" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: {
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
    sparklineColor: "#0071E3",
  },
  success: {
    iconBg: "bg-emerald-500/20",
    iconColor: "text-emerald-400",
    sparklineColor: "#10B981",
  },
  warning: {
    iconBg: "bg-amber-500/20",
    iconColor: "text-amber-400",
    sparklineColor: "#F59E0B",
  },
  danger: {
    iconBg: "bg-red-500/20",
    iconColor: "text-red-400",
    sparklineColor: "#EF4444",
  },
};

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  sparklineData = [],
  variant = "default",
}: StatsCardProps) {
  const styles = variantStyles[variant];
  const isPositive = change && change >= 0;
  
  // Transform sparkline data for recharts
  const chartData = sparklineData.map((val, idx) => ({ value: val, idx }));

  return (
    <div className="relative overflow-hidden rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-5">
      {/* Sparkline Background */}
      {chartData.length > 0 && (
        <div className="absolute inset-0 opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={styles.sparklineColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={styles.sparklineColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="value"
                stroke={styles.sparklineColor}
                strokeWidth={1.5}
                fill={`url(#gradient-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("p-2 rounded-lg", styles.iconBg)}>
            <Icon className={cn("h-4 w-4", styles.iconColor)} />
          </div>
          {change !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
              isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}>
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{isPositive ? "+" : ""}{change}%</span>
            </div>
          )}
        </div>
        
        <p className="text-2xl font-bold text-white mb-1">{value}</p>
        <p className="text-xs text-slate-400">{title}</p>
        {changeLabel && (
          <p className="text-[10px] text-slate-500 mt-1">{changeLabel}</p>
        )}
      </div>
    </div>
  );
}
