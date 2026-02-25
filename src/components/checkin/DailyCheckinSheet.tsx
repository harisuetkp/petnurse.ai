import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useDailyCheckin } from "@/hooks/useDailyCheckin";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface DailyCheckinSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pet: { id: string; name: string; species: string };
  userId: string;
}

const MOOD_OPTIONS = [
  { value: "great", emoji: "😄", labelKey: "checkin.mood.great" },
  { value: "good", emoji: "🙂", labelKey: "checkin.mood.good" },
  { value: "okay", emoji: "😐", labelKey: "checkin.mood.okay" },
  { value: "poor", emoji: "😟", labelKey: "checkin.mood.poor" },
  { value: "bad", emoji: "😣", labelKey: "checkin.mood.bad" },
] as const;

const APPETITE_OPTIONS = [
  { value: "normal", labelKey: "checkin.appetite.normal" },
  { value: "increased", labelKey: "checkin.appetite.increased" },
  { value: "decreased", labelKey: "checkin.appetite.decreased" },
  { value: "none", labelKey: "checkin.appetite.none" },
] as const;

const ENERGY_OPTIONS = [
  { value: "high", labelKey: "checkin.energy.high" },
  { value: "normal", labelKey: "checkin.energy.normal" },
  { value: "low", labelKey: "checkin.energy.low" },
  { value: "lethargic", labelKey: "checkin.energy.lethargic" },
] as const;

const SYMPTOM_KEYS = [
  "checkin.symptom.vomiting",
  "checkin.symptom.diarrhea",
  "checkin.symptom.coughing",
  "checkin.symptom.sneezing",
  "checkin.symptom.limping",
  "checkin.symptom.scratching",
  "checkin.symptom.eyeDischarge",
  "checkin.symptom.earIssues",
  "checkin.symptom.excessiveThirst",
] as const;

export function DailyCheckinSheet({ open, onOpenChange, pet, userId }: DailyCheckinSheetProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<string>("");
  const [appetite, setAppetite] = useState<string>("");
  const [energy, setEnergy] = useState<string>("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { submitCheckin } = useDailyCheckin(userId, pet.id);
  const { trackEvent } = useAnalyticsEvent();
  const { toast } = useToast();

  const handleSubmit = async () => {
    try {
      await submitCheckin.mutateAsync({
        petId: pet.id,
        mood: mood as any,
        appetite: appetite as any,
        energy: energy as any,
        symptomsNoted: symptoms,
        notes: notes || undefined,
      });
      setSubmitted(true);
      trackEvent("daily_checkin_completed", { pet_id: pet.id, mood, appetite, energy });
      toast({ title: t("checkin.saved"), description: t("checkin.savedDesc", { name: pet.name }) });
      setTimeout(() => {
        onOpenChange(false);
        setStep(0); setMood(""); setAppetite(""); setEnergy(""); setSymptoms([]); setNotes(""); setSubmitted(false);
      }, 1500);
    } catch {
      toast({ title: t("general.error"), description: t("checkin.failedSave"), variant: "destructive" });
    }
  };

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  if (submitted) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8">
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-safe-green mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground">{t("checkin.allDone")}</h3>
            <p className="text-muted-foreground mt-2">{t("checkin.scoreUpdated", { name: pet.name })}</p>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-8 max-h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">{t("checkin.title", { name: pet.name })}</SheetTitle>
        </SheetHeader>

        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm font-medium text-foreground">{t("checkin.moodQuestion", { name: pet.name })}</p>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setMood(opt.value); setStep(1); }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all active:scale-95 ${
                    mood === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-[10px] font-medium text-muted-foreground">{t(opt.labelKey)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm font-medium text-foreground">{t("checkin.appetiteQuestion", { name: pet.name })}</p>
            <div className="space-y-2">
              {APPETITE_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setAppetite(opt.value); setStep(2); }}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all text-sm active:scale-[0.98] ${
                    appetite === opt.value ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/30"}`}>
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm font-medium text-foreground">{t("checkin.energyQuestion", { name: pet.name })}</p>
            <div className="space-y-2">
              {ENERGY_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { setEnergy(opt.value); setStep(3); }}
                  className={`w-full text-left p-3.5 rounded-xl border-2 transition-all text-sm active:scale-[0.98] ${
                    energy === opt.value ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/30"}`}>
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-sm font-medium text-foreground">{t("checkin.symptomsQuestion")}</p>
            <div className="flex flex-wrap gap-2">
              {SYMPTOM_KEYS.map(key => {
                const label = t(key);
                return (
                  <Badge key={key} variant={symptoms.includes(label) ? "default" : "outline"}
                    className="cursor-pointer text-xs py-1.5 px-3 active:scale-95"
                    onClick={() => toggleSymptom(label)}>
                    {label}
                  </Badge>
                );
              })}
            </div>
            <Textarea placeholder={t("checkin.otherNotes")} value={notes} onChange={e => setNotes(e.target.value)}
              className="resize-none" rows={2} />
            <Button onClick={handleSubmit} disabled={submitCheckin.isPending} className="w-full h-12 rounded-xl text-base font-semibold">
              {submitCheckin.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t("checkin.saving")}</>
              ) : t("checkin.saveCheckin")}
            </Button>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {[0, 1, 2, 3].map(i => (
            <button key={i} onClick={() => i < step && setStep(i)}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/40 cursor-pointer" : "w-2 bg-border"}`} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
