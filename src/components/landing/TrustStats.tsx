import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Users, Activity, Star } from "lucide-react";

export function TrustStats() {
  const { data: assessmentCount = 0 } = useQuery({
    queryKey: ["total-assessments-landing"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_total_assessment_count");
      return data ?? 0;
    },
    staleTime: 60000,
  });

  const displayCount = assessmentCount > 100 ? `${Math.floor(assessmentCount / 100) * 100}+` : assessmentCount > 0 ? `${assessmentCount}+` : "5,000+";

  const stats = [
    { icon: Activity, value: displayCount, label: "Assessments run" },
    { icon: Star, value: "4.9/5", label: "User rating" },
    { icon: Shield, value: "Evidence", label: "Vet-informed AI" },
    { icon: Users, value: "24/7", label: "Always available" },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="apple-card p-3 text-center">
          <stat.icon className="h-4 w-4 text-primary mx-auto mb-1.5" />
          <p className="text-sm font-bold text-foreground">{stat.value}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
