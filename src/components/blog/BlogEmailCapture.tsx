import { useState } from "react";
import { Mail, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

interface BlogEmailCaptureProps {
  slug?: string;
}

export function BlogEmailCapture({ slug }: BlogEmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { trackEvent } = useAnalyticsEvent();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      // Insert into community_waitlist as a simple email capture
      const { error } = await supabase
        .from("community_waitlist")
        .insert({ email, premium_status: false });

      if (error && error.code !== "23505") {
        // 23505 = unique violation (already subscribed), treat that as success
        throw error;
      }

      trackEvent("blog_email_capture", { slug, email });
      setStatus("success");
    } catch (err) {
      console.error("Email capture error:", err);
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="my-10 p-6 rounded-2xl border border-primary/20 bg-primary/5 text-center">
        <CheckCircle className="h-8 w-8 text-primary mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-foreground mb-1">You're on the list!</h3>
        <p className="text-xs text-muted-foreground">
          We'll send you new pet health articles as soon as they're published.
        </p>
      </div>
    );
  }

  return (
    <div className="my-10 p-6 rounded-2xl border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-5 w-5 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground">
          Get new pet health articles delivered to your inbox
        </h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4 ml-7">
        Join thousands of pet owners who get clinical insights from PetNurse AI — no spam, unsubscribe anytime.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 ml-7">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-sm h-9 flex-1 max-w-xs"
          disabled={status === "loading"}
        />
        <Button type="submit" size="sm" disabled={status === "loading"} className="h-9 px-4 text-xs">
          {status === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            "Subscribe"
          )}
        </Button>
      </form>
      {errorMsg && (
        <p className="text-xs text-destructive mt-2 ml-7">{errorMsg}</p>
      )}
    </div>
  );
}
