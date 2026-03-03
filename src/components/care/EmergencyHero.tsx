import { useState } from "react";
import { AlertTriangle, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHaptics } from "@/hooks/useHaptics";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const emergencyQuestions = [
  { id: "breathing", text: "Is your pet breathing normally?", invertDanger: true },
  { id: "conscious", text: "Is your pet conscious and responsive?", invertDanger: true },
  { id: "bleeding", text: "Is there bleeding, seizure, or collapse?" },
  { id: "bloat", text: "Does the belly appear bloated and hard?" },
  { id: "toxin", text: "Has your pet ingested a toxin or poison?" },
  { id: "vomiting", text: "Severe vomiting or diarrhea (non-stop)?" },
];

type Severity = "RED" | "AMBER" | "GREEN" | null;

export function EmergencyHero() {
  const { impact, notification } = useHaptics();
  const { trackEvent } = useAnalyticsEvent();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [severity, setSeverity] = useState<Severity>(null);

  const handleStart = () => {
    impact("heavy");
    trackEvent("emergency_mode_started");
    setAnswers({});
    setSeverity(null);
    setOpen(true);
  };

  const handleAnswer = (id: string, value: boolean) => {
    impact("light");
    const next = { ...answers, [id]: value };
    setAnswers(next);
    if (Object.keys(next).length === emergencyQuestions.length) {
      evaluateSeverity(next);
    }
  };

  const evaluateSeverity = (ans: Record<string, boolean>) => {
    let dangerCount = 0;
    emergencyQuestions.forEach((q) => {
      const answer = ans[q.id];
      if (q.invertDanger && answer === false) dangerCount++;
      if (!q.invertDanger && answer === true) dangerCount++;
    });
    if (dangerCount >= 2) { notification("error"); setSeverity("RED"); }
    else if (dangerCount === 1) { notification("warning"); setSeverity("AMBER"); }
    else { notification("success"); setSeverity("GREEN"); }
    trackEvent("emergency_check_completed", { severity: dangerCount >= 2 ? "RED" : dangerCount === 1 ? "AMBER" : "GREEN" });
  };

  const currentQuestion = emergencyQuestions.find((q) => answers[q.id] === undefined);

  return (
    <>
      <motion.div
        whileTap={{ scale: 0.97 }}
        className="relative overflow-hidden rounded-[20px] shadow-lg"
        style={{
          background: "linear-gradient(135deg, hsl(0 72% 51%), hsl(0 60% 38%))",
        }}
      >
        {/* Watermark paw */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.08] text-white pointer-events-none">
          <svg width="140" height="140" viewBox="0 0 100 100" fill="currentColor">
            <ellipse cx="35" cy="28" rx="10" ry="13" />
            <ellipse cx="65" cy="28" rx="10" ry="13" />
            <ellipse cx="20" cy="50" rx="9" ry="12" />
            <ellipse cx="80" cy="50" rx="9" ry="12" />
            <ellipse cx="50" cy="68" rx="20" ry="16" />
          </svg>
        </div>

        <div className="relative z-10 p-5">
          <div className="flex items-center gap-3.5 mb-4">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0"
            >
              <AlertTriangle className="h-6 w-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Emergency Mode</h3>
              <p className="text-[13px] text-white/75 leading-snug">Immediate triage & nearby emergency care</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button
              onClick={handleStart}
              className="flex-1 bg-white text-[hsl(var(--emergency-red))] hover:bg-white/90 font-bold text-sm h-12 rounded-2xl shadow-md active:scale-[0.97] transition-transform"
            >
              Start Emergency Check
            </Button>
            <Link to="/clinic-finder" className="shrink-0">
              <Button
                variant="ghost"
                className="h-12 border border-white/25 bg-white/10 text-white hover:bg-white/20 rounded-2xl text-xs gap-1.5 px-4"
              >
                <Phone className="h-4 w-4" /> Find Vet
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--emergency-red))]" />
              Emergency Check
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 pb-8 space-y-4">
            {severity === null ? (
              currentQuestion ? (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1.5">
                      Question {Object.keys(answers).length + 1} of {emergencyQuestions.length}
                    </p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-[hsl(var(--emergency-red))] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(Object.keys(answers).length / emergencyQuestions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-base font-semibold text-foreground text-center px-4 py-2">
                    {currentQuestion.text}
                  </p>
                  <div className="flex gap-3 px-4">
                    <Button
                      onClick={() => handleAnswer(currentQuestion.id, true)}
                      className="flex-1 h-12 rounded-2xl text-base"
                      variant="outline"
                    >
                      Yes
                    </Button>
                    <Button
                      onClick={() => handleAnswer(currentQuestion.id, false)}
                      className="flex-1 h-12 rounded-2xl text-base"
                      variant="outline"
                    >
                      No
                    </Button>
                  </div>
                </motion.div>
              ) : null
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 px-2"
              >
                {severity === "RED" && (
                  <div className="rounded-2xl bg-[hsl(var(--emergency-red-bg))] border-2 border-[hsl(var(--emergency-red))] p-5 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 text-[hsl(var(--emergency-red))] mx-auto" />
                    <h3 className="text-lg font-bold text-[hsl(var(--emergency-red))]">Go to Emergency Vet NOW</h3>
                    <p className="text-sm text-foreground">Your pet may need immediate veterinary attention. Do not delay.</p>
                    <Link to="/clinic-finder" className="block">
                      <Button className="w-full bg-[hsl(var(--emergency-red))] hover:bg-[hsl(var(--emergency-red))]/90 text-white gap-2 h-12 rounded-2xl">
                        <MapPin className="h-4 w-4" /> Find Emergency Vet
                      </Button>
                    </Link>
                  </div>
                )}
                {severity === "AMBER" && (
                  <div className="rounded-2xl bg-[hsl(var(--warning-amber-bg))] border-2 border-[hsl(var(--warning-amber))] p-5 text-center space-y-3">
                    <AlertTriangle className="h-10 w-10 text-[hsl(var(--warning-amber))] mx-auto" />
                    <h3 className="text-lg font-bold text-[hsl(var(--warning-amber-foreground))]">Schedule Urgent Vet Visit</h3>
                    <p className="text-sm text-foreground">Your pet should be seen by a vet soon. Monitor closely.</p>
                    <Link to="/clinic-finder" className="block">
                      <Button className="w-full bg-[hsl(var(--warning-amber))] hover:bg-[hsl(var(--warning-amber))]/90 text-white gap-2 h-12 rounded-2xl">
                        <MapPin className="h-4 w-4" /> Find Vet Nearby
                      </Button>
                    </Link>
                  </div>
                )}
                {severity === "GREEN" && (
                  <div className="rounded-2xl bg-[hsl(var(--safe-green-bg))] border-2 border-[hsl(var(--safe-green))] p-5 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[hsl(var(--safe-green))]/20 flex items-center justify-center mx-auto">
                      <span className="text-2xl">✓</span>
                    </div>
                    <h3 className="text-lg font-bold text-[hsl(var(--safe-green))]">Monitor at Home</h3>
                    <p className="text-sm text-foreground">No immediate danger. Keep watching for changes.</p>
                    <div className="text-left space-y-2 pt-2">
                      <p className="text-xs font-semibold text-foreground">Watch for:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Loss of appetite over 24 hours</li>
                        <li>• Lethargy or unusual behavior</li>
                        <li>• Vomiting or diarrhea worsening</li>
                        <li>• Difficulty breathing or walking</li>
                      </ul>
                    </div>
                  </div>
                )}
                <Button variant="outline" onClick={() => { setSeverity(null); setAnswers({}); }} className="w-full h-12 rounded-2xl">
                  Start Over
                </Button>
              </motion.div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
