import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Heart, Sparkles, ChevronRight, Plus, Sun, TrendingUp, Calendar, Syringe, Pill, Droplets, Users, Loader2, PawPrint, Dog, Cat, Bird, Rabbit, Shield, Star, Clock } from "lucide-react";
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
import { SeoHead } from "@/components/seo/SeoHead";
import { ReviewsSocialProof } from "@/components/ReviewsSocialProof";

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
    <div className="min-h-screen pb-4">
      {/* Header */}
      <header className="safe-area-top px-5 pt-4 pb-2">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="PetNurse AI" className="h-8 w-8 rounded-lg" />
            <div>
              <p className="text-sm text-muted-foreground">{greeting}</p>
              <h1 className="text-xl font-bold text-foreground mt-0.5">
                {t("home.dashboard", { name: activePet?.name || "" })}
              </h1>
            </div>
          </div>
          <PetRecommendations userId={session.user.id} />
        </div>
      </header>

      {/* My Pets Row */}
      {pets.length > 0 && (
        <div className="px-5 max-w-lg mx-auto mt-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t("home.myPets")}</h3>
            <Link to="/pets" className="text-xs text-primary font-medium">{t("home.manage")}</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {pets.map((pet) => {
              const Icon = speciesIcons[pet.species] || PawPrint;
              const isActive = pet.id === activePet?.id;
              return (
                <button
                  key={pet.id}
                  onClick={() => setActivePetId(pet.id)}
                  className={`flex flex-col items-center gap-1.5 shrink-0 transition-all duration-200 ${isActive ? '' : 'opacity-60 hover:opacity-80'}`}
                >
                  <Avatar className={`h-14 w-14 rounded-2xl ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                    <AvatarImage src={pet.photo_url || undefined} alt={pet.name} className="object-cover" />
                    <AvatarFallback className="rounded-2xl bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground truncate max-w-[56px]">{pet.name}</span>
                </button>
              );
            })}
            <Link to="/pets" className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-xs text-muted-foreground">{t("home.add")}</span>
            </Link>
          </div>
        </div>
      )}

      <div className="px-5 max-w-lg mx-auto space-y-4 mt-2">
        {/* Health Score Card */}
        <div className="apple-card p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/5 to-transparent rounded-full -mr-8 -mt-8" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t("home.healthScore")}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-4xl font-bold ${healthColor}`}>
                  {currentHealthScore ?? "--"}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              {streakDays > 1 && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {t("home.streak", { days: streakDays })}
                </Badge>
              )}
            </div>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Activity className={`h-8 w-8 ${healthColor}`} />
            </div>
          </div>
        </div>

        {/* Daily Check-in CTA */}
        {!todayCheckin ? (
          <button
            onClick={() => setCheckinOpen(true)}
            className="w-full apple-card p-5 flex items-center gap-4 text-left hover:shadow-lg transition-shadow active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-safe-green/10 flex items-center justify-center shrink-0">
              <Sun className="h-6 w-6 text-safe-green" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{t("home.dailyCheckin")}</p>
              <p className="text-sm text-muted-foreground">{t("home.howIs", { name: activePet?.name || "" })}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        ) : (
          <div className="apple-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-safe-green/10 flex items-center justify-center">
              <Sun className="h-5 w-5 text-safe-green" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{t("home.checkinComplete")}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {t("home.checkinSummary", { 
                  mood: t(`checkin.mood.${todayCheckin.mood}`), 
                  energy: t(`checkin.energy.${todayCheckin.energy}`) 
                })}
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/triage?start=true" className="apple-card p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg transition-shadow active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">{t("home.quickActions.healthCheck")}</span>
          </Link>
          <Link to="/timeline" className="apple-card p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg transition-shadow active:scale-[0.98]">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">{t("home.quickActions.timeline")}</span>
          </Link>
        </div>

        {/* Upcoming Reminders Preview */}
        <div className="apple-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-foreground text-sm">{t("home.upcomingCare")}</h3>
            <Link to="/care" className="text-xs text-primary font-medium">{t("home.viewAll")}</Link>
          </div>
          {upcomingReminders.length > 0 ? (
            <div className="space-y-3">
              {upcomingReminders.slice(0, 3).map((rem) => {
                const Icon = categoryIcons[rem.category] || Calendar;
                return (
                  <div key={rem.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-warning-amber/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-warning-amber" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{rem.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("home.due", { date: new Date(rem.due_date + "T00:00:00").toLocaleDateString() })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
          <Link to="/care?add=true" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{t("home.addReminder")}</p>
            </Link>
          )}
        </div>

        {/* Daily Health Tip */}
        <div className="apple-card p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 text-lg">
              {todayTip.emoji}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t(todayTip.titleKey)} 💡</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
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
              <div className="bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm">{t("premium.unlock")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("premium.desc")}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge className="bg-safe-green/10 text-safe-green border-safe-green/20 text-[10px]">
                        {t("premium.trial")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("premium.price")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {t("premium.cancel")}</span>
                      <span className="flex items-center gap-1"><Star className="h-3 w-3" /> {t("premium.rated")}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t("premium.users")}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-1" />
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
      <section className="pt-24 pb-8 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight mb-3">
            Welcome to Pet Nurse AI
          </h1>
          <Badge variant="secondary" className="mb-4 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {t("app.tagline")}
          </Badge>
          <p className="text-xl sm:text-2xl font-semibold text-foreground leading-snug mb-4">
            {t("landing.hero")}
          </p>
          <p className="text-base text-muted-foreground max-w-md mx-auto mb-4 leading-relaxed">
            {t("landing.subtitle")}
          </p>
          <div className="flex items-center justify-center gap-3 mb-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {t("landing.vetBacked")}</span>
            <span>•</span>
            <span>⭐ 4.9</span>
            <span>•</span>
            <span>{t("landing.freeStart")}</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth">
              <Button size="lg" className="w-full sm:w-auto rounded-2xl h-14 px-8 text-base" aria-label={t("landing.cta")}>
                {t("landing.cta")}
              </Button>
            </Link>
            <Link to="/reviews">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl h-14 px-8 text-base" aria-label={t("landing.reviews")}>
                {t("landing.reviews")}
              </Button>
            </Link>
          </div>
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
