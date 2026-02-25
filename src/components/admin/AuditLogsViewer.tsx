import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { 
  History, 
  Filter, 
  User, 
  Shield, 
  MessageSquare, 
  Download,
  UserPlus,
  ToggleLeft,
  Settings2,
  Eye,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface AuditLog {
  id: string;
  admin_id: string;
  action_type: string;
  target_id: string | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  premium_toggle: ToggleLeft,
  role_add: Shield,
  role_remove: Shield,
  message_send: MessageSquare,
  message_broadcast: MessageSquare,
  influencer_add: UserPlus,
  influencer_toggle: ToggleLeft,
  triage_rule_update: Settings2,
  data_export: Download,
  user_impersonate: Eye,
  payout_process: DollarSign,
};

const ACTION_LABELS: Record<string, string> = {
  premium_toggle: "Premium Toggle",
  role_add: "Role Added",
  role_remove: "Role Removed",
  message_send: "Message Sent",
  message_broadcast: "Broadcast Sent",
  influencer_add: "Influencer Added",
  influencer_toggle: "Influencer Toggle",
  triage_rule_update: "Triage Rule Update",
  data_export: "Data Export",
  user_impersonate: "User Impersonation",
  payout_process: "Payout Processed",
};

const ACTION_COLORS: Record<string, string> = {
  premium_toggle: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  role_add: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  role_remove: "bg-red-500/20 text-red-400 border-red-500/30",
  message_send: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  message_broadcast: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  influencer_add: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  influencer_toggle: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  triage_rule_update: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  data_export: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  user_impersonate: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  payout_process: "bg-green-500/20 text-green-400 border-green-500/30",
};

export function AuditLogsViewer() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  // Get admin emails for display
  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin-users-for-audit"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_users_for_admin");
      if (error) throw error;
      return data as { user_id: string; email: string }[];
    },
  });

  const getAdminEmail = (adminId: string) => {
    const user = adminUsers.find((u) => u.user_id === adminId);
    return user?.email || adminId.slice(0, 8) + "...";
  };

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action_type)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Admin Audit Logs</h3>
            <p className="text-sm text-slate-400">Track all administrative actions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px] bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
              <Filter className="h-4 w-4 mr-2 text-slate-400" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
              <SelectItem value="all" className="text-white hover:bg-[hsl(217,33%,22%)]">
                All Actions
              </SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action} className="text-white hover:bg-[hsl(217,33%,22%)]">
                  {ACTION_LABELS[action] || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            className="border-[hsl(217,33%,22%)] text-slate-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[hsl(217,33%,22%)] overflow-hidden">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="bg-[hsl(222,47%,11%)] sticky top-0">
              <TableRow className="border-[hsl(217,33%,22%)] hover:bg-transparent">
                <TableHead className="text-slate-400">Time</TableHead>
                <TableHead className="text-slate-400">Admin</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Target</TableHead>
                <TableHead className="text-slate-400 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-[hsl(217,33%,22%)]">
                    <TableCell colSpan={5}>
                      <div className="h-12 bg-[hsl(217,33%,17%)] animate-pulse rounded" />
                    </TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow className="border-[hsl(217,33%,22%)]">
                  <TableCell colSpan={5} className="text-center text-slate-400 py-12">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const Icon = ACTION_ICONS[log.action_type] || User;
                  return (
                    <TableRow
                      key={log.id}
                      className="border-[hsl(217,33%,22%)] hover:bg-[hsl(217,33%,17%)]"
                    >
                      <TableCell>
                        <div>
                          <p className="text-white text-sm">
                            {format(new Date(log.created_at), "MMM d, HH:mm")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-300 text-sm">
                          {getAdminEmail(log.admin_id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", ACTION_COLORS[log.action_type] || ACTION_COLORS.data_export)}>
                          <Icon className="h-3 w-3" />
                          {ACTION_LABELS[log.action_type] || log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400 text-xs font-mono">
                          {log.target_id ? log.target_id.slice(0, 12) + "..." : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="text-primary hover:text-primary/80"
                            >
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="text-white flex items-center gap-2">
                                <Icon className="h-5 w-5 text-primary" />
                                {ACTION_LABELS[log.action_type] || log.action_type}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-slate-400">Admin</p>
                                  <p className="text-white">{getAdminEmail(log.admin_id)}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400">Time</p>
                                  <p className="text-white">
                                    {format(new Date(log.created_at), "PPpp")}
                                  </p>
                                </div>
                                {log.target_id && (
                                  <div className="col-span-2">
                                    <p className="text-slate-400">Target ID</p>
                                    <p className="text-white font-mono text-xs break-all">
                                      {log.target_id}
                                    </p>
                                  </div>
                                )}
                              </div>
                              {log.previous_values && (
                                <div>
                                  <p className="text-slate-400 text-sm mb-2">Previous Values</p>
                                  <pre className="p-3 rounded-lg bg-[hsl(222,47%,11%)] text-slate-300 text-xs overflow-auto max-h-32">
                                    {JSON.stringify(log.previous_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_values && (
                                <div>
                                  <p className="text-slate-400 text-sm mb-2">New Values</p>
                                  <pre className="p-3 rounded-lg bg-[hsl(222,47%,11%)] text-emerald-400 text-xs overflow-auto max-h-32">
                                    {JSON.stringify(log.new_values, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </div>
  );
}
