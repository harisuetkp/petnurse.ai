import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="safe-area-top glass sticky top-0 z-40">
        <div className="flex items-center gap-4 px-5 py-4 max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-xl active:scale-[0.95]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Privacy Policy</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 py-8 max-w-2xl mx-auto">
        <div className="apple-card p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: January 2025</p>
          
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PetNurse AI collects information you provide directly, including your email address, pet profiles (name, species, breed, age, weight), and symptom descriptions entered during triage assessments.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use collected information to provide AI-powered triage assessments, maintain your pet profiles, save assessment history, process payments, and improve our services. We do not sell your personal data to third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. Data Storage & Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is stored securely using industry-standard encryption. We use Supabase for data storage and Stripe for payment processing, both of which maintain SOC 2 compliance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. AI & Machine Learning</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PetNurse AI uses artificial intelligence to analyze symptoms and provide triage recommendations. Your symptom data may be used to improve our AI models, but all data is anonymized before use in training.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Third-Party Services</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We integrate with third-party services including Stripe (payment processing), Google Maps (clinic finder), and AI providers. Each service has its own privacy policy governing data handling.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You have the right to access, correct, or delete your personal data. You may request data export or account deletion by contacting us. Premium subscribers can manage their subscription through the Stripe customer portal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Children's Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PetNurse AI is not intended for use by children under 13. We do not knowingly collect personal information from children under 13 years of age.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For privacy-related inquiries, please contact us at privacy@petnurse.ai.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
