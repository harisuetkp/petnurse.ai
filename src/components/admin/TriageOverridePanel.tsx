import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Edit3, 
  Shield, 
  ArrowRight,
  User,
  X 
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useTriageOverrides } from "@/hooks/useTriageOverrides";

interface TriageRecord {
  id: string;
  symptoms: string;
  result_status: string;
  result_summary: string | null;
  created_at: string;
  user_id: string;
}

const priorityConfig = {
  red: {
    icon: AlertTriangle,
    label: "Emergency",
    color: "text-red-400",
    bgColor: "bg-red-500/20",
  },
  yellow: {
    icon: Clock,
    label: "Urgent",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
  },
  green: {
    icon: CheckCircle,
    label: "Stable",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/20",
  },
};

export function TriageOverridePanel() {
  const [triageRecords, setTriageRecords] = useState<TriageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTriage, setSelectedTriage] = useState<TriageRecord | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPriority, setNewPriority] = useState<string>("");
  const [adminNote, setAdminNote] = useState("");

  const { overrides, createOverride, deleteOverride, isCreating, getOverrideForTriage } = useTriageOverrides();

  useEffect(() => {
    fetchRecentTriages();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel("admin-triage-overrides")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "triage_history" },
        (payload) => {
          setTriageRecords((prev) => [payload.new as TriageRecord, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRecentTriages = async () => {
    const { data, error } = await supabase
      .from("triage_history")
      .select("id, symptoms, result_status, result_summary, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      setTriageRecords(data);
    }
    setIsLoading(false);
  };

  const handleOpenOverride = (triage: TriageRecord) => {
    setSelectedTriage(triage);
    setNewPriority(triage.result_status.toLowerCase());
    setAdminNote("");
    setIsDialogOpen(true);
  };

  const handleApplyOverride = () => {
    if (!selectedTriage || !newPriority) return;
    
    createOverride({
      triageId: selectedTriage.id,
      originalPriority: selectedTriage.result_status.toLowerCase(),
      newPriority: newPriority,
      adminNote: adminNote || undefined,
    });
    
    setIsDialogOpen(false);
    setSelectedTriage(null);
  };

  const getDisplayPriority = (triage: TriageRecord) => {
    const override = getOverrideForTriage(triage.id);
    return override ? override.new_priority : triage.result_status.toLowerCase();
  };

  const hasOverride = (triageId: string) => {
    return !!getOverrideForTriage(triageId);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[hsl(222,47%,11%)] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-white text-sm">Priority Override Control</h3>
        </div>
        <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
          {overrides.length} active
        </Badge>
      </div>

      {/* Triage List */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-2">
          {triageRecords.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No recent triage assessments
            </div>
          ) : (
            triageRecords.map((triage) => {
              const displayPriority = getDisplayPriority(triage);
              const config = priorityConfig[displayPriority as keyof typeof priorityConfig] || priorityConfig.green;
              const Icon = config.icon;
              const isOverridden = hasOverride(triage.id);

              return (
                <div
                  key={triage.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isOverridden
                      ? "border-primary/50 bg-primary/5"
                      : "border-[hsl(217,33%,22%)] bg-[hsl(222,47%,11%)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg", config.bgColor)}>
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-medium", config.color)}>
                            {config.label.toUpperCase()}
                          </span>
                          {isOverridden && (
                            <Badge className="bg-primary/20 text-primary border-primary/30 text-[8px] py-0">
                              OVERRIDDEN
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(triage.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                      onClick={() => handleOpenOverride(triage)}
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      {isOverridden ? "Edit" : "Override"}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{triage.symptoms}</p>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Override Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <DialogHeader>
            <DialogTitle className="text-white">Override Triage Priority</DialogTitle>
          </DialogHeader>
          
          {selectedTriage && (
            <div className="py-4 space-y-4">
              {/* Current Info */}
              <div className="p-3 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,22%)]">
                <p className="text-xs text-slate-500 mb-1">Symptom Description</p>
                <p className="text-sm text-white">{selectedTriage.symptoms}</p>
              </div>

              {/* Priority Change Visual */}
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">Original</p>
                  <Badge className={cn(
                    "text-xs",
                    priorityConfig[selectedTriage.result_status.toLowerCase() as keyof typeof priorityConfig]?.bgColor || "bg-slate-500/20",
                    priorityConfig[selectedTriage.result_status.toLowerCase() as keyof typeof priorityConfig]?.color || "text-slate-400"
                  )}>
                    {selectedTriage.result_status.toUpperCase()}
                  </Badge>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500" />
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 mb-1">New Priority</p>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger className="w-32 h-8 bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
                      <SelectItem value="red" className="text-red-400">RED - Emergency</SelectItem>
                      <SelectItem value="yellow" className="text-amber-400">YELLOW - Urgent</SelectItem>
                      <SelectItem value="green" className="text-emerald-400">GREEN - Stable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin Note */}
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Admin Note (Optional)</label>
                <Textarea
                  placeholder="Reason for override..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  className="min-h-[80px] bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyOverride}
              disabled={isCreating || newPriority === selectedTriage?.result_status.toLowerCase()}
              className="bg-primary text-white hover:bg-primary/90"
            >
              Apply Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
