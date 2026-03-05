import { useParams, Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SeoHead } from "@/components/seo/SeoHead";
import { BreadcrumbSchema } from "@/components/seo/BreadcrumbSchema";
import { FaqSection } from "@/components/blog/FaqSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, ArrowLeft, AlertTriangle, ChevronRight, Skull, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function slugify(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

interface FaqItem {
  question: string;
  answer: string;
}

function SymptomPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: entry, isLoading } = useQuery({
    queryKey: ["symptom-page", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("veterinary_knowledge")
        .select("*")
        .in("category", ["symptoms", "clinical_signs", "emergency", "first_aid"])
        .order("title");
      const match = data?.find((item) => slugify(item.title) === slug);
      return match || null;
    },
    staleTime: 300000,
  });

  // Related symptoms (same + adjacent categories)
  const { data: relatedSymptoms } = useQuery({
    queryKey: ["related-symptoms", entry?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("veterinary_knowledge")
        .select("title, category")
        .in("category", ["symptoms", "clinical_signs", "emergency", "first_aid"])
        .neq("id", entry!.id)
        .limit(6);
      return data || [];
    },
    enabled: !!entry,
    staleTime: 300000,
  });

  // Cross-link to toxins
  const { data: relatedToxins } = useQuery({
    queryKey: ["related-toxins-for-symptom", entry?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("veterinary_knowledge")
        .select("title")
        .eq("category", "toxicology")
        .limit(5);
      return data || [];
    },
    enabled: !!entry,
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen px-5 py-8 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Symptom not found</h1>
          <Link to="/symptoms">
            <Button variant="outline">Browse all symptoms</Button>
          </Link>
        </div>
      </div>
    );
  }

  const pageTitle = `${entry.title} in Pets — Symptoms, Causes & When to See a Vet`;
  const metaDesc = entry.content.slice(0, 155).replace(/\n/g, " ") + "…";
  const isEmergency = entry.category === "emergency";
  const sections = entry.content.split(/\n{2,}/).filter(Boolean);

  // Parse FAQs from the entry
  const faqs: FaqItem[] = Array.isArray(entry.faqs) ? (entry.faqs as unknown as FaqItem[]) : [];

  // Build schemas
  const medicalSchema = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "name": entry.title,
    "description": metaDesc,
    "url": `https://petnurseai.com/symptoms/${slug}`,
    "about": {
      "@type": "MedicalCondition",
      "name": entry.title,
    },
    "lastReviewed": entry.created_at?.split("T")[0],
    "medicalAudience": "PatientAudience",
  };

  const faqSchema = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  } : null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <SeoHead title={pageTitle} description={metaDesc} canonicalPath={`/symptoms/${slug}`} />
      <BreadcrumbSchema
        items={[
          { name: "Home", path: "/" },
          { name: "Symptoms", path: "/symptoms" },
          { name: entry.title, path: `/symptoms/${slug}` },
        ]}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(JSON.stringify(medicalSchema), { ALLOWED_TAGS: [], KEEP_CONTENT: true }) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(JSON.stringify(faqSchema), { ALLOWED_TAGS: [], KEEP_CONTENT: true }) }} />
      )}

      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="px-5 pb-3 header-pt max-w-2xl mx-auto flex items-center gap-3">
          <Link to="/symptoms">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-base font-semibold text-foreground truncate">{entry.title}</h1>
        </div>
      </header>

      <main className="px-5 max-w-2xl mx-auto mt-6 space-y-6">
        {isEmergency && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive text-sm">Emergency Condition</p>
              <p className="text-xs text-destructive/80 mt-0.5">This condition may require immediate veterinary attention.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="capitalize text-xs">
            {entry.category.replace(/_/g, " ")}
          </Badge>
          {entry.source && (
            <span className="text-xs text-muted-foreground">Source: {entry.source}</span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-foreground">{entry.title}</h1>

        <article className="prose prose-sm max-w-none">
          {sections.map((section, i) => (
            <p key={i} className="text-sm text-foreground/90 leading-relaxed mb-4">{section}</p>
          ))}
        </article>

        {/* FAQ Section */}
        {faqs.length > 0 && <FaqSection faqs={faqs} />}

        {/* CTA */}
        <div className="apple-card p-5 text-center">
          <Stethoscope className="h-8 w-8 text-primary mx-auto mb-2" />
          <h3 className="font-semibold text-foreground mb-1">Worried about your pet?</h3>
          <p className="text-xs text-muted-foreground mb-3">Get an AI-powered triage assessment in minutes.</p>
          <Link to="/triage?start=true">
            <Button className="rounded-xl">Start Free Assessment</Button>
          </Link>
        </div>

        {/* Related Symptoms & Conditions */}
        {relatedSymptoms && relatedSymptoms.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Related Symptoms & Conditions</h2>
            <div className="space-y-2">
              {relatedSymptoms.map((r) => (
                <Link
                  key={r.title}
                  to={`/symptoms/${slugify(r.title)}`}
                  className="apple-card p-3 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    {r.category === "emergency" ? (
                      <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                    ) : (
                      <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <span className="text-sm font-medium text-foreground">{r.title}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Cross-link: Related Toxins */}
        {relatedToxins && relatedToxins.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Common Pet Toxins to Watch For</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Some toxins cause similar symptoms. Check if your pet may have ingested something harmful.
            </p>
            <div className="space-y-2">
              {relatedToxins.map((t) => (
                <Link
                  key={t.title}
                  to={`/toxins/${slugify(t.title)}`}
                  className="apple-card p-3 flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2">
                    <Skull className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm font-medium text-foreground">{t.title} poisoning in pets</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default SymptomPage;
