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

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 mr-3 fill-current" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.05 20.28c-.96.95-2.2 2.72-3.83 2.73-1.63.01-2.14-1.04-4.04-1.02-1.9.01-2.47 1.02-4.03 1.03-1.56.03-2.68-1.55-3.64-3.03-1.97-2.92-3.41-8.24-1.39-11.72 1-1.74 2.78-2.85 4.7-2.88 1.45-.03 2.81.99 3.69.99s2.41-1.12 4.14-1.01c.71.02 2.73.27 4 2.12-.11.06-2.39 1.39-2.36 4.12.04 3.26 2.88 4.41 2.92 4.43-.03.07-.46 1.58-1.51 2.99l.35.25zM12.03 5.48c-.08-2.01 1.58-3.75 3.51-4.04.22 2.37-2.16 4.31-3.51 4.04z" />
  </svg>
);

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
      console.log('Initiating Apple Sign-In...');
      await SocialLogin.initialize({ apple: { clientId: "com.petnurseapp.ai" } });

      const appleSignInResponse = await SocialLogin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] }
      });

      console.log('Apple Login result:', appleSignInResponse);

      if (appleSignInResponse && appleSignInResponse.result && appleSignInResponse.result.idToken) {
        console.log('Handing off ID token to Supabase...');
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: appleSignInResponse.result.idToken,
        });

        if (error) {
          console.error('Supabase identity exchange error:', error);
          throw error;
        }

        console.log('Supabase sign-in success:', data);
        toast({ title: t("auth.welcomeBack"), description: t("auth.signedInSuccess") });
      } else {
        console.warn('Apple Sign-In failed: No ID token received');
        throw new Error('No ID token received from Apple');
      }
    } catch (error) {
      console.error('Apple Login Flow Error:', error);
      toast({
        title: t("general.error"),
        description: error instanceof Error ? error.message : t("general.error"),
        variant: "destructive"
      });
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
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleAppleSignIn} className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-medium">
                          <AppleIcon />
                          {t("Continue With Apple") || "Continue with Apple"}
                        </Button>
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn} className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-medium">
                          <GoogleIcon />
                          {t("Continue With Google") || "Continue with Google"}
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
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleAppleSignIn} className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-medium">
                          <AppleIcon />
                          {t("Continue With Apple") || "Continue with Apple"}
                        </Button>
                        <Button variant="outline" type="button" disabled={isLoading} onClick={handleGoogleSignIn} className="h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-medium">
                          <GoogleIcon />
                          {t("Continue With Google") || "Continue with Google"}
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
