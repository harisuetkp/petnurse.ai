import { useState, useEffect, useCallback, forwardRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, LogOut, Crown, FileText, Shield, ChevronRight, Loader2, Mail, Users, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/PageTransition";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AccountPage = forwardRef<HTMLDivElement>(function AccountPage(_props, _ref) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Optimized session query with staleTime
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 30000,
    gcTime: 300000,
  });

  // Profile query - only runs when session exists
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium, premium_until")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!session?.user?.id,
    staleTime: 30000,
    gcTime: 300000,
  });

  // Check if user is an influencer
  const { data: isInfluencer } = useQuery({
    queryKey: ["isInfluencer", session?.user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("influencers")
        .select("id")
        .eq("user_id", session!.user.id)
        .eq("is_active", true)
        .maybeSingle();
      return !!data;
    },
    enabled: !!session?.user?.id,
    staleTime: 60000,
    gcTime: 300000,
  });

  // Listen for auth changes and sync session state
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Update cache with new session immediately
          queryClient.setQueryData(["session"], newSession);
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        } else if (event === "SIGNED_OUT") {
          queryClient.setQueryData(["session"], null);
          queryClient.invalidateQueries({ queryKey: ["profile"] });
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [queryClient]);

  // Redirect to auth if not logged in (only after initial load)
  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate("/auth?returnTo=/account");
    }
  }, [session, sessionLoading, navigate]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      // Clear local state first
      queryClient.clear();
      
      // Sign out from Supabase (scope: 'local' to avoid server-side session issues)
      await supabase.auth.signOut({ scope: 'local' });
      
      toast({ title: t("account.signedOut"), description: t("account.signedOutDesc") });
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
      // Even if there's an error, clear local state and redirect
      queryClient.clear();
      navigate("/");
    } finally {
      setIsSigningOut(false);
    }
  }, [navigate, toast, queryClient, t]);

  const handleDeleteAccount = useCallback(async () => {
    setIsDeletingAccount(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        toast({ title: t("general.error"), description: t("general.error"), variant: "destructive" });
        return;
      }

      const response = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to delete account");
      }

      // Clear all local state
      queryClient.clear();
      
      // Sign out locally
      await supabase.auth.signOut({ scope: 'local' });

      toast({ 
        title: t("account.accountDeleted"), 
        description: t("account.accountDeletedDesc") 
      });
      navigate("/");
    } catch (error) {
      console.error("Delete account error:", error);
      toast({
        title: t("general.error"),
        description: error instanceof Error ? error.message : t("general.error"),
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  }, [navigate, toast, queryClient, t]);

  const isLoading = sessionLoading || (session && profileLoading);
  const isPremium = profile?.is_premium || false;
  const premiumUntil = profile?.premium_until;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect via useEffect
  }

  return (
    <PageTransition className="min-h-screen pb-24">
      <PageHeader
        title={t("account.title")}
        icon={<User className="h-4 w-4 text-primary" />}
      />
      <div className="px-5 py-5 max-w-2xl mx-auto space-y-4">
        {/* Profile Card */}
        <div className="apple-card p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="font-medium text-foreground truncate">{session.user.email}</p>
              </div>
              {isPremium && (
                <Badge className="mt-2 bg-gradient-to-r from-warning-amber to-warning-amber/80 text-warning-amber-foreground border-0">
                  <Crown className="h-3 w-3 mr-1" />
                  {t("premium.badge")}
                  {premiumUntil && (
                    <span className="ml-1 opacity-80">
                      {t("premium.until", { date: new Date(premiumUntil).toLocaleDateString() })}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Section */}
        <div className="apple-card overflow-hidden">
          <Link 
            to="/premium"
            className="flex items-center justify-between p-5 transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning-amber/10">
                <Crown className="h-4 w-4 text-warning-amber" />
              </div>
              <div>
              <p className="font-medium text-sm text-foreground">{t("premium.subscription")}</p>
                <p className="text-xs text-muted-foreground">
                  {isPremium ? t("premium.managePlan") : t("premium.upgrade")}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>

        {/* Influencer Dashboard - only shown to influencers */}
        {isInfluencer && (
          <div className="apple-card overflow-hidden">
            <Link 
              to="/influencer"
              className="flex items-center justify-between p-5 transition-colors hover:bg-muted/50 active:scale-[0.99]"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t("account.influencerDashboard")}</p>
                  <p className="text-sm text-muted-foreground">{t("account.viewReferrals")}</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </div>
        )}

        {/* Legal Section */}
        <div className="apple-card overflow-hidden divide-y divide-border">
          <Link
            to="/privacy-policy"
            className="flex items-center justify-between p-5 transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent">
                <Shield className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="font-medium text-foreground">{t("general.privacyPolicy")}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
          
          <Link
            to="/terms-of-service"
            className="flex items-center justify-between p-5 transition-colors hover:bg-muted/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent">
                <FileText className="h-5 w-5 text-accent-foreground" />
              </div>
              <p className="font-medium text-foreground">{t("general.termsOfService")}</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>

        {/* Sign Out */}
        <Button
          variant="outline"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full h-12 text-destructive hover:text-destructive hover:bg-destructive/10 active:scale-[0.98]"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          {isSigningOut ? t("account.signingOut") : t("account.signOut")}
        </Button>

        {/* Delete Account */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              disabled={isDeletingAccount}
              className="w-full h-12 text-destructive/70 hover:text-destructive hover:bg-destructive/10 active:scale-[0.98]"
            >
              {isDeletingAccount ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {t("account.deleteAccount")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("account.deleteAccountTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("account.deleteAccountDesc")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("general.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t("account.deleteAccount")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* App Version & Support */}
        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground">
            {t("app.version")}
          </p>
          <a href="mailto:Support@petnurseai.com" className="text-xs text-muted-foreground hover:text-foreground">
            Support@petnurseai.com
          </a>
        </div>
      </div>
    </PageTransition>
  );
});

export default AccountPage;
