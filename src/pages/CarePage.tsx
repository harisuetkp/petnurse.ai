import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, Shield, Syringe, Pill, Droplets, ChevronRight, Calendar, Plus, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCareReminders, CareReminder } from "@/hooks/useCareReminders";
import { useActivePet } from "@/contexts/ActivePetContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function CarePage() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(() => searchParams.get("add") === "true");
  const [selectedCategory, setSelectedCategory] = useState<CareReminder["category"] | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState("");
  const { toast } = useToast();
  const { activePet } = useActivePet();

  const categoryMeta: Record<CareReminder["category"], { icon: typeof Syringe; labelKey: string; color: string }> = {
    vaccination: { icon: Syringe, labelKey: "care.category.vaccination", color: "bg-primary/10 text-primary" },
    medication: { icon: Pill, labelKey: "care.category.medication", color: "bg-safe-green/10 text-safe-green" },
    flea_tick: { icon: Droplets, labelKey: "care.category.fleaTick", color: "bg-warning-amber/10 text-warning-amber" },
    vet_appointment: { icon: Calendar, labelKey: "care.category.vetAppointment", color: "bg-accent text-accent-foreground" },
  };

  const handleAddOpenChange = (open: boolean) => {
    setAddOpen(open);
    if (!open && searchParams.get("add")) {
      setSearchParams((prev) => { prev.delete("add"); return prev; }, { replace: true });
    }
  };

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
  });

  const { upcomingReminders, completedReminders, isLoading, createReminder, completeReminder, deleteReminder } =
    useCareReminders(session?.user?.id, activePet?.id);

  const handleAdd = () => {
    if (!title.trim() || !dueDate || !selectedCategory) return;
    createReminder.mutate(
      {
        petId: activePet?.id || null,
        category: selectedCategory,
        title: title.trim(),
        notes: notes.trim() || undefined,
        dueDate,
        isRecurring,
        recurrenceDays: isRecurring ? parseInt(recurrenceDays) || 30 : undefined,
      },
      {
        onSuccess: () => {
          toast({ title: t("care.reminderAdded"), description: t("care.scheduled", { title }) });
          resetForm();
        },
      }
    );
  };

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setNotes("");
    setIsRecurring(false);
    setRecurrenceDays("");
    setSelectedCategory(null);
    setAddOpen(false);
  };

  const getDueLabel = (dateStr: string) => {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return t("care.overdue");
    if (diff === 0) return t("care.today");
    if (diff === 1) return t("care.tomorrow");
    if (diff <= 7) return t("care.inDays", { days: diff });
    return due.toLocaleDateString();
  };

  const getDueColor = (dateStr: string) => {
    const due = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "text-emergency-red";
    if (diff <= 3) return "text-warning-amber";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen pb-4">
      <header className="safe-area-top px-5 pt-4 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emergency-red/10">
              <Heart className="h-5 w-5 text-emergency-red" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">{t("care.title")}</h1>
              {activePet && <p className="text-xs text-muted-foreground">{activePet.name}</p>}
            </div>
          </div>
          {session && (
            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t("general.add")}
            </Button>
          )}
        </div>
      </header>

      <div className="px-5 max-w-lg mx-auto space-y-6 mt-4">
        {/* Quick Actions */}
        <div className="apple-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">{t("care.quickActions")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/triage?start=true"
              className="p-4 rounded-2xl bg-primary/5 border border-primary/10 text-center hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <Shield className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">{t("care.symptomCheck")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("care.aiTriage")}</p>
            </Link>
            <Link
              to="/clinic-finder"
              className="p-4 rounded-2xl bg-safe-green/5 border border-safe-green/10 text-center hover:shadow-md transition-shadow active:scale-[0.98]"
            >
              <Heart className="h-6 w-6 text-safe-green mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">{t("care.findVet")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("care.nearbyClinics")}</p>
            </Link>
          </div>
        </div>

        {/* Upcoming Reminders */}
        {session && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("care.upcomingCare")}</h3>
            {isLoading ? (
              <div className="apple-card p-8 text-center">
                <p className="text-sm text-muted-foreground">{t("general.loading")}</p>
              </div>
            ) : upcomingReminders.length === 0 ? (
              <div className="apple-card p-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("care.noReminders")}</p>
                <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setAddOpen(true)}>
                  {t("care.addFirstReminder")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReminders.map((rem) => {
                  const meta = categoryMeta[rem.category];
                  const Icon = meta.icon;
                  return (
                    <div key={rem.id} className="apple-card p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl ${meta.color} flex items-center justify-center shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{rem.title}</p>
                        <p className={`text-xs font-medium ${getDueColor(rem.due_date)}`}>
                          {getDueLabel(rem.due_date)}
                          {rem.is_recurring && ` • ${t("care.recurring")}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-safe-green hover:text-safe-green hover:bg-safe-green/10"
                          onClick={() => completeReminder.mutate(rem.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteReminder.mutate(rem.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Completed */}
        {session && completedReminders.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("care.completed")}</h3>
            <div className="space-y-2">
              {completedReminders.slice(0, 5).map((rem) => {
                const meta = categoryMeta[rem.category];
                return (
                  <div key={rem.id} className="apple-card p-3 flex items-center gap-3 opacity-60">
                    <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center shrink-0`}>
                      <meta.icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-foreground line-through flex-1 truncate">{rem.title}</p>
                    <Badge variant="secondary" className="text-[10px]">{t("general.done")}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Toxicology Quick Link */}
        <Link to="/triage" className="block">
          <div className="apple-card p-4 bg-gradient-to-r from-warning-amber/5 to-warning-amber/10 border border-warning-amber/15">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{t("care.toxicologyDb")}</p>
                <p className="text-xs text-muted-foreground">{t("care.toxicologyDesc")}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </div>

      {/* Add Reminder Sheet */}
      <Sheet open={addOpen} onOpenChange={handleAddOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg">{t("care.addReminder")}</SheetTitle>
          </SheetHeader>
          <div className="space-y-5 mt-4 pb-6">
            {/* Category Picker */}
            <div>
              <p className="text-sm font-medium text-foreground mb-2">{t("care.category")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(categoryMeta) as [CareReminder["category"], typeof categoryMeta["vaccination"]][]).map(
                  ([key, meta]) => {
                    const Icon = meta.icon;
                    const isSelected = selectedCategory === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedCategory(key)}
                        className={`p-3 rounded-xl border-2 flex items-center gap-2 transition-colors ${
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{t(meta.labelKey)}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">{t("care.reminderTitle")}</p>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("care.titlePlaceholder")}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Due Date */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">{t("care.dueDate")}</p>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Notes */}
            <div>
              <p className="text-sm font-medium text-foreground mb-1.5">{t("care.notes")}</p>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("care.notesPlaceholder")}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Recurring */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-10 h-6 rounded-full transition-colors ${isRecurring ? "bg-primary" : "bg-muted"} relative`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${
                    isRecurring ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-foreground">{t("care.recurring")}</span>
            </div>
            {isRecurring && (
              <div>
                <p className="text-sm font-medium text-foreground mb-1.5">{t("care.repeatEvery")}</p>
                <Input
                  type="number"
                  value={recurrenceDays}
                  onChange={(e) => setRecurrenceDays(e.target.value)}
                  placeholder="30"
                  className="h-11 rounded-xl"
                />
              </div>
            )}

            <Button
              onClick={handleAdd}
              disabled={!title.trim() || !dueDate || !selectedCategory || createReminder.isPending}
              className="w-full h-12 rounded-xl"
            >
              {createReminder.isPending ? t("care.adding") : t("care.addReminderBtn")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default CarePage;
