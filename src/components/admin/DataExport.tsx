import { useState, forwardRef } from "react";
import { Download, FileSpreadsheet, Loader2, Users, Activity, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction } from "@/hooks/useAuditLog";

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  table: string;
  columns: string[];
}

const exportOptions: ExportOption[] = [
  {
    id: "users",
    name: "User Profiles",
    description: "Export all user accounts with subscription status",
    icon: Users,
    table: "profiles",
    columns: ["id", "user_id", "is_premium", "triage_count", "scan_credits", "premium_until", "created_at"],
  },
  {
    id: "triage",
    name: "Triage History",
    description: "Export all triage records and results",
    icon: Activity,
    table: "triage_history",
    columns: ["id", "user_id", "pet_id", "symptoms", "result_status", "result_summary", "next_steps", "created_at"],
  },
  {
    id: "commissions",
    name: "Influencer Commissions",
    description: "Export commission payments and status",
    icon: DollarSign,
    table: "commissions",
    columns: ["id", "influencer_id", "referral_id", "amount", "status", "source_transaction_id", "created_at", "paid_at"],
  },
];

export const DataExport = forwardRef<HTMLDivElement>(function DataExport(_, ref) {
  const { toast } = useToast();
  const [selectedExport, setSelectedExport] = useState<string>("users");
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [isExporting, setIsExporting] = useState(false);

  const convertToCSV = (data: Record<string, unknown>[], columns: string[]): string => {
    const header = columns.join(",");
    const rows = data.map(row => 
      columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return String(val);
      }).join(",")
    );
    return [header, ...rows].join("\n");
  };

  const handleExport = async () => {
    const option = exportOptions.find(o => o.id === selectedExport);
    if (!option) return;

    setIsExporting(true);
    try {
      // Use type assertion since we're dynamically querying tables
      const { data, error } = await supabase
        .from(option.table as "profiles" | "triage_history" | "commissions")
        .select(option.columns.join(","))
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = (data || []) as any as Record<string, unknown>[];

      let content: string;
      let mimeType: string;
      let fileExtension: string;

      if (format === "csv") {
        content = convertToCSV(records, option.columns);
        mimeType = "text/csv";
        fileExtension = "csv";
      } else {
        content = JSON.stringify(data, null, 2);
        mimeType = "application/json";
        fileExtension = "json";
      }

      // Create download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `petnurse_${option.id}_${new Date().toISOString().split("T")[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log the export action
      await logAdminAction({
        actionType: "data_export",
        newValues: { 
          exportType: option.id,
          format: format,
          recordCount: data?.length || 0,
        },
      });

      toast({
        title: "Export Complete",
        description: `Downloaded ${data?.length || 0} records as ${fileExtension.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const selectedOption = exportOptions.find(o => o.id === selectedExport);

  return (
    <div ref={ref} className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        {exportOptions.map((option) => (
          <Card 
            key={option.id}
            className={`cursor-pointer transition-all ${
              selectedExport === option.id 
                ? "bg-primary/10 border-primary" 
                : "bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] hover:border-slate-500"
            }`}
            onClick={() => setSelectedExport(option.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedExport === option.id ? "bg-primary/20" : "bg-[hsl(217,33%,22%)]"
                }`}>
                  <option.icon className={`h-4 w-4 ${
                    selectedExport === option.id ? "text-primary" : "text-slate-400"
                  }`} />
                </div>
                <CardTitle className="text-white text-sm">{option.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400 text-xs">
                {option.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
        <CardHeader>
          <CardTitle className="text-white text-lg">Export Settings</CardTitle>
          <CardDescription className="text-slate-400">
            Configure your data export for {selectedOption?.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Export Format</label>
            <Select value={format} onValueChange={(v) => setFormat(v as "csv" | "json")}>
              <SelectTrigger className="w-[200px] bg-[hsl(222,47%,11%)] border-[hsl(217,33%,22%)] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV (Excel compatible)
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    JSON
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Included Columns</label>
            <div className="flex flex-wrap gap-2">
              {selectedOption?.columns.map((col) => (
                <span 
                  key={col}
                  className="px-2 py-1 text-xs rounded-md bg-[hsl(222,47%,11%)] text-slate-300"
                >
                  {col}
                </span>
              ))}
            </div>
          </div>

          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-primary hover:bg-primary/90"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedOption?.name}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});
