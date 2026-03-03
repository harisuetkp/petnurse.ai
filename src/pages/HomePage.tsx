import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Heart, Sparkles, ChevronRight, Plus, Sun, TrendingUp, Calendar, Syringe, Pill, Droplets, Users, Loader2, PawPrint, Dog, Cat, Bird, Rabbit, Shield, Star, Clock, Bell, MapPin, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useDailyCheckin } from "@/hooks/useDailyCheckin";
import { useCareReminders } from "@/hooks/useCareReminders";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import { useToast } from "@/hooks/use-toast";
import { validateEmail } from "@/lib/emailValidation";
import { DailyCheckinSheet } from "@/components/checkin/DailyCheckinSheet";
import { PetRecommendations } from "@/components/PetRecommendations";
import { useActivePet } from "@/contexts/ActivePetContext";
import { useWelcomeMessage } from "@/hooks/useWelcomeMessage";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";
import { getTodaysTip } from "@/data/dailyTips";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { HealthInsightsDashboard } from "@/components/health/HealthInsightsDashboard";
import { useLanguage } from "@/contexts/LanguageContext";
import appLogo from "@/assets/app-logo.png";
import { OrganizationSchema } from "@/components/seo/OrganizationSchema";
import { useDebugTap } from "@/hooks/useDebugTap";
import { SeoHead } from "@/components/seo/SeoHead";
import { ReviewsSocialProof } from "@/components/ReviewsSocialProof";
import { UserInbox } from "@/components/UserInbox";
import { SampleTriageDemo } from "@/components/landing/SampleTriageDemo";
import { TrustStats } from "@/components/landing/TrustStats";
import { VetEndorsement } from "@/components/landing/VetEndorsement";

const speciesIcons: Record<string, typeof Dog> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  other: PawPrint,
};

