import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SeoHead } from "@/components/seo/SeoHead";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, AlertTriangle, Stethoscope, Heart, Activity } from "lucide-react";

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

const categoryConfig: Record<string, { label: string; icon: typeof Stethoscope; color: string }> = {
  symptoms: { label: "Symptoms", icon: Stethoscope, color: "text-primary" },
  clinical_signs: { label: "Clinical Signs", icon: Activity, color: "text-warning-amber" },
  emergency: { label: "Emergencies", icon: AlertTriangle, color: "text-destructive" },
  first_aid: { label: "First Aid", icon: Heart, color: "text-safe-green" },
};

function SymptomsIndexPage() {
  const { data: entries, isLoading } = useQuery({
    queryKey: ["all-symptom-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("veterinary_knowledge")
        .select("title, category")
        .in("category", ["symptoms", "clinical_signs", "emergency", "first_aid"])
        .order("category")
        .order("title");
      return data || [];
    },
    staleTime: 300000,
  });

  // Group by category
  const grouped = (entries || []).reduce<Record<string, typeof entries>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category]!.push(entry);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-12">
      <SeoHead
        title="Pet Symptoms Guide — Dog & Cat Health A-Z | PetNurse AI"
        description="Browse common pet symptoms, emergencies, and first aid guides. Understand when to see a vet and get free AI-powered triage assessments for your dog or cat."
        canonicalPath="/symptoms"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Symptoms", path: "/symptoms" },
        ]}
      />

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-5 py-3 max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Pet Symptoms & Conditions</h1>
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto mt-6 space-y-8">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : (
          Object.entries(grouped).map(([category, items]) => {
            const config = categoryConfig[category] || { label: category, icon: Stethoscope, color: "text-primary" };
            const Icon = config.icon;
            return (
              <section key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <h2 className="text-base font-semibold text-foreground">{config.label}</h2>
                  <Badge variant="secondary" className="text-[10px]">{items!.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items!.map((entry) => (
                    <Link
                      key={entry.title}
                      to={`/symptoms/${slugify(entry.title)}`}
                      className="apple-card p-3.5 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <span className="text-sm font-medium text-foreground">{entry.title}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}

export default SymptomsIndexPage;
