import { useState, useEffect, forwardRef } from "react";
import { Crown, Check, Stethoscope, Camera, FileText, Zap, Loader2, Settings, Sparkles, Shield, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import petnurseLogo from "@/assets/petnurse-logo-v2.png";
import { PromoCodeInput } from "@/components/premium/PromoCodeInput";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { usePurchases } from "@/hooks/usePurchases";
import { SeoHead } from "@/components/seo/SeoHead";

const features = [
  {
    icon: Stethoscope,
    title: "Structured Triage Analysis",
    description: "Unlimited AI-powered symptom assessment with risk stratification",
  },
  {
    icon: Camera,
    title: "Toxicology Database Check",
    description: "Cross-reference substances against veterinary toxicology data",
  },
  {
    icon: FileText,
    title: "Exportable Clinical Reports",
    description: "Download structured triage reports to share with your veterinarian",
  },
  {
    icon: Zap,
    title: "Priority Access",
    description: "Faster processing and priority access to system updates",
  },
];

const comparisonFeatures = [
  { name: "Daily Health Monitoring", free: "✓", premium: "✓" },
  { name: "Health Timeline", free: "✓", premium: "✓" },
  { name: "AI Triage Assessment", free: "2 free", premium: "Unlimited" },
  { name: "Toxicology Database", free: "—", premium: "✓" },
  { name: "Clinical Report Export", free: "—", premium: "✓" },
  { name: "Community (Early Access)", free: "Join waitlist", premium: "Priority access" },
  { name: "Priority Support", free: "—", premium: "✓" },
];

const yearlyBenefits = [
  "Unlimited structured triage assessments",
  "Toxicology database cross-referencing",
  "Exportable clinical reports for vet visits",
  "Full longitudinal health timeline",
  "Priority support",
  "Early access to system updates",
  "7-day FREE trial included",
];

const monthlyBenefits = [
  "Unlimited structured triage assessments",
  "Toxicology database cross-referencing",
  "Exportable clinical reports for vet visits",
  "Full longitudinal health timeline",
  "Priority support",
];

const oneTimeBenefits = [
  "Unlock current triage assessment",
  "Full clinical analysis details",
  "Monitoring recommendations",
  "Exportable report included",
];

const PremiumPage = forwardRef<HTMLDivElement>(function PremiumPage(_props, ref) {
  const { toast } = useToast();
  const { purchase, restore, isLoading: purchaseLoading, isNativeIAP } = usePurchases();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  
  const { referralCode, influencerId, setInfluencerForCheckout, clearReferral } = useReferralTracking();
  const [appliedInfluencerId, setAppliedInfluencerId] = useState<string | null>(influencerId);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);

  const isLoading = purchaseLoading !== null;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email || "" });
          const { data, error } = await supabase.functions.invoke("check-subscription");
          if (!error && data) {
            setIsPremium(data.isPremium);
            setSubscriptionEnd(data.subscriptionEnd);
          }
        } else {
          setUser(null);
          setIsPremium(false);
          setSubscriptionEnd(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || "" });
        supabase.functions.invoke("check-subscription").then(({ data, error }) => {
          if (!error && data) {
            setIsPremium(data.isPremium);
            setSubscriptionEnd(data.subscriptionEnd);
          }
        });
      }
    });
    
    if (referralCode && !appliedInfluencerId) {
      validateReferralCode(referralCode);
    }

    return () => subscription.unsubscribe();
  }, [referralCode, appliedInfluencerId]);

  const validateReferralCode = async (code: string) => {
    const { data } = await supabase.functions.invoke("validate-promo", {
      body: { promoCode: code },
    });
    if (data?.valid) {
      setAppliedInfluencerId(data.influencerId);
      setDiscountPercent(data.discountPercent);
      setInfluencerForCheckout(data.influencerId);
    }
  };

  const handlePromoCodeValid = (infId: string, discount: number) => {
    setAppliedInfluencerId(infId);
    setDiscountPercent(discount);
    setInfluencerForCheckout(infId);
  };

  const handlePromoCodeClear = () => {
    setAppliedInfluencerId(null);
    setDiscountPercent(null);
    clearReferral();
  };

  const handleCheckout = async (priceType: "yearly" | "subscription" | "oneTime") => {
    const mapped: "yearly" | "monthly" | "oneTime" = priceType === "subscription" ? "monthly" : priceType === "oneTime" ? "oneTime" : "yearly";
    await purchase(mapped, appliedInfluencerId);
  };

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({
        title: "Error",
        description: "Failed to open subscription management. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  return (
    <div ref={ref} className="min-h-screen">
      <SeoHead
        title="PetNurse AI Premium — Unlimited Triage & Clinical Reports"
        description="Upgrade to PetNurse AI Premium for unlimited AI triage assessments, toxicology checks, exportable clinical reports, and priority support. 7-day free trial."
        canonicalPath="/premium"
      />
      {/* Header */}
      <header className="safe-area-top glass sticky top-0 z-40">
        <div className="flex items-center gap-4 px-5 py-4 max-w-2xl mx-auto">
          <img src={petnurseLogo} alt="PetNurse AI" className="h-12 w-12 rounded-2xl object-cover" />
          <h1 className="text-lg font-semibold text-foreground">Premium</h1>
        </div>
      </header>

      <div className="px-5 py-8 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-10">
          <img src={petnurseLogo} alt="PetNurse AI" className="h-24 w-24 rounded-3xl object-cover mx-auto mb-6 shadow-lg" />
          <Badge className="mb-5 bg-gradient-to-r from-warning-amber to-warning-amber/80 text-card border-0 rounded-lg px-4 py-1.5 text-sm font-medium">
            {isPremium ? "Premium Active" : "Peace of Mind Plan"}
          </Badge>
          <h2 className="text-3xl font-semibold text-foreground mb-3">
            {isPremium ? "Full Access Active" : "Structured AI Triage System"}
          </h2>
          <p className="text-muted-foreground text-lg">
            {isPremium 
              ? subscriptionEnd 
                ? `Your access renews ${new Date(subscriptionEnd).toLocaleDateString()}` 
                : "Full access to all clinical assessment features"
              : "Complete symptom analysis, risk stratification, and evidence-informed guidance"
            }
          </p>
          {isPremium && (
            <Button variant="outline" className="mt-4" onClick={handleManageSubscription} disabled={isLoadingPortal}>
              {isLoadingPortal ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Settings className="h-4 w-4 mr-2" />}
              Manage Subscription
            </Button>
          )}
        </div>

        {/* Urgency Banner */}
        {!isPremium && (
          <div className="flex items-center justify-center gap-2 bg-warning-amber/10 border border-warning-amber/20 rounded-xl px-4 py-2.5 mb-4">
            <Sparkles className="h-4 w-4 text-warning-amber" />
            <span className="text-sm font-semibold text-warning-amber">Limited offer: Save 60% with annual plan</span>
          </div>
        )}

        {/* Authority markers */}
        <div className="flex items-center justify-center gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5" />
            Secure & encrypted
          </span>
          <span>·</span>
          <span>5,000+ assessments completed</span>
          <span>·</span>
          <span>Evidence-informed</span>
        </div>

        {/* Testimonial */}
        <div className="mb-6 apple-card p-4 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-2">
            {[1,2,3,4,5].map(i => <span key={i} className="text-warning-amber text-sm">★</span>)}
          </div>
          <p className="text-sm text-foreground italic leading-relaxed">
            "The structured report identified early warning signs and gave my vet a clear timeline of symptoms to review."
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">— Sarah M., verified user</p>
        </div>

        {/* Promo Code */}
        <div className="mb-6">
          <PromoCodeInput 
            onValidCode={handlePromoCodeValid}
            onClear={handlePromoCodeClear}
            disabled={isPremium}
            initialCode={referralCode}
            initialValidated={!!appliedInfluencerId && !!referralCode}
            initialDiscount={discountPercent}
          />
          {discountPercent && (
            <p className="text-sm text-safe-green mt-2 text-center">
              🎉 {discountPercent}% discount will be applied!
            </p>
          )}
        </div>

        {/* Pricing Options */}
        <div className="space-y-4 mb-10">
          {/* YEARLY — Best Value (Primary) */}
          <div className="apple-card overflow-hidden border-2 border-primary relative">
            <div className="absolute -top-0 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-4 py-1 text-[11px] font-bold rounded-b-xl tracking-wide shadow-lg whitespace-nowrap">
                BEST VALUE — SAVE 60%
              </span>
            </div>
            <div className="bg-gradient-to-br from-primary/[0.03] to-accent/10 p-8 pt-10">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">Annual Plan</p>
                <div className="flex items-baseline justify-center gap-1.5 mb-1">
                  <span className="text-5xl font-extrabold text-foreground tracking-tight">$47.95</span>
                  <span className="text-muted-foreground text-lg">/ year</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Only <span className="font-semibold text-foreground">$3.99/month</span> billed annually
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  <span className="line-through">$119.88</span>
                </p>
                <div className="inline-flex items-center gap-1.5 mt-2 bg-safe-green/10 border border-safe-green/20 rounded-lg px-3 py-1">
                  <Sparkles className="h-3.5 w-3.5 text-safe-green" />
                  <span className="text-xs font-semibold text-safe-green">You save $71.93</span>
                </div>
                <p className="text-sm font-semibold text-primary mt-3">
                  Start FREE — 7-day free trial
                </p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {yearlyBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-safe-green/15">
                      <Check className="h-3.5 w-3.5 text-safe-green" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("yearly")}
                size="lg"
                className="w-full h-14 text-base font-bold rounded-xl"
                disabled={isLoading || isPremium}
              >
                {purchaseLoading === "yearly" ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <Crown className="h-5 w-5 mr-2" />
                )}
                {isPremium ? "Already Subscribed" : "Start 7-Day Free Trial"}
              </Button>
            </div>
          </div>

          {/* MONTHLY */}
          <div className="apple-card overflow-hidden border border-border">
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">Monthly Subscription</p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">$9.99</span>
                  <span className="text-muted-foreground text-sm">/ month</span>
                </div>
                <p className="text-xs text-muted-foreground">Billed monthly • No trial • Cancel anytime</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {monthlyBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-primary/15">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("subscription")}
                size="lg"
                variant="outline"
                className="w-full h-12 text-base border-2 font-semibold rounded-xl"
                disabled={isLoading || isPremium}
              >
                {purchaseLoading === "monthly" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isPremium ? "Already Subscribed" : "Subscribe Monthly"}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground font-medium">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* One-Time Payment */}
          <div className="apple-card overflow-hidden border border-border">
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">One-Time Payment</p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">$5.99</span>
                </div>
                <p className="text-xs text-muted-foreground">Pay once for this triage result</p>
              </div>
            </div>
            <div className="p-6">
              <ul className="space-y-3 mb-6">
                {oneTimeBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="p-1 rounded-full bg-primary/15">
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("oneTime")}
                size="lg"
                variant="outline"
                className="w-full h-12 text-base border-2 rounded-xl"
                disabled={isLoading || isPremium}
              >
                {purchaseLoading === "oneTime" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {isPremium ? "Already Premium" : "Pay $5.99 for This Result"}
              </Button>
            </div>
          </div>
        </div>

        {/* Restore Purchases — native only */}
        {isNativeIAP && !isPremium && (
          <div className="mb-6 text-center">
            <Button
              onClick={restore}
              disabled={isLoading}
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
            >
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Restore Purchases
            </Button>
          </div>
        )}

        <div className="mb-10">
          <h3 className="text-xl font-semibold text-foreground mb-5">Free vs Premium</h3>
          <div className="apple-card overflow-hidden">
            <div className="grid grid-cols-3 gap-0 text-sm">
              <div className="p-3 bg-muted font-semibold text-muted-foreground">Feature</div>
              <div className="p-3 bg-muted font-semibold text-center text-muted-foreground">Free</div>
              <div className="p-3 bg-muted font-semibold text-center text-primary">Premium</div>
              {comparisonFeatures.map((f, i) => (
                <>
                  <div key={`n-${i}`} className="p-3 border-t border-border text-foreground">{f.name}</div>
                  <div key={`f-${i}`} className="p-3 border-t border-border text-center text-muted-foreground">{f.free}</div>
                  <div key={`p-${i}`} className="p-3 border-t border-border text-center font-medium text-foreground">{f.premium}</div>
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold text-foreground mb-5">What's Included in Premium</h3>
          <div className="grid gap-4">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="apple-card p-5 flex items-start gap-5">
                  <div className="p-3 rounded-2xl bg-primary/10 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h3 className="text-xl font-semibold text-foreground mb-5">Questions?</h3>
          <div className="apple-card p-6 space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">What's the difference between the plans?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The annual plan ($47.95/year) gives you all features at the best price with a 7-day free trial. The monthly plan ($9.99/month) has the same features with no trial. The $5.99 one-time payment unlocks only the current triage result.
              </p>
            </div>
            <div className="apple-separator" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes! You can cancel your subscription at any time with no penalties.
              </p>
            </div>
            <div className="apple-separator" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Is my data secure?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Absolutely. All your pet data is encrypted and never shared with third parties.
              </p>
            </div>
            <div className="apple-separator" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Is this a replacement for a vet?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No. PetNurse AI provides triage guidance only. Always consult a veterinarian for medical care.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PremiumPage;