function HomePage() {
  const navigate = useNavigate();
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const { pets, activePet, setActivePetId } = useActivePet();
  const { t } = useLanguage();

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, triage_count")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 30000,
  });

  const { todayCheckin, currentHealthScore, streakDays } = useDailyCheckin(
    session?.user?.id,
    activePet?.id
  );

  const { upcomingReminders, reminders } = useCareReminders(session?.user?.id, activePet?.id);

  useWelcomeMessage(session?.user?.id);
  useReminderNotifications(reminders);

  const todayTip = getTodaysTip();
  const handleDebugTap = useDebugTap();

  const categoryIcons: Record<string, typeof Syringe> = {
    vaccination: Syringe,
    medication: Pill,
    flea_tick: Droplets,
    vet_appointment: Calendar,
  };

  // Not logged in → show landing page
  if (!session) {
    return <LandingView />;
  }

  // No pets → onboarding prompt
  if (pets.length === 0 && !onboardingComplete) {
    return <OnboardingWizard userId={session.user.id} onComplete={() => setOnboardingComplete(true)} />;
  }

  const greeting = getGreeting(t);
  const healthColor = getHealthColor(currentHealthScore);

  return (
    <div className="min-h-screen bg-muted pt-safe">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-muted/90 backdrop-blur-xl border-b border-border/20 shadow-sm px-4 py-2.5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="PetNurse AI" className="h-8 w-8 rounded-xl" onClick={handleDebugTap} />
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">{greeting}</p>
              <h1 className="text-base font-bold text-foreground leading-tight">
                {t("home.dashboard", { name: activePet?.name || "" })}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <UserInbox />
            <PetRecommendations userId={session.user.id} />
          </div>
        </div>
      </header>

      {/* My Pets Row */}
      {pets.length > 0 && (
        <div className="px-4 max-w-lg mx-auto mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("home.myPets")}</h3>
            <Link to="/pets" className="text-xs text-primary font-medium">{t("home.manage")}</Link>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {pets.map((pet) => {
              const Icon = speciesIcons[pet.species] || PawPrint;
              const isActive = pet.id === activePet?.id;
              return (
                <button
                  key={pet.id}
                  onClick={() => setActivePetId(pet.id)}
                  className={`flex flex-col items-center gap-1 shrink-0 transition-all duration-200 ${isActive ? '' : 'opacity-50 hover:opacity-80'}`}
                >
                  <Avatar className={`h-12 w-12 rounded-2xl ${isActive ? 'ring-2 ring-primary ring-offset-1' : ''}`}>
                    <AvatarImage src={pet.photo_url || undefined} alt={pet.name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-medium text-foreground truncate max-w-[48px]">{pet.name}</span>
                </button>
              );
            })}
            <Link to="/pets" className="flex flex-col items-center gap-1 shrink-0">
              <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center">
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">{t("home.add")}</span>
            </Link>
          </div>
        </div>
      )}

      <div className="px-4 max-w-lg mx-auto space-y-3 mt-3 pb-4">
        {/* Health Score + Check-in Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Health Score */}
          <div className="apple-card p-3.5 relative overflow-hidden">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t("home.healthScore")}</p>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold ${healthColor}`}>
                {currentHealthScore ?? "--"}
              </span>
              <span className="text-[10px] text-muted-foreground">/ 100</span>
            </div>
            {streakDays > 1 && (
              <Badge variant="secondary" className="mt-1.5 text-[10px] px-1.5 py-0">
                🔥 {streakDays}d
              </Badge>
            )}
          </div>

          {/* Daily Check-in */}
          {!todayCheckin ? (
            <button
              onClick={() => setCheckinOpen(true)}
              className="apple-card p-3.5 flex flex-col justify-between text-left hover:shadow-md transition-shadow active:scale-[0.97]"
            >
              <div className="w-8 h-8 rounded-xl bg-safe-green/10 flex items-center justify-center">
                <Sun className="h-4 w-4 text-safe-green" />
              </div>
              <div className="mt-1.5">
                <p className="text-xs font-semibold text-foreground leading-tight">{t("home.dailyCheckin")}</p>
                <p className="text-[10px] text-muted-foreground">Tap to log</p>
              </div>
            </button>
          ) : (
            <div className="apple-card p-3.5 flex flex-col justify-between">
              <div className="w-8 h-8 rounded-xl bg-safe-green/10 flex items-center justify-center">
                <Sun className="h-4 w-4 text-safe-green" />
              </div>
              <div className="mt-1.5">
                <p className="text-[10px] font-semibold text-safe-green">✓ Done today</p>
                <p className="text-[10px] text-muted-foreground capitalize truncate">
                  {t(`checkin.mood.${todayCheckin.mood}`)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions — Visual Cards */}
        <div>
          <h3 className="text-sm font-bold text-foreground mb-2.5 tracking-tight">Quick Actions</h3>
          <div className="space-y-2.5">
            {[
              { to: "/triage?start=true", icon: Sparkles, title: "Health Check", subtitle: "AI-powered symptom triage", gradient: "from-primary to-primary/80" },
              { to: "/care", icon: Heart, title: "Care Center", subtitle: "Tools, reminders & safety checks", gradient: "from-purple-600 to-purple-500" },
              { to: "/timeline", icon: TrendingUp, title: "Health Timeline", subtitle: "Track trends over time", gradient: "from-accent-foreground to-primary-accent" },
              { to: "/clinic-finder", icon: MapPin, title: "Find a Vet", subtitle: "Nearby & emergency clinics", gradient: "from-emergency-red to-emergency-red/80" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="block group">
                  <div className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br ${item.gradient} p-3.5 shadow-md active:scale-[0.97] transition-transform duration-150`}>
                    <div className="absolute -right-4 -bottom-4 opacity-[0.08] pointer-events-none">
                      <Icon className="h-20 w-20 text-white" strokeWidth={1} />
                    </div>
                    <div className="relative z-10 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                        <Icon className="h-4.5 w-4.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-white tracking-tight">{item.title}</p>
                        <p className="text-[11px] text-white/70 leading-snug">{item.subtitle}</p>
                      </div>
                      <ChevronRight className="h-4.5 w-4.5 text-white/40 shrink-0 group-hover:text-white/70 transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Upcoming Reminders */}
        <div className="apple-card p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("home.upcomingCare")}</h3>
            <Link to="/care" className="text-[10px] text-primary font-medium">{t("home.viewAll")}</Link>
          </div>
          {upcomingReminders.length > 0 ? (
            <div className="space-y-2">
              {upcomingReminders.slice(0, 3).map((rem) => {
                const Icon = categoryIcons[rem.category] || Calendar;
                return (
                  <div key={rem.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-warning-amber/10 flex items-center justify-center">
                      <Icon className="h-3.5 w-3.5 text-warning-amber" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{rem.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {t("home.due", { date: new Date(rem.due_date + "T00:00:00").toLocaleDateString() })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Link to="/care?add=true" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">{t("home.addReminder")}</p>
            </Link>
          )}
        </div>

        {/* Daily Health Tip */}
        <div className="apple-card p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-sm">
              {todayTip.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{t(todayTip.titleKey)} 💡</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">
                {t(todayTip.contentKey)}
              </p>
            </div>
          </div>
        </div>

        {/* Health Insights Dashboard */}
        <HealthInsightsDashboard
          userId={session.user.id}
          petId={activePet?.id}
          petName={activePet?.name}
        />

        {/* Premium Nudge */}
        {!profile?.is_premium && (
          <Link to="/premium" className="block" aria-label={t("premium.upgrade")}>
            <div className="apple-card overflow-hidden border border-primary/20">
              <div className="bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-xs">Never wonder "is this safe?" again</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Check foods, medications & symptoms — unlimited, 24/7</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge className="bg-safe-green/10 text-safe-green border-safe-green/20 text-[9px] px-1.5 py-0">
                        {t("premium.trial")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{t("premium.price")}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-primary shrink-0" />
                </div>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Daily Check-in Sheet */}
      {activePet && (
        <DailyCheckinSheet
          open={checkinOpen}
          onOpenChange={setCheckinOpen}
          pet={activePet}
          userId={session.user.id}
        />
      )}
    </div>
  );
}

function getGreeting(t: (key: string) => string) {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.greeting.morning");
  if (hour < 17) return t("home.greeting.afternoon");
  return t("home.greeting.evening");
}

function getHealthColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 80) return "text-safe-green";
  if (score >= 50) return "text-warning-amber";
  return "text-emergency-red";
}

// Community Coming Soon section for landing page
function CommunityLandingSection() {
  const { trackEvent } = useAnalyticsEvent();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const { data: waitlistCount = 0 } = useQuery({
    queryKey: ["community-waitlist-count"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_community_waitlist_count");
      return data ?? 0;
    },
    staleTime: 10000,
  });

  const handleJoin = async () => {
    const trimmed = email.trim();
    const error = validateEmail(trimmed);
    if (error) {
      setEmailError(error);
      return;
    }
    setEmailError(null);
    trackEvent("community_landing_joined");
    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("community_waitlist").insert([{
        email: trimmed,
        premium_status: false,
      }]);
      if (insertError) throw insertError;
      setJoined(true);
      toast({ title: t("community.onTheList"), description: t("community.notifyLaunch") });
    } catch {
      toast({ title: t("general.error"), description: t("general.error"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <div className="apple-card p-6 text-center">
        <Badge variant="secondary" className="mb-3 text-xs">
          <Users className="h-3 w-3 mr-1" />
          {t("community.comingSoon")}
        </Badge>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("community.title")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5 max-w-md mx-auto">
          {t("community.desc")}
        </p>
        {joined ? (
          <p className="text-sm text-safe-green font-medium">✓ {t("community.joined")}</p>
        ) : (
          <div className="flex flex-col gap-2 max-w-xs mx-auto">
            <Input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
              className={`h-11 rounded-xl border-0 bg-muted text-center ${emailError ? 'ring-2 ring-destructive' : ''}`}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            <Button onClick={handleJoin} disabled={isSubmitting} className="rounded-xl h-11">
              {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
              {t("community.joinEarly")}
            </Button>
          </div>
        )}
        {waitlistCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {t("community.count", { count: waitlistCount })}
          </p>
        )}
      </div>
    </div>
  );
}

// Landing page for non-authenticated users
function LandingView() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background">
      <SeoHead
        title="Pet Nurse AI — Free 24/7 Pet Health Triage & Daily Monitoring"
        description="AI-powered pet symptom checker backed by clinical veterinary data. Get free structured triage assessments for your dog or cat — anytime, anywhere. Trusted by pet owners worldwide."
        canonicalPath="/"
      />
      <OrganizationSchema />
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 safe-area-top">
        <div className="px-5 py-3 flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="PetNurse AI" className="h-8 w-8 rounded-lg" />
            <span className="font-semibold text-foreground text-sm">{t("app.name")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/about">
              <Button variant="ghost" size="sm" className="text-sm">About</Button>
            </Link>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm">{t("auth.signIn")}</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="text-sm rounded-xl">{t("auth.signUp")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-20 pb-6 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight mb-2">
            Is Your Pet Okay? Find Out Now.
          </h1>
          <Badge variant="secondary" className="mb-3 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {t("app.tagline")}
          </Badge>
          <p className="text-lg sm:text-xl font-semibold text-foreground leading-snug mb-3">
            {t("landing.hero")}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-3 leading-relaxed">
            {t("landing.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-3 mb-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {t("landing.vetBacked")}</span>
            <span>•</span>
            <span>⭐ 4.9</span>
            <span>•</span>
            <span>{t("landing.freeStart")}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto rounded-2xl h-12 px-6 text-sm" aria-label={t("landing.cta")}>
                {t("landing.cta")}
              </Button>
            </Link>
            <Link to="/reviews">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl h-12 px-6 text-sm" aria-label={t("landing.reviews")}>
                {t("landing.reviews")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="px-5 py-4">
        <div className="max-w-2xl mx-auto">
          <TrustStats />
        </div>
      </section>

      {/* Sample Triage Demo */}
      <section className="px-5 py-6">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-lg font-bold text-foreground text-center mb-1">See How It Works</h2>
          <p className="text-xs text-muted-foreground text-center mb-4">Real assessment example — interactive preview</p>
          <SampleTriageDemo />
        </div>
      </section>

      {/* Features */}
      <section className="px-5 py-8">
        <div className="max-w-2xl mx-auto grid gap-4">
          {[
            { icon: Sparkles, title: t("feature.aiAssessment"), desc: t("feature.aiAssessmentDesc") },
            { icon: Activity, title: t("feature.dailyTracking"), desc: t("feature.dailyTrackingDesc") },
            { icon: Heart, title: t("feature.careReminders"), desc: t("feature.careRemindersDesc") },
            { icon: TrendingUp, title: t("feature.healthTimeline"), desc: t("feature.healthTimelineDesc") },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="apple-card p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vet Endorsement */}
      <section className="px-5 py-4">
        <div className="max-w-2xl mx-auto">
          <VetEndorsement />
        </div>
      </section>

      {/* Real Customer Reviews */}
      <section className="px-5 py-8">
        <div className="max-w-2xl mx-auto">
          <ReviewsSocialProof maxReviews={3} />
        </div>
      </section>

      {/* Community */}
      <CommunityLandingSection />

      {/* Footer */}
      <footer className="px-5 py-8 border-t border-border/50">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <img src={appLogo} alt="PetNurse AI" className="h-6 w-6 rounded-md" />
            <span className="text-sm font-semibold text-foreground">{t("app.name")}</span>
          </div>
          <p className="text-xs text-muted-foreground">⚠️ {t("app.disclaimer")}</p>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-foreground">About</Link>
            <span>•</span>
            <a href="mailto:support@petnurseai.com" className="hover:text-foreground">Contact</a>
            <span>•</span>
            <Link to="/privacy-policy" className="hover:text-foreground">{t("general.privacy")}</Link>
          </div>
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <Link to="/terms-of-service" className="hover:text-foreground">{t("general.terms")}</Link>
            <Link to="/reviews" className="hover:text-foreground">{t("general.reviews")}</Link>
          </div>
          <a href="mailto:Support@petnurseai.com" className="text-xs text-muted-foreground hover:text-foreground">
            Support@petnurseai.com
          </a>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
