import { useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface OtpVerificationProps {
  email: string;
  onBack: () => void;
}

export default function OtpVerification({ email, onBack }: OtpVerificationProps) {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleVerify = async () => {
    if (otp.length !== 6) {
      toast({ title: "Enter the full code", description: "Please enter all 6 digits.", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "signup",
      });

      if (error) throw error;

      if (data.session) {
        queryClient.setQueryData(["session"], data.session);
      }

      toast({ title: "Email verified! ✅", description: "Your account is now active. Welcome!" });
    } catch (error) {
      toast({
        title: "Invalid code",
        description: error instanceof Error ? error.message : "The code you entered is incorrect or expired. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      toast({ title: "Code resent! 📧", description: "Check your email for the new verification code." });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend code",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Verify your email</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We sent a 6-digit code to<br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      <div className="flex justify-center">
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button
        onClick={handleVerify}
        disabled={isVerifying || otp.length !== 6}
        className="w-full h-11 rounded-xl"
      >
        {isVerifying ? "Verifying..." : "Verify & Sign In"}
      </Button>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={handleResend}
          disabled={isResending}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Didn't get the code? Resend"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:underline"
        >
          Use a different email
        </button>
      </div>
    </div>
  );
}
