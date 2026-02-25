import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SeoHead } from "@/components/seo/SeoHead";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Skull, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ToxinsIndexPage() {
  const { data: toxins, isLoading } = useQuery({
    queryKey: ["all-toxin-pages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("veterinary_knowledge")
        .select("title, source")
        .eq("category", "toxicology")
        .order("title");
      return data || [];
    },
    staleTime: 300000,
  });

  return (
    <div className="min-h-screen bg-background pb-12">
      <SeoHead
        title="Pet Toxins Guide — Foods & Substances Toxic to Dogs & Cats | PetNurse AI"
        description="Complete guide to common household toxins dangerous to dogs and cats. Learn what's toxic, symptoms of poisoning, and when to seek emergency vet care."
        canonicalPath="/toxins"
      />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Toxins", path: "/toxins" },
        ]}
      />

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-5 py-3 max-w-2xl mx-auto">
          <h1 className="text-lg font-semibold text-foreground">Pet Toxins & Poisons Guide</h1>
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto mt-6 space-y-6">
        <div className="bg-destructive/5 border border-destructive/15 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Skull className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground text-sm">Emergency? Call Poison Control</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ASPCA Poison Control: <strong>(888) 426-4435</strong> • Pet Poison Helpline: <strong>(855) 764-7661</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skull className="h-5 w-5 text-destructive" />
          <h2 className="text-base font-semibold text-foreground">Common Pet Toxins</h2>
          <Badge variant="secondary" className="text-[10px]">{toxins?.length || 0}</Badge>
        </div>

        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
        ) : (
          <div className="space-y-2">
            {toxins?.map((toxin) => (
              <Link
                key={toxin.title}
                to={`/toxins/${slugify(toxin.title)}`}
                className="apple-card p-3.5 flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <span className="text-sm font-medium text-foreground">{toxin.title}</span>
                  {toxin.source && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{toxin.source}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="apple-card p-5 text-center">
          <Stethoscope className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-foreground mb-1">Think your pet ate something toxic?</h3>
          <p className="text-xs text-muted-foreground mb-3">Get an instant AI-powered toxicity assessment.</p>
          <Link to="/triage?start=true">
            <Button className="rounded-xl">Start Free Assessment</Button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default ToxinsIndexPage;
