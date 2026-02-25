import { useState } from "react";
import { Users, Image, Award, Heart, BookOpen, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import { validateEmail } from "@/lib/emailValidation";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CommunityPage() {
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvent();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useState(() => { trackEvent("community_tab_viewed"); });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => { const { data } = await supabase.auth.getSession(); return data.session; },
    staleTime: 30000,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("is_premium").eq("user_id", session!.user.id).maybeSingle();
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 30000,
  });

  const { data: waitlistCount = 0 } = useQuery({
    queryKey: ["community-waitlist-count"],
    queryFn: async () => { const { data } = await supabase.rpc("get_community_waitlist_count"); return data ?? 0; },
    staleTime: 10000,
  });

  const mockCards = [
    { icon: Image, tag: t("community.card.petPhoto"), title: t("community.card.photoTitle"), desc: t("community.card.photoDesc") },
    { icon: Award, tag: t("community.card.healthWin"), title: t("community.card.healthWinTitle"), desc: t("community.card.healthWinDesc") },
    { icon: Heart, tag: t("community.card.recovery"), title: t("community.card.recoveryTitle"), desc: t("community.card.recoveryDesc") },
    { icon: BookOpen, tag: t("community.card.breedGroup"), title: t("community.card.breedGroupTitle"), desc: t("community.card.breedGroupDesc") },
  ];

  const handleJoin = async () => {
    const emailToUse = session?.user?.email || email.trim();
    const error = validateEmail(emailToUse);
    if (error) { setEmailError(error); return; }
    setEmailError(null);
    trackEvent("community_waitlist_clicked");
    setIsSubmitting(true);
    try {
      const { error: insertError } = await supabase.from("community_waitlist").insert([{
        user_id: session?.user?.id || null,
        email: emailToUse,
        premium_status: profile?.is_premium ?? false,
      }]);
      if (insertError) throw insertError;
      setJoined(true);
      trackEvent("community_waitlist_joined");
      toast({ title: t("community.onTheList"), description: t("community.notifyLaunch") });
    } catch {
      toast({ title: t("general.error"), description: t("general.error"), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-4">
      <header className="safe-area-top px-5 pt-4 pb-2">
        <div className="max-w-lg mx-auto flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t("community.heading")}</h1>
        </div>
      </header>

      <div className="px-5 max-w-lg mx-auto space-y-5 mt-2">
        {/* Hero */}
        <div className="apple-card p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/5 to-transparent rounded-full -mr-8 -mt-8" />
          <Badge variant="secondary" className="mb-3 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {t("community.comingSoon")}
          </Badge>
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("community.heading")}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            {t("community.connectDesc")}
          </p>
        </div>

        {/* Mock Preview Cards */}
        <div className="space-y-3 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background z-10 pointer-events-none" />
          {mockCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <div key={i} className="apple-card p-4 flex items-start gap-3 opacity-75">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{card.tag}</Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Waitlist CTA */}
        <div className="apple-card p-6 text-center">
          {joined ? (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-safe-green/10 flex items-center justify-center mx-auto">
                <CheckCircle className="h-6 w-6 text-safe-green" />
              </div>
              <h3 className="font-semibold text-foreground">{t("community.onTheList")}</h3>
              <p className="text-sm text-muted-foreground">{t("community.notifyLaunch")}</p>
              <p className="text-xs text-muted-foreground italic">{t("community.earlyPerks")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">{t("community.beFirst")}</h3>
              {!session?.user?.email && (
                <div>
                  <Input type="email" placeholder="your@email.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                    className={`h-11 rounded-xl border-0 bg-muted text-center ${emailError ? 'ring-2 ring-destructive' : ''}`} />
                  {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
                </div>
              )}
              <Button onClick={handleJoin} disabled={isSubmitting} className="w-full h-12 rounded-xl font-semibold">
                {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                {t("community.joinEarly")}
              </Button>
              {waitlistCount > 0 && (
                <p className="text-xs text-muted-foreground">{t("community.count", { count: waitlistCount })}</p>
              )}
              <p className="text-xs text-muted-foreground italic">{t("community.earlyPerks")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
