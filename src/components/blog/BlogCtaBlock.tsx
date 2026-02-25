import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Stethoscope, MapPin, ExternalLink } from "lucide-react";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

interface BlogCtaBlockProps {
  slug?: string;
}

export function BlogCtaBlock({ slug }: BlogCtaBlockProps) {
  const { trackEvent } = useAnalyticsEvent();

  const handleTriageClick = () => {
    trackEvent("blog_cta_start_triage", { slug, cta: "start_symptom_check" });
  };

  const handleClinicClick = () => {
    trackEvent("blog_cta_find_clinic", { slug, cta: "find_clinic" });
  };

  const handleSiteClick = () => {
    trackEvent("blog_cta_visit_site", { slug, cta: "visit_petnurseai" });
  };

  return (
    <aside className="my-10 p-6 rounded-2xl border border-primary/15 bg-primary/5">
      <div className="flex items-start gap-3 mb-3">
        <Stethoscope className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-foreground leading-snug">
            Worried about your pet's symptoms?
          </h3>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            <a 
              href="https://petnurseai.com" 
              className="text-primary font-semibold hover:underline"
              onClick={handleSiteClick}
              target="_blank"
              rel="noopener noreferrer"
            >
              PetNurse AI
            </a>{" "}
            provides free, 24/7 structured triage assessments powered by clinical veterinary data. 
            Get a personalized risk assessment for your pet's exact symptoms — no login required.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mt-4 ml-8">
        <Button asChild size="sm" onClick={handleTriageClick}>
          <Link to="/triage">
            <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
            Start Free Symptom Check
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" onClick={handleClinicClick}>
          <Link to="/clinic-finder">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />
            Find a Clinic Near You
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-4 ml-8">
        Trusted by pet owners worldwide · Evidence-based clinical data ·{" "}
        <a 
          href="https://petnurseai.com" 
          className="text-primary hover:underline inline-flex items-center gap-0.5"
          target="_blank"
          rel="noopener noreferrer"
        >
          petnurseai.com <ExternalLink className="h-3 w-3" />
        </a>
      </p>
    </aside>
  );
}
