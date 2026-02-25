import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
}

/**
 * Reusable SEO head component for static pages.
 * Sets document title, meta tags, OG tags, canonical URL.
 */
export function SeoHead({
  title,
  description,
  canonicalPath,
  ogType = "website",
  ogImage = "https://storage.googleapis.com/gpt-engineer-file-uploads/VRLrdsVR9dP3qLHqfvpKEH0FC7r1/social-images/social-1770849878532-39D70AC0-7665-43A8-AF82-C74105554B86.png",
  noindex = false,
}: SeoHeadProps) {
  const siteUrl = "https://petnurseai.com";
  const fullUrl = `${siteUrl}${canonicalPath}`;

  useEffect(() => {
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:url", fullUrl);
    setMeta("property", "og:type", ogType);
    setMeta("property", "og:site_name", "PetNurse AI");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);
    setMeta("name", "twitter:card", "summary_large_image");

    if (noindex) {
      setMeta("name", "robots", "noindex, nofollow");
    }

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", fullUrl);

    return () => {
      document.title = "Pet Nurse AI – Daily Pet Health Companion";
    };
  }, [title, description, fullUrl, ogType, ogImage, noindex]);

  return null;
}
