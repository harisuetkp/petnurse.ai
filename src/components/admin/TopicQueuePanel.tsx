import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Plus,
  Trash2,
  Play,
  Loader2,
  ListOrdered,
} from "lucide-react";
import { format } from "date-fns";

interface TopicItem {
  id: string;
  title: string;
  target_keyword: string;
  pet_type: string;
  priority: number;
  status: string;
  generated_post_id: string | null;
  created_at: string;
}

export function TopicQueuePanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [newPetType, setNewPetType] = useState("both");
  const [newPriority, setNewPriority] = useState("5");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["blog-topic-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_topic_queue")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as TopicItem[];
    },
  });

  const filteredTopics = filterStatus === "all" 
    ? topics 
    : topics.filter((t) => t.status === filterStatus);

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { error } = await supabase.from("blog_topic_queue").insert({
        title: newTitle,
        target_keyword: newKeyword,
        pet_type: newPetType,
        priority: parseInt(newPriority),
        created_by: session.user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-topic-queue"] });
      toast({ title: "Topic added to queue" });
      setShowAdd(false);
      setNewTitle("");
      setNewKeyword("");
      setNewPetType("both");
      setNewPriority("5");
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_topic_queue").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-topic-queue"] });
      toast({ title: "Topic removed" });
    },
  });

  const triggerMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-blog-draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({}),
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Generation failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["blog-topic-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast({ title: "Draft generated!", description: `"${data.title}" is ready for review in Blog CMS.` });
    },
    onError: (err: any) => toast({ title: "Generation failed", description: err.message, variant: "destructive" }),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "queued": return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Queued</Badge>;
      case "drafted": return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">Drafted</Badge>;
      case "published": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Published</Badge>;
      default: return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  const queuedCount = topics.filter((t) => t.status === "queued").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ListOrdered className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-white">Topic Queue</h3>
          {queuedCount > 0 && (
            <Badge variant="secondary" className="text-xs">{queuedCount} queued</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || queuedCount === 0}
            className="border-slate-600 text-slate-300"
          >
            {triggerMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1.5" />
            )}
            Generate Now
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Topic
          </Button>
        </div>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {["all", "queued", "drafted", "published"].map((s) => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
            className={filterStatus !== s ? "border-slate-600 text-slate-400" : ""}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-slate-400 py-6 text-center text-sm">Loading topics...</p>
      ) : filteredTopics.length === 0 ? (
        <div className="text-center py-8">
          <ListOrdered className="h-8 w-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No topics found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              className="flex items-center justify-between p-3 rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)]"
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(topic.status)}
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">
                    P{topic.priority}
                  </Badge>
                  <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs capitalize">
                    {topic.pet_type}
                  </Badge>
                </div>
                <p className="text-white text-sm font-medium truncate">{topic.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keyword: {topic.target_keyword} · {format(new Date(topic.created_at), "MMM d, yyyy")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm("Remove this topic?")) deleteMutation.mutate(topic.id);
                }}
                className="text-slate-400 hover:text-red-400 h-8 w-8 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Topic Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Topic to Queue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Topic / Title Idea</Label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Why Is My Dog Vomiting Yellow Bile?"
              />
            </div>
            <div>
              <Label>Target Keyword</Label>
              <Input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="e.g. dog vomiting yellow bile"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Pet Type</Label>
                <Select value={newPetType} onValueChange={setNewPetType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dog">Dog</SelectItem>
                    <SelectItem value="cat">Cat</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority (1=highest)</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1,2,3,4,5,6,7,8,9,10].map((p) => (
                      <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => addMutation.mutate()}
              disabled={!newTitle.trim() || !newKeyword.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? "Adding..." : "Add to Queue"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
