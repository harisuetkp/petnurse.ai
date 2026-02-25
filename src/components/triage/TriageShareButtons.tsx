import { memo, useCallback } from "react";
import { Share2, Twitter, Facebook, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";
import { useState } from "react";

interface TriageShareButtonsProps {
  reportStatus: string;
  petName?: string;
}

export const TriageShareButtons = memo(function TriageShareButtons({
  reportStatus,
  petName,
}: TriageShareButtonsProps) {
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsEvent();
  const [copied, setCopied] = useState(false);

  const shareUrl = "https://petnurseai.com/triage";
  const shareText = petName
    ? `Just used PetNurse AI to check ${petName}'s symptoms — got a structured triage assessment in minutes. Free & available 24/7 🐾`
    : `Just used PetNurse AI for a free pet symptom check — instant structured triage assessment. Highly recommend for pet owners 🐾`;

  const handleShare = useCallback(
    async (platform: string) => {
      trackEvent("triage_result_share", { platform, reportStatus });

      if (platform === "native" && navigator.share) {
        try {
          await navigator.share({ title: "PetNurse AI — Pet Symptom Check", text: shareText, url: shareUrl });
        } catch {
          // user cancelled
        }
        return;
      }

      const urls: Record<string, string> = {
        twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`,
        whatsapp: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`,
      };

      if (platform === "copy") {
        await navigator.clipboard.writeText(shareText + " " + shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({ title: "Copied!", description: "Share link copied to clipboard." });
        return;
      }

      if (urls[platform]) {
        window.open(urls[platform], "_blank", "noopener,noreferrer,width=600,height=400");
      }
    },
    [shareText, shareUrl, trackEvent, reportStatus, toast]
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <Share2 className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Share with fellow pet owners</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Help other pet parents access free symptom checks
      </p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {navigator.share && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleShare("native")}
            className="rounded-xl text-xs"
          >
            <Share2 className="h-3.5 w-3.5 mr-1" />
            Share
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("twitter")}
          className="rounded-xl text-xs"
        >
          <Twitter className="h-3.5 w-3.5 mr-1" />
          X
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("facebook")}
          className="rounded-xl text-xs"
        >
          <Facebook className="h-3.5 w-3.5 mr-1" />
          Facebook
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("whatsapp")}
          className="rounded-xl text-xs"
        >
          WhatsApp
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleShare("copy")}
          className="rounded-xl text-xs"
        >
          {copied ? (
            <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-safe-green" />
          ) : (
            <Copy className="h-3.5 w-3.5 mr-1" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
});
