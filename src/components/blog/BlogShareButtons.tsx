import { useState } from "react";
import { Twitter, Facebook, Link2, MessageCircle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsEvent } from "@/hooks/useAnalyticsEvent";

interface BlogShareButtonsProps {
  title: string;
  slug: string;
}

export function BlogShareButtons({ title, slug }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const { trackEvent } = useAnalyticsEvent();
  const url = `https://petnurseai.com/blog/${slug}`;
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const handleShare = (platform: string) => {
    trackEvent("blog_share", { slug, platform });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    handleShare("copy_link");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      label: "X (Twitter)",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}&via=petnurseai`,
      platform: "twitter",
      className: "hover:bg-black hover:text-white hover:border-black",
    },
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      platform: "facebook",
      className: "hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2]",
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      platform: "whatsapp",
      className: "hover:bg-[#25D366] hover:text-white hover:border-[#25D366]",
    },
  ];

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Share this article
      </p>
      <div className="flex flex-wrap gap-2">
        {shareLinks.map(({ label, icon: Icon, href, platform, className }) => (
          <a
            key={platform}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleShare(platform)}
          >
            <Button
              variant="outline"
              size="sm"
              className={`gap-1.5 text-xs transition-colors ${className}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Button>
          </a>
        ))}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={handleCopy}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Link2 className="h-3.5 w-3.5" />
              Copy Link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
