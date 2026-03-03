import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Heart, Sparkles, Activity, Shield, ChevronRight, ChevronLeft, PawPrint, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

interface OnboardingWizardProps {
  userId: string;
  onComplete: () => void;
}

export function OnboardingWizard({ userId, onComplete }: OnboardingWizardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [petName, setPetName] = useState("");
  const [species, setSpecies] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>(["daily"]);
  const [saving, setSaving] = useState(false);

  const toggleGoal = (id: string) => {
    setSelectedGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const handleSavePet = async () => {
    if (!petName || !species) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("pets").insert({
        owner_id: userId,
        name: petName.trim(),
        species,
        breed: breed.trim() || null,
        age: age ? parseInt(age) : null,
        weight: weight ? parseFloat(weight) : null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["user-pets"] });
      setStep(3);
    } catch {
      toast({ title: t("general.error"), description: "Failed to save pet. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const healthGoals = [
    { id: "daily", label: t("onboarding.dailyTracking"), icon: Activity, desc: t("onboarding.dailyTrackingDesc") },
    { id: "emergency", label: t("onboarding.emergencyGuidance"), icon: Shield, desc: t("onboarding.emergencyGuidanceDesc") },
    { id: "preventive", label: t("onboarding.preventiveCare"), icon: Heart, desc: t("onboarding.preventiveCareDesc") },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="max-w-md w-full space-y-8">
        {/* Progress */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
              role="progressbar"
              aria-valuenow={i <= step ? 100 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          ))}
        </div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6 animate-in fade-in duration-500">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <PawPrint className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("onboarding.welcome")}</h1>
              <p className="text-muted-foreground mt-2 leading-relaxed">{t("onboarding.welcomeDesc")}</p>
            </div>
            <div className="space-y-3 text-left">
              {[
                { icon: Activity, text: t("onboarding.track") },
                { icon: Sparkles, text: t("onboarding.triage") },
                { icon: Shield, text: t("onboarding.never") },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 apple-card p-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{text}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="w-full h-14 rounded-2xl text-base" onClick={() => setStep(1)}>
              {t("onboarding.letsGo")} <ChevronRight className="h-5 w-5 ml-1" />
            </Button>
          </div>
        )}

        {/* Step 1: Pet Details */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{t("onboarding.petDetails")}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t("onboarding.petDetailsDesc")}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="pet-name" className="text-sm font-medium text-foreground block mb-1.5">{t("onboarding.petName")} *</label>
                <Input id="pet-name" placeholder="e.g. Buddy" value={petName} onChange={(e) => setPetName(e.target.value)} className="h-12 rounded-xl" autoFocus />
              </div>
              <div>
                <label htmlFor="species" className="text-sm font-medium text-foreground block mb-1.5">{t("onboarding.species")} *</label>
                <Select value={species} onValueChange={setSpecies}>
                  <SelectTrigger id="species" className="h-12 rounded-xl"><SelectValue placeholder={t("onboarding.species")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">{t("species.dog")}</SelectItem>
                    <SelectItem value="cat">{t("species.cat")}</SelectItem>
                    <SelectItem value="bird">{t("species.bird")}</SelectItem>
                    <SelectItem value="rabbit">{t("species.rabbit")}</SelectItem>
                    <SelectItem value="other">{t("species.other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="breed" className="text-sm font-medium text-foreground block mb-1.5">{t("onboarding.breed")}</label>
                  <Input id="breed" placeholder={t("onboarding.optional")} value={breed} onChange={(e) => setBreed(e.target.value)} className="h-12 rounded-xl" />
                </div>
                <div>
                  <label htmlFor="age" className="text-sm font-medium text-foreground block mb-1.5">{t("onboarding.age")}</label>
                  <Input id="age" type="number" placeholder={t("onboarding.optional")} value={age} onChange={(e) => setAge(e.target.value)} className="h-12 rounded-xl" />
                </div>
              </div>
              <div>
                <label htmlFor="weight" className="text-sm font-medium text-foreground block mb-1.5">{t("onboarding.weight")}</label>
                <Input id="weight" type="number" placeholder={t("onboarding.optional")} value={weight} onChange={(e) => setWeight(e.target.value)} className="h-12 rounded-xl" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1 h-12 rounded-xl">
                <ChevronLeft className="h-4 w-4 mr-1" /> {t("onboarding.back")}
              </Button>
              <Button onClick={() => setStep(2)} disabled={!petName.trim() || !species} className="flex-1 h-12 rounded-xl">
                {t("onboarding.next")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Health Goals */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground">{t("onboarding.healthGoals")}</h2>
              <p className="text-muted-foreground text-sm mt-1">{t("onboarding.selectGoals", { name: petName })}</p>
            </div>
            <div className="space-y-3">
              {healthGoals.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => toggleGoal(id)}
                  className={`w-full apple-card p-4 flex items-center gap-4 text-left transition-all ${
                    selectedGoals.includes(id) ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                  }`}
                  aria-pressed={selectedGoals.includes(id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedGoals.includes(id) ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Icon className={`h-5 w-5 ${selectedGoals.includes(id) ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  {selectedGoals.includes(id) && <Check className="h-5 w-5 text-primary shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl">
                <ChevronLeft className="h-4 w-4 mr-1" /> {t("onboarding.back")}
              </Button>
              <Button onClick={handleSavePet} disabled={saving || selectedGoals.length === 0} className="flex-1 h-12 rounded-xl">
                {saving ? t("onboarding.saving") : t("onboarding.completeSetup")}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Success — drive to first value moment */}
        {step === 3 && (
          <div className="text-center space-y-6 animate-in fade-in duration-500">
            <div className="mx-auto w-20 h-20 rounded-3xl bg-safe-green/10 flex items-center justify-center">
              <Check className="h-10 w-10 text-safe-green" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">{t("onboarding.allSet")}</h2>
              <p className="text-muted-foreground mt-2">{t("onboarding.allSetDesc", { name: petName })}</p>
            </div>

            {/* Nudge to immediate value */}
            <div className="apple-card p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Your first free check</p>
              <p className="text-sm text-foreground leading-relaxed">
                Something worrying you about {petName}? Run a free health check now — it takes 30 seconds.
              </p>
            </div>

            <div className="space-y-3">
              <Button size="lg" className="w-full h-14 rounded-2xl text-base" onClick={() => { onComplete(); navigate("/triage?start=true"); }}>
                <Sparkles className="h-5 w-5 mr-2" /> Check {petName}'s Health Now
              </Button>
              <Button variant="outline" size="lg" className="w-full h-14 rounded-2xl text-base" onClick={onComplete}>
                {t("onboarding.goToDashboard")}
              </Button>
            </div>
            <Badge variant="secondary" className="text-xs">
              <Heart className="h-3 w-3 mr-1" /> {t("onboarding.proTip")}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
