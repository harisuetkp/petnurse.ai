import { DollarSign, ArrowUpRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Commission {
  amount: number;
  status: string;
  date: string;
}

interface CommissionTableProps {
  commissions: Commission[];
}

export function CommissionTable({ commissions }: CommissionTableProps) {
  if (commissions.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card dark:bg-card/50">
      {/* Header */}
      <div className="grid grid-cols-3 gap-4 px-5 py-3 bg-muted/30 border-b border-border/50">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Transaction
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
          Date
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
          Status
        </span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-border/30">
        {commissions.map((commission, index) => (
          <div 
            key={index} 
            className="grid grid-cols-3 gap-4 px-5 py-4 items-center hover:bg-muted/20 transition-colors"
          >
            {/* Amount */}
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center",
                commission.status === "paid" 
                  ? "bg-safe-green/10" 
                  : "bg-warning-amber/10"
              )}>
                {commission.status === "paid" ? (
                  <ArrowUpRight className="h-4 w-4 text-safe-green" />
                ) : (
                  <Clock className="h-4 w-4 text-warning-amber" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  +${Number(commission.amount).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Commission</p>
              </div>
            </div>

            {/* Date */}
            <p className="text-sm text-muted-foreground text-center">
              {commission.date}
            </p>

            {/* Status */}
            <div className="flex justify-end">
              <span className={cn(
                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                commission.status === "paid" 
                  ? "bg-safe-green/10 text-safe-green" 
                  : "bg-warning-amber/10 text-warning-amber"
              )}>
                {commission.status === "paid" ? "Completed" : "Pending"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
