import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="glass sticky top-0 z-40">
        <div className="px-5 pb-3 header-pt flex items-center justify-between max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl active:scale-[0.95]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">Terms of Service</h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-5 py-8 max-w-2xl mx-auto">
        <div className="apple-card p-6 space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: January 2025</p>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              By accessing or using PetNurse AI, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">2. Medical Disclaimer</h2>
            <div className="p-4 rounded-xl bg-warning-amber-bg border border-warning-amber/20">
              <p className="text-sm font-medium text-foreground leading-relaxed">
                ⚠️ IMPORTANT: PetNurse AI provides triage guidance only and is NOT a substitute for professional veterinary care. The AI-generated assessments are informational tools to help prioritize symptoms, not medical diagnoses. Always consult a licensed veterinarian for medical advice, diagnosis, or treatment. In case of emergency, seek immediate veterinary care regardless of any assessment provided by this application.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">3. User Accounts</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information when creating an account.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">4. Subscription & Payments</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Premium features require a paid subscription or one-time purchase. Subscriptions auto-renew monthly unless cancelled. Refunds are handled according to our refund policy and applicable law. Payment processing is handled securely by Stripe.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You agree not to misuse the service, attempt to gain unauthorized access, or use the application for any unlawful purpose. You must not rely solely on PetNurse AI assessments for emergency medical decisions.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              PetNurse AI and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service. Our total liability shall not exceed the amount you paid for the service in the past 12 months.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">7. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              All content, features, and functionality of PetNurse AI are owned by us and protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without permission.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">8. Termination</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We reserve the right to suspend or terminate your account for violation of these terms. You may delete your account at any time through the app settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">9. Changes to Terms</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the application after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">10. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at legal@petnurse.ai.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
