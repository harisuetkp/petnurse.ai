import { useState, useCallback } from "react";
import { Heart, ChevronDown, PawPrint } from "lucide-react";
import { PageTransition } from "@/components/PageTransition";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCareReminders } from "@/hooks/useCareReminders";
import { useActivePet } from "@/contexts/ActivePetContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useDebugTap } from "@/hooks/useDebugTap";
import { useUpgradeTriggers } from "@/hooks/useUpgradeTriggers";

import { EmergencyHero } from "@/components/care/EmergencyHero";
import { CareToolCards } from "@/components/care/CareToolCards";
import { HealthTimeline } from "@/components/care/HealthTimeline";
import { VaccineTracker } from "@/components/care/VaccineTracker";
import { ToxicityCheckerSection } from "@/components/care/ToxicityCheckerSection";
import { MedicationSafetySection } from "@/components/care/MedicationSafetySection";
import { QuickChecksCarousel } from "@/components/care/QuickChecksCarousel";
import { BehaviorCoachSection } from "@/components/care/BehaviorCoachSection";
import { CareRemindersSection } from "@/components/care/CareRemindersSection";
import { HealthInsightsDashboard } from "@/components/health/HealthInsightsDashboard";

function CarePage() {
  const { toast } = useToast();
  const { activePet, pets, setActivePetId } = useActivePet();
  const [petSelectorOpen, setPetSelectorOpen] = useState(false);
  const handleDebugTap = useDebugTap();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
  });

  const { isPremium } = useUpgradeTriggers(session?.user?.id);



  const { upcomingReminders, completedReminders, isLoading, createReminder, completeReminder, deleteReminder, reminders } =
    useCareReminders(session?.user?.id, activePet?.id);

  const handleAddReminder = useCallback((data: any) => {
    createReminder.mutate(
      { petId: activePet?.id || null, ...data },
      {
        onSuccess: () => {
          toast({ title: "Reminder added", description: `${data.title} scheduled` });
        },
      }
    );
  }, [createReminder, activePet, toast]);

  return (
    <PageTransition className="min-h-screen bg-muted">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-muted/90 backdrop-blur-xl border-b border-border/20 shadow-sm">
        <div className="flex items-center gap-2.5 px-4 pb-2.5 max-w-lg mx-auto header-pt">
          <div
            className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--primary-accent))] flex items-center justify-center shrink-0 cursor-pointer"
            onClick={handleDebugTap}
          >
            <PawPrint className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground leading-tight tracking-tight">Care</h1>
            {activePet && (
              <p className="text-[11px] text-muted-foreground leading-tight">{activePet.name}'s health dashboard</p>
            )}
          </div>
          {pets.length > 1 && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="rounded-2xl text-xs gap-1.5 h-9 border-border/50 bg-card shadow-sm"
                onClick={() => setPetSelectorOpen(!petSelectorOpen)}
              >
                <PawPrint className="h-3 w-3 text-primary" />
                {activePet?.name || "Select Pet"}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {petSelectorOpen && (
                <div className="absolute right-0 top-full mt-1.5 bg-card border border-border/50 rounded-2xl shadow-xl z-50 min-w-[150px] py-1.5 overflow-hidden">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      onClick={() => { setActivePetId(pet.id); setPetSelectorOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${pet.id === activePet?.id ? "font-semibold text-primary bg-primary/5" : "text-foreground"}`}
                    >
                      <PawPrint className="h-3 w-3" />
                      {pet.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="px-4 max-w-lg mx-auto space-y-5 pt-1 pb-28">
        {/* 1. Emergency Hero */}
        <EmergencyHero />

        {/* 2. Care Tool Cards (replaces icon grid) */}
        <CareToolCards />

        {/* 3. Health Timeline */}
        {session && (
          <HealthTimeline userId={session.user.id} petId={activePet?.id} />
        )}

        {/* 4. Vaccines & Prevention */}
        {session && (
          <VaccineTracker
            reminders={reminders}
            onAddReminder={() => { }}
            onComplete={(id) => completeReminder.mutate(id)}
          />
        )}

        {/* 5. Health Insights (Premium) */}
        {session && (
          <HealthInsightsDashboard userId={session.user.id} petId={activePet?.id} petName={activePet?.name} />
        )}

        {/* 6. Toxicity Checker */}
        <ToxicityCheckerSection petSpecies={activePet?.species} isPremium={isPremium} />

        {/* 7. Medication Safety */}
        <MedicationSafetySection pet={activePet} isPremium={isPremium} />

        {/* 8. Quick "Is This Normal?" Checks */}
        <QuickChecksCarousel isPremium={isPremium} />

        {/* 9. Behavior Coach */}
        <BehaviorCoachSection isPremium={isPremium} petSpecies={activePet?.species} />

        {/* 9. Reminders */}
        {session && (
          <CareRemindersSection
            upcomingReminders={upcomingReminders}
            completedReminders={completedReminders}
            isLoading={isLoading}
            onComplete={(id) => completeReminder.mutate(id)}
            onDelete={(id) => deleteReminder.mutate(id)}
            onAdd={handleAddReminder}
            isAdding={createReminder.isPending}
            isLoggedIn={!!session}
          />
        )}
      </div>
    </PageTransition>
  );
}

export default CarePage;
