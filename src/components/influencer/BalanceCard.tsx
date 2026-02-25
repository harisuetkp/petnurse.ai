import { Wallet, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  available: number;
  lifetime: number;
}

export function BalanceCard({ available, lifetime }: BalanceCardProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Available Balance */}
      <div className="relative overflow-hidden rounded-2xl border border-safe-green/30 bg-gradient-to-br from-safe-green/5 via-card to-card dark:from-safe-green/10 dark:via-card/50 p-6">
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-safe-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-safe-green animate-pulse" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Available Balance
            </span>
          </div>
          
          <p className="text-4xl sm:text-5xl font-bold tracking-tight text-safe-green mb-2">
            ${available.toFixed(2)}
          </p>
          
          <p className="text-xs text-muted-foreground">
            Minimum $50 required for payout
          </p>
        </div>
      </div>

      {/* Lifetime Earnings */}
      <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card dark:bg-card/50 p-6">
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Lifetime Earnings
            </span>
          </div>
          
          <p className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-2">
            ${lifetime.toFixed(2)}
          </p>
          
          <p className="text-xs text-muted-foreground">
            Total paid to your bank
          </p>
        </div>
      </div>
    </div>
  );
}
