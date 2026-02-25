import { useEffect, useState, forwardRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import petnurseLogo from "@/assets/petnurse-logo-new.png";

const PaymentSuccessPage = forwardRef<HTMLDivElement>(function PaymentSuccessPage(_props, ref) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Check subscription status to verify payment
        const { data, error } = await supabase.functions.invoke("check-subscription");
        
        if (!error && data?.isPremium) {
          setIsVerified(true);
        }
      } catch (e) {
        console.error("Verification error:", e);
      } finally {
        setIsVerifying(false);
      }
    };

    // Small delay to allow Stripe to process
    const timer = setTimeout(verifyPayment, 2000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  return (
    <div ref={ref} className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="text-center max-w-md mx-auto">
        {isVerifying ? (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              Processing Payment...
            </h1>
            <p className="text-muted-foreground">
              Please wait while we confirm your purchase.
            </p>
          </>
        ) : (
          <>
            <div className="relative mb-6 mx-auto w-fit">
              <img 
                src={petnurseLogo} 
                alt="PetNurse AI" 
                className="h-24 w-24 rounded-3xl object-cover shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 p-2 bg-safe-green rounded-full shadow-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>

            <h1 className="text-3xl font-semibold text-foreground mb-3">
              {isVerified ? "Payment Successful!" : "Thank You!"}
            </h1>
            
            <p className="text-muted-foreground mb-8">
              {isVerified 
                ? "You now have full access to PetNurse AI Premium features. Your pets are protected 24/7!"
                : "Your payment is being processed. You'll have access shortly."
              }
            </p>

            <div className="space-y-3">
              <Button
                onClick={() => navigate("/")}
                size="lg"
                className="w-full h-14 text-base"
              >
                Start Triage Assessment
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
              
              <Button
                onClick={() => navigate("/premium")}
                variant="outline"
                size="lg"
                className="w-full h-12"
              >
                View My Subscription
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-8">
              A confirmation email has been sent to your registered email address.
            </p>
          </>
        )}
      </div>
    </div>
  );
});

export default PaymentSuccessPage;
