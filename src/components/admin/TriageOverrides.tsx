import { useState } from "react";
import { Settings2, AlertTriangle, TrendingUp, Edit3, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface ConfusionPoint {
  id: string;
  symptom: string;
  currentBehavior: string;
  suggestedFix: string;
  occurrences: number;
  trend: "up" | "down" | "stable";
}

// Simulated confusion points - in production, this would come from AI analysis
const MOCK_CONFUSION_POINTS: ConfusionPoint[] = [
  {
    id: "1",
    symptom: "Mild lethargy after eating",
    currentBehavior: "Marking as YELLOW (Urgent)",
    suggestedFix: "Should be GREEN unless combined with vomiting",
    occurrences: 45,
    trend: "up",
  },
  {
    id: "2",
    symptom: "Single episode of vomiting (no blood)",
    currentBehavior: "Marking as YELLOW (Urgent)",
    suggestedFix: "Could be GREEN for adult dogs with normal behavior otherwise",
    occurrences: 32,
    trend: "stable",
  },
  {
    id: "3",
    symptom: "Reverse sneezing in brachycephalic breeds",
    currentBehavior: "Marking as RED (Emergency)",
    suggestedFix: "Should be YELLOW with breathing advisory",
    occurrences: 18,
    trend: "down",
  },
  {
    id: "4",
    symptom: "Eating grass",
    currentBehavior: "Marking as YELLOW (Urgent)",
    suggestedFix: "Should be GREEN - normal canine behavior",
    occurrences: 67,
    trend: "up",
  },
];

interface TriageOverridesProps {
  onUpdatePrompt?: (promptAddition: string) => void;
}

export function TriageOverrides({ onUpdatePrompt }: TriageOverridesProps) {
  const [confusionPoints] = useState<ConfusionPoint[]>(MOCK_CONFUSION_POINTS);
  const [editingPoint, setEditingPoint] = useState<ConfusionPoint | null>(null);
  const [customRule, setCustomRule] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleApplyFix = (point: ConfusionPoint) => {
    const promptAddition = `\n\nIMPORTANT OVERRIDE: When the symptom "${point.symptom}" is reported, ${point.suggestedFix}. Do not over-escalate this condition.`;
    onUpdatePrompt?.(promptAddition);
  };

  const handleSaveCustomRule = () => {
    if (customRule.trim()) {
      onUpdatePrompt?.(`\n\nCUSTOM RULE: ${customRule}`);
      setCustomRule("");
      setIsDialogOpen(false);
    }
  };

  const getTrendIcon = (trend: ConfusionPoint["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-red-400" />;
      case "down":
        return <TrendingUp className="h-3 w-3 text-emerald-400 rotate-180" />;
      default:
        return <div className="h-3 w-3 bg-slate-500 rounded-full" />;
    }
  };

  return (
    <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-white text-sm">Triage Overrides</h3>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-primary/50 text-primary hover:bg-primary/10"
          onClick={() => setIsDialogOpen(true)}
        >
          <Edit3 className="h-3 w-3 mr-1" />
          Add Rule
        </Button>
      </div>

      {/* Confusion Points */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-3">
          {confusionPoints.map((point) => (
            <div
              key={point.id}
              className="p-3 rounded-lg border border-[hsl(217,33%,22%)] bg-[hsl(222,47%,11%)]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-sm text-white font-medium">{point.symptom}</span>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(point.trend)}
                  <span className="text-[10px] text-slate-400">{point.occurrences} cases</span>
                </div>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                    Current
                  </Badge>
                  <span className="text-xs text-slate-400">{point.currentBehavior}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Suggested
                  </Badge>
                  <span className="text-xs text-slate-300">{point.suggestedFix}</span>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full h-7 text-xs bg-primary/20 text-primary hover:bg-primary/30"
                onClick={() => handleApplyFix(point)}
              >
                Apply Fix to AI Prompt
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Custom Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <DialogHeader>
            <DialogTitle className="text-white">Add Custom Triage Rule</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter a custom rule to add to the AI triage system. E.g., 'When evaluating cats with respiratory symptoms, always ask about recent exposure to scented products.'"
              value={customRule}
              onChange={(e) => setCustomRule(e.target.value)}
              className="min-h-[120px] bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white placeholder:text-slate-500"
            />
            <p className="text-[10px] text-slate-500 mt-2">
              This rule will be appended to the AI system prompt for all future triage sessions.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCustomRule}
              disabled={!customRule.trim()}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
