import React, { useState, useEffect, forwardRef } from "react";
import { Crown, Check, Stethoscope, Camera, FileText, Zap, Loader2, Settings, Sparkles, Shield, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import petnurseLogo from "@/assets/petnurse-logo-v2.png";
import { PromoCodeInput } from "@/components/premium/PromoCodeInput";
import { useReferralTracking } from "@/hooks/useReferralTracking";
import { usePurchases } from "@/hooks/usePurchases";
import { SeoHead } from "@/components/seo/SeoHead";
import { LiveActivityIndicator } from "@/components/triage/LiveActivityIndicator";

const features = [
  {
    icon: Stethoscope,
    title: "Unlimited Health Assessments",
    description: "Never worry again — check symptoms anytime, day or night, for all your pets",
  },
  {
    icon: Camera,
    title: "Food & Toxin Safety Database",
    description: "Instantly check if any food, plant, or substance is safe before your pet eats it",
  },
  {
    icon: FileText,
    title: "Vet-Ready Reports",
    description: "Walk into your vet visit with organized symptom timelines and risk assessments",
  },
  {
    icon: Zap,
    title: "Medication Safety Checker",
    description: "Verify safe dosages and dangerous interactions before giving any medication",
  },
];

const comparisonFeatures = [
  { name: "Daily Health Monitoring", free: "✓", premium: "✓" },
  { name: "Health Timeline", free: "✓", premium: "✓" },
  { name: "AI Triage Assessment", free: "2 free", premium: "Unlimited" },
  { name: "Toxicology Database", free: "—", premium: "Full access" },
  { name: "Medication Safety Checker", free: "—", premium: "✓" },
  { name: "Behavior Coach AI", free: "—", premium: "✓" },
  { name: "Clinical Report Export", free: "—", premium: "✓" },
  { name: "Multi-Pet Support", free: "1 pet", premium: "Unlimited" },
  { name: "Smart Care Reminders", free: "3 max", premium: "Unlimited" },
  { name: "Priority Support", free: "—", premium: "✓" },
];

const yearlyBenefits = [
  "Unlimited AI health checks for all your pets",
  "\"Is this food safe?\" — instant toxin database",
  "Medication safety & dosage checker",
  "Vet-ready clinical reports you can share",
  "Smart care reminders (vaccines, meds, flea/tick)",
  "Behavior coaching for anxiety, aggression & more",
  "7-day FREE trial — cancel anytime",
];

const monthlyBenefits = [
  "Unlimited AI health checks for all your pets",
  "Full toxin & medication safety database",
  "Vet-ready clinical reports",
  "Smart care reminders & health timeline",
  "Cancel anytime — no commitment",
];

const oneTimeBenefits = [
  "Unlock this specific health assessment",
  "Full diagnosis details & severity analysis",
  "What to watch for at home",
  "Shareable PDF report for your vet",
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
    <PageTransition ref={ref} className="min-h-screen">
      <SeoHead
        title="PetNurse AI Premium — Unlimited Triage & Clinical Reports"
        description="Upgrade to PetNurse AI Premium for unlimited AI triage assessments, toxicology checks, exportable clinical reports, and priority support. 7-day free trial."
        canonicalPath="/premium"
      />
      <PageHeader
        title="Premium"
        icon={<Crown className="h-4 w-4 text-[hsl(var(--warning-amber))]" />}
      />

      <div className="px-5 py-5 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-6">
          <img src={petnurseLogo} alt="PetNurse AI" className="h-16 w-16 rounded-2xl object-cover mx-auto mb-4 shadow-lg" />
          <Badge className="mb-3 bg-gradient-to-r from-warning-amber to-warning-amber/80 text-card border-0 rounded-lg px-3 py-1 text-xs font-medium">
            {isPremium ? "Premium Active" : "Peace of Mind Plan"}
          </Badge>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {isPremium ? "Full Access Active" : "Your Pet's Health, Always Covered"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {isPremium 
              ? subscriptionEnd 
                ? `Your access renews ${new Date(subscriptionEnd).toLocaleDateString()}` 
                : "Full access to all clinical assessment features"
              : "Check symptoms, verify food safety, track medications — peace of mind for less than a coffee"
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
        <LiveActivityIndicator />

        {/* Testimonial */}
        <div className="mb-6 apple-card p-4 text-center">
          <div className="flex items-center justify-center gap-0.5 mb-2">
            {[1,2,3,4,5].map(i => <span key={i} className="text-warning-amber text-sm">★</span>)}
          </div>
          <p className="text-sm text-foreground italic leading-relaxed">
            "My dog ate something suspicious at the park. I checked the toxin database instantly — turned out it was harmless. Without this I'd have rushed to the emergency vet and spent $300."
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">— Jessica R., dog mom of 2</p>
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
        <div className="space-y-3 mb-8">
          {/* YEARLY — Best Value (Primary) */}
          <div className="apple-card overflow-hidden border-2 border-primary relative">
            <div className="absolute -top-0 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground px-3 py-0.5 text-[10px] font-bold rounded-b-lg tracking-wide shadow-lg whitespace-nowrap">
                BEST VALUE — SAVE 60%
              </span>
            </div>
            <div className="bg-gradient-to-br from-primary/[0.03] to-accent/10 p-5 pt-7">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Annual Plan</p>
                <div className="flex items-baseline justify-center gap-1 mb-1">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight">$47.95</span>
                  <span className="text-muted-foreground text-sm">/ year</span>
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
            <div className="p-4">
              <ul className="space-y-2 mb-4">
                {yearlyBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="p-0.5 rounded-full bg-safe-green/15">
                      <Check className="h-3 w-3 text-safe-green" />
                    </div>
                    <span className="text-xs text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("yearly")}
                size="lg"
                className="w-full h-11 text-sm font-bold rounded-xl"
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
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1">Monthly Subscription</p>
                <div className="flex items-baseline justify-center gap-1 mb-0.5">
                  <span className="text-2xl font-bold text-foreground">$9.99</span>
                  <span className="text-muted-foreground text-xs">/ month</span>
                </div>
                <p className="text-xs text-muted-foreground">Billed monthly • No trial • Cancel anytime</p>
              </div>
            </div>
            <div className="p-4">
              <ul className="space-y-2 mb-4">
                {monthlyBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="p-0.5 rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("subscription")}
                size="lg"
                variant="outline"
                className="w-full h-10 text-sm border-2 font-semibold rounded-xl"
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
            <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4">
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground mb-1">One-Time Payment</p>
                <div className="flex items-baseline justify-center gap-1 mb-0.5">
                  <span className="text-2xl font-bold text-foreground">$5.99</span>
                </div>
                <p className="text-xs text-muted-foreground">Pay once for this triage result</p>
              </div>
            </div>
            <div className="p-4">
              <ul className="space-y-2 mb-4">
                {oneTimeBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <div className="p-0.5 rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-xs text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleCheckout("oneTime")}
                size="lg"
                variant="outline"
                className="w-full h-10 text-sm border-2 rounded-xl"
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

        <div className="mb-8">
          <h3 className="text-base font-semibold text-foreground mb-3">Free vs Premium</h3>
          <div className="apple-card overflow-hidden">
            <div className="grid grid-cols-3 gap-0 text-sm">
              <div className="p-3 bg-muted font-semibold text-muted-foreground">Feature</div>
              <div className="p-3 bg-muted font-semibold text-center text-muted-foreground">Free</div>
              <div className="p-3 bg-muted font-semibold text-center text-primary">Premium</div>
              {comparisonFeatures.map((f, i) => (
                <React.Fragment key={i}>
                  <div className="p-3 border-t border-border text-foreground text-xs">{f.name}</div>
                  <div className="p-3 border-t border-border text-center text-muted-foreground text-xs">{f.free}</div>
                  <div className="p-3 border-t border-border text-center font-medium text-foreground text-xs">{f.premium}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mb-8">
          <h3 className="text-base font-semibold text-foreground mb-3">What's Included in Premium</h3>
          <div className="grid gap-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="apple-card p-4 flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
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
          <h3 className="text-base font-semibold text-foreground mb-3">Common Questions</h3>
          <div className="apple-card p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">What do pet owners use most?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The toxin checker ("Can my dog eat this?"), medication safety ("Is this dose safe?"), and unlimited symptom assessments are the most-used features. Parents of puppies and senior pets especially love the health timeline.
              </p>
            </div>
            <div className="apple-separator" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">What's the difference between the plans?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Annual ($47.95/year) = best value with 7-day free trial. Monthly ($9.99/mo) = same features, no trial. One-time ($5.99) = unlocks only the current assessment.
              </p>
            </div>
            <div className="apple-separator" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Can I cancel anytime?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Yes! Cancel with one tap — no penalties, no hidden fees. Your access continues until the end of your billing period.
              </p>
            </div>
            <div className="apple-separator" />
            <div>
              <h4 className="font-semibold text-foreground mb-2">Does this replace my vet?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No — PetNurse AI helps you decide <em>when</em> to see the vet and gives you organized information to bring to the appointment. Think of it as your first step before the clinic.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
});

export default PremiumPage;
