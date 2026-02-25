import { useState, useMemo } from "react";
import { MapPin, AlertTriangle, Send, Skull, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Common pet toxins with their keywords for detection
const TOXIN_KEYWORDS: Record<string, string[]> = {
  "Chocolate": ["chocolate", "cocoa", "cacao", "brownie"],
  "Xylitol": ["xylitol", "gum", "sugar-free", "sweetener"],
  "Grapes/Raisins": ["grape", "raisin", "currant"],
  "Onions/Garlic": ["onion", "garlic", "leek", "chive", "shallot"],
  "Rat Poison": ["rat poison", "rodenticide", "mouse poison", "d-con"],
  "Antifreeze": ["antifreeze", "ethylene glycol", "coolant"],
  "Marijuana": ["marijuana", "cannabis", "thc", "edible", "weed", "pot"],
  "Medications": ["medication", "pill", "ibuprofen", "tylenol", "aspirin", "advil"],
  "Blue-green Algae": ["algae", "pond", "lake water", "blue-green"],
  "Lilies": ["lily", "lilies", "flower"],
  "Household Chemicals": ["bleach", "cleaner", "detergent", "soap"],
};

// Severity mapping for toxins
const TOXIN_SEVERITY: Record<string, "high" | "medium" | "low"> = {
  "Xylitol": "high",
  "Rat Poison": "high",
  "Antifreeze": "high",
  "Blue-green Algae": "high",
  "Chocolate": "medium",
  "Grapes/Raisins": "medium",
  "Marijuana": "medium",
  "Medications": "medium",
  "Onions/Garlic": "low",
  "Lilies": "medium",
  "Household Chemicals": "medium",
};

interface ToxinIncident {
  id: string;
  toxin: string;
  count: number;
  lastReported: string;
  severity: "high" | "medium" | "low";
  trend: "up" | "down" | "stable";
  recentSymptoms: string[];
}

interface TriageRecord {
  id: string;
  symptoms: string;
  result_status: string;
  created_at: string;
}

interface ToxinTrendingMapProps {
  onSendAlert?: (region: string, message: string) => void;
  triageHistory?: TriageRecord[];
}

// Analyze triage history to detect toxin mentions
function analyzeToxinTrends(triageHistory: TriageRecord[], daysBack: number): ToxinIncident[] {
  const cutoffDate = subDays(new Date(), daysBack);
  const previousCutoff = subDays(new Date(), daysBack * 2);
  
  // Filter to recent records
  const recentRecords = triageHistory.filter(t => 
    isAfter(new Date(t.created_at), cutoffDate)
  );
  
  const previousRecords = triageHistory.filter(t => 
    isAfter(new Date(t.created_at), previousCutoff) && 
    !isAfter(new Date(t.created_at), cutoffDate)
  );
  
  const toxinCounts: Record<string, { 
    count: number; 
    lastDate: string; 
    symptoms: string[];
    previousCount: number;
  }> = {};
  
  // Count current period
  recentRecords.forEach(record => {
    const symptomLower = record.symptoms.toLowerCase();
    
    Object.entries(TOXIN_KEYWORDS).forEach(([toxin, keywords]) => {
      if (keywords.some(keyword => symptomLower.includes(keyword))) {
        if (!toxinCounts[toxin]) {
          toxinCounts[toxin] = { 
            count: 0, 
            lastDate: record.created_at, 
            symptoms: [],
            previousCount: 0,
          };
        }
        toxinCounts[toxin].count++;
        if (new Date(record.created_at) > new Date(toxinCounts[toxin].lastDate)) {
          toxinCounts[toxin].lastDate = record.created_at;
        }
        if (toxinCounts[toxin].symptoms.length < 3) {
          toxinCounts[toxin].symptoms.push(record.symptoms.slice(0, 50));
        }
      }
    });
  });
  
  // Count previous period for trend comparison
  previousRecords.forEach(record => {
    const symptomLower = record.symptoms.toLowerCase();
    
    Object.entries(TOXIN_KEYWORDS).forEach(([toxin, keywords]) => {
      if (keywords.some(keyword => symptomLower.includes(keyword))) {
        if (toxinCounts[toxin]) {
          toxinCounts[toxin].previousCount++;
        }
      }
    });
  });
  
  // Convert to incidents array
  const incidents: ToxinIncident[] = Object.entries(toxinCounts)
    .filter(([_, data]) => data.count > 0)
    .map(([toxin, data]) => {
      let trend: "up" | "down" | "stable" = "stable";
      if (data.count > data.previousCount * 1.2) trend = "up";
      else if (data.count < data.previousCount * 0.8) trend = "down";
      
      return {
        id: toxin.toLowerCase().replace(/[^a-z]/g, "-"),
        toxin,
        count: data.count,
        lastReported: data.lastDate,
        severity: TOXIN_SEVERITY[toxin] || "medium",
        trend,
        recentSymptoms: data.symptoms,
      };
    })
    .sort((a, b) => b.count - a.count);
  
  return incidents;
}

export function ToxinTrendingMap({ onSendAlert, triageHistory = [] }: ToxinTrendingMapProps) {
  const [timeFilter, setTimeFilter] = useState<string>("7");
  const [selectedIncident, setSelectedIncident] = useState<ToxinIncident | null>(null);

  const toxinData = useMemo(() => {
    const days = parseInt(timeFilter);
    return analyzeToxinTrends(triageHistory, days);
  }, [timeFilter, triageHistory]);

  const totalIncidents = toxinData.reduce((sum, i) => sum + i.count, 0);
  const highSeverityCount = toxinData.filter((i) => i.severity === "high").length;

  const getSeverityColor = (severity: ToxinIncident["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  const getTrendIcon = (trend: ToxinIncident["trend"]) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-red-400" />;
      case "down":
        return <TrendingDown className="h-3 w-3 text-emerald-400" />;
      default:
        return <Minus className="h-3 w-3 text-slate-400" />;
    }
  };

  const handleSendAlert = (incident: ToxinIncident) => {
    const message = `⚠️ Pet Health Alert: Increased ${incident.toxin} exposure reports detected. Keep pets away from potential sources and monitor for symptoms.`;
    onSendAlert?.("ALL", message);
  };

  return (
    <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Skull className="h-4 w-4 text-red-400" />
          <h3 className="font-semibold text-white text-sm">Toxin Trending</h3>
        </div>
        <Select value={timeFilter} onValueChange={setTimeFilter}>
          <SelectTrigger className="w-24 h-7 text-xs bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <SelectItem value="1" className="text-white text-xs">24h</SelectItem>
            <SelectItem value="7" className="text-white text-xs">7 days</SelectItem>
            <SelectItem value="30" className="text-white text-xs">30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,22%)]">
          <p className="text-lg font-bold text-white">{totalIncidents}</p>
          <p className="text-[10px] text-slate-400">Toxin-Related Cases</p>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-lg font-bold text-red-400">{highSeverityCount}</p>
          <p className="text-[10px] text-slate-400">High Severity Toxins</p>
        </div>
      </div>

      {/* Incidents List */}
      <ScrollArea className="h-[280px]">
        {toxinData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <Skull className="h-8 w-8 text-slate-600 mb-3" />
            <p className="text-slate-400 text-sm">No toxin-related cases detected</p>
            <p className="text-slate-500 text-xs mt-1">
              Toxins are identified from symptom descriptions
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {toxinData.map((incident) => (
              <div
                key={incident.id}
                className={cn(
                  "p-3 rounded-lg border transition-all cursor-pointer",
                  "border-[hsl(217,33%,22%)] hover:border-primary/50",
                  selectedIncident?.id === incident.id && "border-primary bg-primary/5"
                )}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm text-white font-medium">{incident.toxin}</span>
                    {getTrendIcon(incident.trend)}
                  </div>
                  <Badge className={cn("text-[10px]", getSeverityColor(incident.severity))}>
                    {incident.severity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-300">
                      {incident.count} report{incident.count !== 1 ? "s" : ""}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Last: {format(new Date(incident.lastReported), "MMM d, h:mm a")}
                    </p>
                  </div>
                  {incident.severity === "high" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendAlert(incident);
                      }}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      <span className="text-xs">Alert</span>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selected Incident Details */}
      {selectedIncident && selectedIncident.recentSymptoms.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-[hsl(222,47%,11%)] border border-[hsl(217,33%,22%)]">
          <p className="text-xs text-slate-400 mb-2">Recent symptom excerpts:</p>
          <div className="space-y-1">
            {selectedIncident.recentSymptoms.map((symptom, i) => (
              <p key={i} className="text-xs text-slate-300 line-clamp-1">
                "{symptom}..."
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
