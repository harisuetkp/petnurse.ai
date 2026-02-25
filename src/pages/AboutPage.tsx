import { Link } from "react-router-dom";
import { SeoHead } from "@/components/seo/SeoHead";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle, AlertTriangle } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="About Pet Nurse AI – Who We Are & What We Do"
        description="Learn about Pet Nurse AI, the web app that helps pet owners understand symptoms, emergencies, and first-aid steps before visiting the vet."
        canonicalPath="/about"
      />

      <div className="max-w-2xl mx-auto px-5 py-16 space-y-12">
        {/* H1 */}
        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
            About Pet Nurse AI
          </h1>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Clear pet health guidance — powered by AI, backed by veterinary data.
          </p>
        </header>

        {/* Section 1 */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">What is Pet Nurse AI?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Pet Nurse AI is a web app that helps pet owners understand symptoms, emergencies,
            and first-aid steps before rushing to the vet. Whether it's 2 AM or a holiday weekend,
            Pet Nurse AI gives you structured triage guidance you can trust.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">Who it's for</h2>
          <p className="text-muted-foreground leading-relaxed">
            Built for busy pet parents who want clear guidance, checklists, and "when to worry"
            indicators — so you know exactly what to do next for your dog, cat, or other companion.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">What you'll find</h2>
          <ul className="space-y-2">
            {[
              "Symptom assessment guides",
              "Emergency checklists",
              "Toxin information",
              "Practical next steps for pet parents",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-muted-foreground">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Section 4 — Disclaimer */}
        <section className="apple-card p-5 space-y-2 border-l-4 border-destructive/60">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold text-foreground">Medical disclaimer</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Pet Nurse AI does not replace a veterinarian. If your pet is in danger or symptoms
            are severe, contact a vet immediately. Our guidance is informational only and should
            never delay professional care.
          </p>
        </section>

        {/* Section 5 — Contact */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p className="text-muted-foreground">
            Have questions or feedback? We'd love to hear from you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="mailto:support@petnurseai.com">
              <Button variant="outline" className="gap-2">
                <Mail className="h-4 w-4" />
                support@petnurseai.com
              </Button>
            </a>
          </div>
        </section>

        {/* Section 6 — Brand */}
        <section className="text-center pt-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground">
            Pet Nurse AI (<a href="https://petnurseai.com" className="text-primary hover:underline">petnurseai.com</a>)
          </p>
        </section>
      </div>
    </div>
  );
}
