import { useState } from "react";
import { Bell, X, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Recommendation {
  id: string;
  pet_id: string | null;
  title: string;
  content: string;
  category: string;
  is_read: boolean;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  nutrition: "bg-safe-green/10 text-safe-green",
  exercise: "bg-primary/10 text-primary",
  grooming: "bg-accent text-accent-foreground",
  dental: "bg-warning-amber/10 text-warning-amber",
  preventive: "bg-primary/10 text-primary",
  mental_health: "bg-safe-green/10 text-safe-green",
  seasonal: "bg-warning-amber/10 text-warning-amber",
  general: "bg-muted text-muted-foreground",
};

export function PetRecommendations({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: recommendations = [] } = useQuery({
    queryKey: ["pet-recommendations", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pet_recommendations")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as Recommendation[];
    },
    enabled: !!userId,
  });

  const unreadCount = recommendations.filter((r) => !r.is_read).length;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("pet_recommendations").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pet-recommendations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("pet_recommendations").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pet-recommendations"] }),
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pet Care Tips
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto h-[calc(100vh-80px)] px-5 py-4 space-y-3">
          {recommendations.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Weekly tips will appear here based on your pet's profile.</p>
            </div>
          ) : (
            recommendations.map((rec) => (
              <div
                key={rec.id}
                className={`apple-card p-4 relative ${!rec.is_read ? "border-l-2 border-l-primary" : "opacity-75"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className={`text-[10px] ${categoryColors[rec.category] || categoryColors.general}`}>
                        {rec.category.replace("_", " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rec.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rec.content}</p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {!rec.is_read && (
                      <button onClick={() => markReadMutation.mutate(rec.id)} className="p-1 rounded-lg hover:bg-muted">
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                    <button onClick={() => deleteMutation.mutate(rec.id)} className="p-1 rounded-lg hover:bg-destructive/10">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
