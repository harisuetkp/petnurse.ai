import { useState, forwardRef } from "react";
import { Calendar, Plus, Check, Trash2, Syringe, Pill, Droplets, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CareReminder } from "@/hooks/useCareReminders";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

const categoryMeta: Record<CareReminder["category"], { icon: typeof Syringe; label: string; color: string }> = {
  vaccination: { icon: Syringe, label: "Vaccination", color: "bg-primary/10 text-primary" },
  medication: { icon: Pill, label: "Medication", color: "bg-[hsl(var(--safe-green))]/10 text-[hsl(var(--safe-green))]" },
  flea_tick: { icon: Droplets, label: "Flea & Tick", color: "bg-[hsl(var(--warning-amber))]/10 text-[hsl(var(--warning-amber))]" },
  vet_appointment: { icon: Calendar, label: "Vet Visit", color: "bg-[hsl(var(--primary-accent))]/10 text-[hsl(var(--primary-accent))]" },
};

interface Props {
  upcomingReminders: CareReminder[];
  completedReminders: CareReminder[];
  isLoading: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (data: any) => void;
  isAdding: boolean;
  isLoggedIn: boolean;
}

export const CareRemindersSection = forwardRef<HTMLDivElement, Props>(function CareRemindersSection({ upcomingReminders, completedReminders, isLoading, onComplete, onDelete, onAdd, isAdding, isLoggedIn }, ref) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CareReminder["category"] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState("");
  const { trackEvent } = useAnalyticsEvent();

  const handleSubmit = () => {
    if (!title.trim() || !dueDate || !selectedCategory) return;
    trackEvent("reminder_created", { category: selectedCategory });
    onAdd({
      category: selectedCategory,
      title: title.trim(),
      notes: notes.trim() || undefined,
      dueDate,
      isRecurring,
      recurrenceDays: isRecurring ? parseInt(recurrenceDays) || 30 : undefined,
    });
    resetForm();
  };

  const resetForm = () => {
    setTitle(""); setDueDate(""); setNotes(""); setIsRecurring(false); setRecurrenceDays(""); setSelectedCategory(null); setAddOpen(false);
  };

  const getDueLabel = (dateStr: string) => {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Overdue";
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `In ${diff} days`;
    return due.toLocaleDateString();
  };

  const getDueColor = (dateStr: string) => {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "text-[hsl(var(--emergency-red))]";
    if (diff <= 3) return "text-[hsl(var(--warning-amber))]";
    return "text-muted-foreground";
  };

  if (!isLoggedIn) return null;

  return (
    <div id="reminders" ref={ref}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Reminders</h3>
        <Button variant="ghost" size="sm" className="text-xs h-7 text-primary gap-1" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {isLoading ? (
        <div className="apple-card p-6 text-center">
          <p className="text-xs text-muted-foreground">Loading...</p>
        </div>
      ) : upcomingReminders.length === 0 ? (
        <div className="apple-card p-5 text-center">
          <Bell className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No upcoming reminders</p>
          <Button variant="ghost" size="sm" className="mt-1 text-xs text-primary" onClick={() => setAddOpen(true)}>
            Add your first reminder
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {upcomingReminders.map((rem) => {
            const meta = categoryMeta[rem.category];
            const Icon = meta.icon;
            return (
              <div key={rem.id} className="apple-card p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{rem.title}</p>
                  <p className={`text-[10px] font-medium ${getDueColor(rem.due_date)}`}>
                    {getDueLabel(rem.due_date)}{rem.is_recurring && " · Recurring"}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(var(--safe-green))]" onClick={() => onComplete(rem.id)}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(rem.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {completedReminders.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Recently Completed</p>
          <div className="space-y-1.5">
            {completedReminders.slice(0, 3).map((rem) => {
              const meta = categoryMeta[rem.category];
              return (
                <div key={rem.id} className="apple-card p-2.5 flex items-center gap-2.5 opacity-50">
                  <div className={`w-7 h-7 rounded-md ${meta.color} flex items-center justify-center shrink-0`}>
                    <meta.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs text-foreground line-through flex-1 truncate">{rem.title}</p>
                  <Badge variant="secondary" className="text-[9px] h-4">Done</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Reminder Sheet */}
      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg">Add Reminder</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4 pb-6">
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Category</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(categoryMeta) as [CareReminder["category"], typeof categoryMeta["vaccination"]][]).map(([key, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={`p-2.5 rounded-xl border-2 flex items-center gap-2 transition-colors ${selectedCategory === key ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div className={`w-7 h-7 rounded-md ${meta.color} flex items-center justify-center`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-medium text-foreground">{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Title</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Rabies vaccine" className="h-10 rounded-xl" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Due Date</p>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground mb-1">Notes (optional)</p>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes..." className="h-10 rounded-xl" />
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsRecurring(!isRecurring)} className={`w-10 h-6 rounded-full transition-colors ${isRecurring ? "bg-primary" : "bg-muted"} relative`}>
                <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${isRecurring ? "translate-x-4" : "translate-x-0.5"}`} />
              </button>
              <span className="text-xs text-foreground">Recurring</span>
            </div>
            {isRecurring && (
              <Input type="number" value={recurrenceDays} onChange={(e) => setRecurrenceDays(e.target.value)} placeholder="Repeat every (days)" className="h-10 rounded-xl" />
            )}
            <Button onClick={handleSubmit} disabled={!title.trim() || !dueDate || !selectedCategory || isAdding} className="w-full h-11 rounded-xl">
              {isAdding ? "Adding..." : "Add Reminder"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
});
