import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Search,
  FileJson,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface WebhookLog {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  processed: boolean;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  processed_at: string | null;
}

export function WebhookLogsViewer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: logs = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as WebhookLog[];
    },
  });

  // Get unique event types for filter
  const eventTypes = [...new Set(logs.map(log => log.event_type))];

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesEventType = eventTypeFilter === "all" || log.event_type === eventTypeFilter;
    const matchesStatus = 
      statusFilter === "all" ||
      (statusFilter === "processed" && log.processed && !log.error_message) ||
      (statusFilter === "failed" && log.error_message) ||
      (statusFilter === "pending" && !log.processed);
    
    return matchesSearch && matchesEventType && matchesStatus;
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusIcon = (log: WebhookLog) => {
    if (log.error_message) {
      return <XCircle className="h-4 w-4 text-red-400" />;
    }
    if (log.processed) {
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    }
    return <AlertCircle className="h-4 w-4 text-amber-400" />;
  };

  const getStatusText = (log: WebhookLog) => {
    if (log.error_message) return "Failed";
    if (log.processed) return "Processed";
    return "Pending";
  };

  // Stats
  const stats = {
    total: logs.length,
    processed: logs.filter(l => l.processed && !l.error_message).length,
    failed: logs.filter(l => l.error_message).length,
    pending: logs.filter(l => !l.processed).length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] p-4">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-slate-400">Total Events</p>
        </Card>
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] p-4">
          <p className="text-2xl font-bold text-emerald-400">{stats.processed}</p>
          <p className="text-xs text-slate-400">Processed</p>
        </Card>
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] p-4">
          <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
          <p className="text-xs text-slate-400">Failed</p>
        </Card>
        <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] p-4">
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
          <p className="text-xs text-slate-400">Pending</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search event ID, type, or error..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white"
          />
        </div>
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-[200px] bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Event Types</SelectItem>
            {eventTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px] bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-[hsl(217,33%,22%)] text-slate-400 hover:text-white"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
        <Table>
          <TableHeader>
            <TableRow className="border-[hsl(217,33%,22%)] hover:bg-transparent">
              <TableHead className="text-slate-400 w-8"></TableHead>
              <TableHead className="text-slate-400">Event Type</TableHead>
              <TableHead className="text-slate-400">Event ID</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Retries</TableHead>
              <TableHead className="text-slate-400">Time</TableHead>
              <TableHead className="text-slate-400 w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading logs...
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                  No webhook logs found
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <>
                  <TableRow 
                    key={log.id} 
                    className="border-[hsl(217,33%,22%)] hover:bg-[hsl(217,33%,20%)] cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <TableCell className="text-slate-400">
                      {expandedRows.has(log.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-white">
                      {log.event_type}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-400">
                      {log.event_id.slice(0, 20)}...
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log)}
                        <span className="text-sm text-white">{getStatusText(log)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{log.retry_count}</TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <FileJson className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(log.id) && (
                    <TableRow className="border-[hsl(217,33%,22%)]">
                      <TableCell colSpan={7} className="bg-[hsl(222,47%,11%)] p-4">
                        {log.error_message && (
                          <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-xs font-medium text-red-400 mb-1">Error Message</p>
                            <p className="text-sm text-white">{log.error_message}</p>
                          </div>
                        )}
                        <p className="text-xs text-slate-400 mb-2">Payload Preview</p>
                        <pre className="text-xs text-slate-300 bg-[hsl(217,33%,17%)] p-3 rounded-lg overflow-x-auto">
                          {JSON.stringify(log.payload, null, 2).slice(0, 500)}
                          {JSON.stringify(log.payload).length > 500 && "..."}
                        </pre>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payload Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {selectedLog?.event_type} - {selectedLog?.event_id.slice(0, 30)}...
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <pre className="text-xs text-slate-300 bg-[hsl(222,47%,11%)] p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(selectedLog?.payload, null, 2)}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
