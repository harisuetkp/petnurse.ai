import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Injects Organization + WebSite + dynamic AggregateRating JSON-LD structured data.
 */
export function OrganizationSchema() {
  const { data: reviewStats } = useQuery({
    queryKey: ["review-stats-seo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("customer_reviews_public")
        .select("rating")
        .eq("is_approved", true);
      if (!data || data.length === 0) return { avg: 5, count: 1 };
      const avg = data.reduce((sum, r) => sum + (r.rating || 5), 0) / data.length;
      return { avg: Math.round(avg * 10) / 10, count: data.length };
    },
    staleTime: 600000, // 10 min cache
  });

  useEffect(() => {
    const orgSchemaId = "org-jsonld";
    const webSchemaId = "website-jsonld";

    let orgScript = document.getElementById(orgSchemaId) as HTMLScriptElement | null;
    if (!orgScript) {
      orgScript = document.createElement("script");
      orgScript.id = orgSchemaId;
      orgScript.type = "application/ld+json";
      document.head.appendChild(orgScript);
    }
    orgScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PetNurse AI",
      url: "https://petnurseai.com",
      logo: "https://petnurseai.com/pwa-512x512.png",
      description: "AI-powered pet health triage and daily monitoring platform. Free 24/7 structured symptom assessments backed by clinical veterinary data.",
      contactPoint: {
        "@type": "ContactPoint",
        email: "Support@petnurseai.com",
        contactType: "customer support",
      },
      sameAs: [],
      aggregateRating: reviewStats ? {
        "@type": "AggregateRating",
        ratingValue: String(reviewStats.avg),
        reviewCount: String(reviewStats.count),
        bestRating: "5",
        worstRating: "1",
      } : undefined,
    });

    let webScript = document.getElementById(webSchemaId) as HTMLScriptElement | null;
    if (!webScript) {
      webScript = document.createElement("script");
      webScript.id = webSchemaId;
      webScript.type = "application/ld+json";
      document.head.appendChild(webScript);
    }
    webScript.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PetNurse AI",
      url: "https://petnurseai.com",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: "https://petnurseai.com/blog?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    });

    return () => {
      document.getElementById(orgSchemaId)?.remove();
      document.getElementById(webSchemaId)?.remove();
    };
  }, [reviewStats]);

  return null;
}
