import { Syringe, Droplets, Bug, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CareReminder } from "@/hooks/useCareReminders";

interface VaccineTrackerProps {
  reminders: CareReminder[];
  onAddReminder: () => void;
  onComplete: (id: string) => void;
}

export function VaccineTracker({ reminders, onAddReminder, onComplete }: VaccineTrackerProps) {
  const vaccineReminders = reminders.filter((r) => !r.completed_at && (r.category === "vaccination" || r.category === "flea_tick"));

  const getDueLabel = (dateStr: string) => {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `In ${diff} days`;
    return due.toLocaleDateString();
  };

  const getDueColor = (dateStr: string) => {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "text-[hsl(var(--emergency-red))]";
    if (diff <= 3) return "text-[hsl(var(--warning-amber))]";
    return "text-muted-foreground";
  };

  const categoryIcon: Record<string, typeof Syringe> = {
    vaccination: Syringe,
    flea_tick: Bug,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Vaccines & Prevention</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7 text-primary gap-1" onClick={onAddReminder}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {vaccineReminders.length === 0 ? (
        <div className="apple-card p-5 text-center">
          <Syringe className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming vaccines</p>
          <Button variant="ghost" size="sm" className="mt-2 text-primary text-xs" onClick={onAddReminder}>
            Set a schedule
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {vaccineReminders.slice(0, 3).map((rem) => {
            const Icon = categoryIcon[rem.category] || Syringe;
            return (
              <div key={rem.id} className="apple-card p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[hsl(var(--safe-green))]/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-[hsl(var(--safe-green))]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{rem.title}</p>
                  <p className={`text-[10px] font-medium ${getDueColor(rem.due_date)}`}>
                    {getDueLabel(rem.due_date)}
                    {rem.is_recurring && " · Recurring"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[hsl(var(--safe-green))] hover:bg-[hsl(var(--safe-green))]/10"
                  onClick={() => onComplete(rem.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
