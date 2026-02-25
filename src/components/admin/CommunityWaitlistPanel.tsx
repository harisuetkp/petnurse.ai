import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminAction } from "@/hooks/useAuditLog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Users, Crown, Trash2, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";

export function CommunityWaitlistPanel({ isReadOnly = false }: { isReadOnly?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_waitlist")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 15000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("community_waitlist")
        .delete()
        .in("id", ids);
      if (error) throw error;
      await logAdminAction({
        actionType: "waitlist_remove",
        newValues: { removed_count: ids.length },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-waitlist"] });
      setSelectedIds(new Set());
      toast({ title: "Removed", description: "Entries removed from waitlist." });
    },
  });

  const filtered = entries.filter((e) => {
    const matchSearch = !search || e.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "premium" && e.premium_status) ||
      (filter === "free" && !e.premium_status);
    return matchSearch && matchFilter;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleExport = () => {
    const csv = ["Email,Premium,Joined"]
      .concat(filtered.map((e) => `${e.email},${e.premium_status},${e.created_at}`))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-white">Community Waitlist</h2>
          <Badge className="bg-primary/20 text-primary border-primary/30">
            {entries.length} total
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="border-slate-600 text-slate-300 hover:bg-slate-800">
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          {!isReadOnly && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(Array.from(selectedIds))}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Remove ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white placeholder:text-slate-500"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36 bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)] text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
            <SelectItem value="all" className="text-white">All</SelectItem>
            <SelectItem value="premium" className="text-white">Premium</SelectItem>
            <SelectItem value="free" className="text-white">Free</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-[hsl(217,33%,22%)] overflow-hidden">
        <Table>
          <TableHeader className="bg-[hsl(222,47%,11%)]">
            <TableRow className="border-[hsl(217,33%,22%)] hover:bg-transparent">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-600"
                  aria-label="Select all waitlist entries"
                />
              </TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-[hsl(217,33%,22%)]">
                  <TableCell colSpan={4}>
                    <div className="h-10 bg-[hsl(217,33%,17%)] animate-pulse rounded" />
                  </TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow className="border-[hsl(217,33%,22%)]">
                <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                  No waitlist entries found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id} className="border-[hsl(217,33%,22%)] hover:bg-[hsl(217,33%,17%)]">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      className="rounded border-slate-600"
                      aria-label={`Select ${entry.email}`}
                    />
                  </TableCell>
                  <TableCell className="text-white font-medium">{entry.email}</TableCell>
                  <TableCell>
                    {entry.premium_status ? (
                      <Badge className="bg-primary/20 text-primary border-primary/30">
                        <Crown className="h-3 w-3 mr-1" /> Premium
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-slate-600 text-slate-400">Free</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">
                    {format(new Date(entry.created_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
