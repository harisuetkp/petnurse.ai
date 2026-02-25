import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Stethoscope, Lock, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [touched, setTouched] = useState({ password: false, confirmPassword: false });
  const [isResetComplete, setIsResetComplete] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const errors = useMemo(() => ({
    password: touched.password && !password 
      ? "Password is required" 
      : touched.password && password.length < 6 
        ? "Password must be at least 6 characters" 
        : null,
    confirmPassword: touched.confirmPassword && password !== confirmPassword 
      ? "Passwords do not match" 
      : null,
  }), [password, confirmPassword, touched]);

  // Check for auth state changes (password recovery event)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        // User clicked the password reset link in their email
        toast({
          title: "Password Reset",
          description: "Please enter your new password below.",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setIsResetComplete(true);
      toast({
        title: "Password updated!",
        description: "Your password has been successfully reset.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isResetComplete) {
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
            <h2 className="text-2xl font-semibold mb-3">Password Reset Complete</h2>
            <p className="text-muted-foreground mb-6">
              Your password has been successfully updated. You can now sign in with your new password.
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full h-12">
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="safe-area-top p-5">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="rounded-xl">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
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
            <p className="text-muted-foreground">Reset Password</p>
          </div>
        </div>

        {/* Reset Password Form */}
        <div className="apple-card w-full max-w-sm p-6">
          <h2 className="text-xl font-semibold mb-2 text-center">Create New Password</h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            Enter your new password below
          </p>

          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <Label htmlFor="new-password" className="text-muted-foreground">New Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  placeholder="••••••••"
                  className={`pl-12 h-12 rounded-xl border-0 bg-muted ${errors.password ? 'ring-2 ring-destructive' : ''}`}
                  minLength={6}
                  required
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive mt-1.5">{errors.password}</p>
              )}
            </div>
            <div>
              <Label htmlFor="confirm-new-password" className="text-muted-foreground">Confirm New Password</Label>
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirm-new-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched(t => ({ ...t, confirmPassword: true }))}
                  placeholder="••••••••"
                  className={`pl-12 h-12 rounded-xl border-0 bg-muted ${errors.confirmPassword ? 'ring-2 ring-destructive' : ''}`}
                  minLength={6}
                  required
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive mt-1.5">{errors.confirmPassword}</p>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !!errors.password || !!errors.confirmPassword}
              className="w-full h-12"
            >
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
