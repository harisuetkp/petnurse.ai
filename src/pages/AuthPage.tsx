import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, ArrowLeft, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import appLogo from "@/assets/app-logo.png";
import { validateEmail } from "@/lib/emailValidation";
import OtpVerification from "@/components/auth/OtpVerification";
import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

export default function AuthPage() {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOtp, setShowOtp] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false, confirmPassword: false });
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const errors = useMemo(() => ({
    email: touched.email ? validateEmail(email) : null,
    password: touched.password && !password
      ? t("auth.passwordRequired")
      : touched.password && password.length < 8
        ? t("auth.passwordMinLength")
        : null,
    confirmPassword: touched.confirmPassword && password !== confirmPassword
      ? t("auth.passwordsNoMatch")
      : null,
  }), [email, password, confirmPassword, touched, t]);

  const returnTo = searchParams.get("returnTo") || "/";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          queryClient.setQueryData(["session"], session);
          setTimeout(() => navigate(returnTo), 0);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [navigate, returnTo, queryClient]);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        queryClient.setQueryData(["session"], data.session);
        navigate(returnTo);
      }
    };
    checkSession();
  }, [navigate, returnTo, queryClient]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) queryClient.setQueryData(["session"], data.session);
      toast({ title: t("auth.welcomeBack"), description: t("auth.signedInSuccess") });
    } catch (error) {
      toast({
        title: t("general.error"),
        description: error instanceof Error ? error.message : t("general.error"),
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email);
    if (emailError) {
      toast({ title: t("auth.invalidEmail"), description: emailError, variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: t("auth.passwordsNoMatch"), description: t("auth.passwordsNoMatch"), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: validation, error: valError } = await supabase.functions.invoke("validate-email", {
        body: { email: email.trim() },
      });
      if (valError || !validation?.valid) {
        toast({ title: t("auth.invalidEmail"), description: validation?.reason || t("auth.invalidEmail"), variant: "destructive" });
        setIsLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}${returnTo}` },
      });
      if (error) throw error;
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        toast({ title: t("auth.accountExists"), description: t("auth.accountExistsDesc"), variant: "destructive", duration: 6000 });
        setIsLoading(false);
        return;
      }
      setShowOtp(true);
      toast({ title: t("auth.codeSent"), description: t("auth.codeSentDesc"), duration: 8000 });
    } catch (error) {
      toast({ title: t("general.error"), description: error instanceof Error ? error.message : t("general.error"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      await SocialLogin.initialize({ apple: { clientId: "com.petnurseapp.ai" } });
      const res = await SocialLogin.login({ provider: 'apple', options: { scopes: ['email', 'name'] } });
      if (res && res.result && res.result.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: res.result.idToken,
        });
        if (error) throw error;
        toast({ title: t("auth.welcomeBack"), description: t("auth.signedInSuccess") });
      }
    } catch (error) {
      console.error('Apple Sign-In error:', error);
      toast({ title: t("general.error"), description: error instanceof Error ? error.message : t("general.error"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      const result = await FirebaseAuthentication.signInWithGoogle();
      if (result.credential?.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: result.credential.idToken,
        });
        if (error) throw error;
        toast({ title: t("auth.welcomeBack"), description: t("auth.signedInSuccess") });
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
      toast({ title: t("general.error"), description: error instanceof Error ? error.message : t("general.error"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="safe-area-top p-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("auth.back")}
        </Button>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        <div className="flex flex-col items-center mb-8">
          <img src={appLogo} alt="PetNurse AI" className="h-16 w-16 rounded-2xl mb-3" />
          <h1 className="text-xl font-bold text-foreground">{t("app.name")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t("app.companion")}</p>
        </div>

        <div className="apple-card w-full max-w-sm p-6">
          {showOtp ? (
            <OtpVerification email={email.trim()} onBack={() => { setShowOtp(false); setPassword(""); setConfirmPassword(""); }} />
          ) : (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 rounded-xl h-11 bg-muted p-1">
                <TabsTrigger value="signin" className="rounded-lg text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  {t("auth.signIn")}
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-lg text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm">
                  {t("auth.signUp")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-0">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <Label htmlFor="signin-email" className="text-sm text-muted-foreground">{t("auth.email")}</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, email: true }))} placeholder="you@example.com"
                        className={`pl-10 h-11 rounded-xl border-0 bg-muted ${errors.email ? 'ring-2 ring-destructive' : ''}`} required />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signin-password" className="text-sm text-muted-foreground">{t("auth.password")}</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, password: true }))} placeholder="••••••••"
                        className={`pl-10 h-11 rounded-xl border-0 bg-muted ${errors.password ? 'ring-2 ring-destructive' : ''}`} required />
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl">
                    {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                  </Button>
                  <div className="text-center">
                    <button type="button" onClick={() => navigate("/forgot-password")} className="text-sm text-primary hover:underline">
                      {t("auth.forgotYourPassword")}
                    </button>
                  </div>

                  {Capacitor.isNativePlatform() && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleAppleSignIn} className="h-11 rounded-xl">
                          Apple
                        </Button>
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn} className="h-11 rounded-xl">
                          Google
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email" className="text-sm text-muted-foreground">{t("auth.email")}</Label>
                    <div className="relative mt-1.5">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, email: true }))} placeholder="you@example.com"
                        className={`pl-10 h-11 rounded-xl border-0 bg-muted ${errors.email ? 'ring-2 ring-destructive' : ''}`} required />
                    </div>
                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <Label htmlFor="signup-password" className="text-sm text-muted-foreground">{t("auth.password")}</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, password: true }))} placeholder="••••••••"
                        className={`pl-10 h-11 rounded-xl border-0 bg-muted ${errors.password ? 'ring-2 ring-destructive' : ''}`} minLength={8} required />
                    </div>
                    {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                    {touched.password && password.length >= 8 && (
                      <div className="mt-1.5">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => {
                            const strength = [password.length >= 8, /[A-Z]/.test(password) && /[a-z]/.test(password),
                            /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length;
                            const colors = ["bg-destructive", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
                            return <div key={level} className={`h-1 flex-1 rounded-full ${level <= strength ? colors[strength - 1] : "bg-muted"}`} />;
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{t("auth.passwordStrengthHint")}</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="signup-confirm" className="text-sm text-muted-foreground">{t("auth.confirmPassword")}</Label>
                    <div className="relative mt-1.5">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-confirm" type="password" value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))} placeholder="••••••••"
                        className={`pl-10 h-11 rounded-xl border-0 bg-muted ${errors.confirmPassword ? 'ring-2 ring-destructive' : ''}`} minLength={8} required />
                    </div>
                    {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full h-11 rounded-xl">
                    {isLoading ? t("auth.creatingAccount") : t("auth.createAccount")}
                  </Button>

                  {Capacitor.isNativePlatform() && (
                    <>
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleAppleSignIn} className="h-11 rounded-xl">
                          Apple
                        </Button>
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn} className="h-11 rounded-xl">
                          Google
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Heart className="h-3 w-3" /> {t("auth.freeTracking")}</span>
          <span>•</span>
          <span>{t("auth.noCreditCard")}</span>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6 max-w-xs leading-relaxed">
          {t("auth.agreeTerms")}{" "}
          <a href="/terms-of-service" className="text-primary underline">{t("general.terms")}</a>
          {" "}{t("auth.and")}{" "}
          <a href="/privacy-policy" className="text-primary underline">{t("general.privacyPolicy")}</a>.
        </p>
      </div>
    </div>
  );
}
