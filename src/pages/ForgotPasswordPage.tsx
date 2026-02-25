import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Stethoscope, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail } from "@/lib/emailValidation";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const emailError = useMemo(() => {
    if (!touched) return null;
    return validateEmail(email);
  }, [email, touched]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setIsEmailSent(true);
      toast({
        title: "Reset email sent!",
        description: "Check your inbox for the password reset link.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="safe-area-top p-5">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
          <div className="apple-card w-full max-w-sm p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 rounded-full bg-primary/10">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold mb-3">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <strong>{email}</strong>. Click the link in the email to reset your password.
            </p>
            <div className="space-y-3">
              <Button variant="outline" onClick={() => setIsEmailSent(false)} className="w-full h-12">
                Try Different Email
              </Button>
              <Button variant="ghost" onClick={() => navigate("/auth")} className="w-full">
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="safe-area-top p-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/auth")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Sign In
        </Button>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-12">
          <div className="p-4 rounded-[24px] bg-primary/10">
            <Stethoscope className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">PetNurse AI</h1>
            <p className="text-muted-foreground">Forgot Password</p>
          </div>
        </div>

        {/* Forgot Password Form */}
        <div className="apple-card w-full max-w-sm p-6">
          <h2 className="text-xl font-semibold mb-2 text-center">Reset Your Password</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your email and we'll send you a link to reset your password
          </p>

          <form onSubmit={handleResetRequest} className="space-y-5">
            <div>
              <Label htmlFor="reset-email" className="text-muted-foreground">Email</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="you@example.com"
                  className={`pl-12 h-12 rounded-xl border-0 bg-muted ${emailError ? 'ring-2 ring-destructive' : ''}`}
                  required
                />
              </div>
              {emailError && (
                <p className="text-xs text-destructive mt-1.5">{emailError}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !!emailError}
              className="w-full h-12"
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{" "}
            <button 
              onClick={() => navigate("/auth")}
              className="text-primary hover:underline font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
