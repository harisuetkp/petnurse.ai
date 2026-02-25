import { useEffect } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

interface BlogSeoHeadProps {
  title: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImageUrl?: string | null;
  authorName: string;
  publishedAt?: string | null;
  category: string;
  slug: string;
  excerpt?: string | null;
  faqs?: FaqItem[] | null;
}

export function BlogSeoHead({
  title,
  metaTitle,
  metaDescription,
  ogImageUrl,
  authorName,
  publishedAt,
  category,
  slug,
  excerpt,
  faqs,
}: BlogSeoHeadProps) {
  const pageTitle = metaTitle || title;
  const description = metaDescription || excerpt || `${title} — Clinical insights from PetNurse AI`;
  const canonicalUrl = `https://petnurseai.com/blog/${slug}`;
  const image = ogImageUrl || "https://storage.googleapis.com/gpt-engineer-file-uploads/VRLrdsVR9dP3qLHqfvpKEH0FC7r1/social-images/social-1770849878532-39D70AC0-7665-43A8-AF82-C74105554B86.png";

  useEffect(() => {
    // Set document title
    document.title = `${pageTitle} | PetNurse AI`;

    // Helper to set or create meta tag
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
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", description);
    setMeta("property", "og:image", image);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "article");
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", image);
    setMeta("name", "twitter:card", "summary_large_image");

    if (publishedAt) {
      setMeta("property", "article:published_time", publishedAt);
    }

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // Article JSON-LD
    const articleSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: pageTitle,
      description,
      image,
      author: { "@type": "Organization", name: authorName },
      publisher: {
        "@type": "Organization",
        name: "PetNurse AI",
        url: "https://petnurseai.com",
      },
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
      articleSection: category,
    };
    if (publishedAt) {
      articleSchema.datePublished = publishedAt;
    }

    const articleScriptId = "blog-article-jsonld";
    let articleScript = document.getElementById(articleScriptId) as HTMLScriptElement | null;
    if (!articleScript) {
      articleScript = document.createElement("script");
      articleScript.id = articleScriptId;
      articleScript.type = "application/ld+json";
      document.head.appendChild(articleScript);
    }
    articleScript.textContent = JSON.stringify(articleSchema);

    // FAQ JSON-LD
    const faqScriptId = "blog-faq-jsonld";
    let faqScript = document.getElementById(faqScriptId) as HTMLScriptElement | null;

    if (faqs && faqs.length > 0) {
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      };
      if (!faqScript) {
        faqScript = document.createElement("script");
        faqScript.id = faqScriptId;
        faqScript.type = "application/ld+json";
        document.head.appendChild(faqScript);
      }
      faqScript.textContent = JSON.stringify(faqSchema);
    } else if (faqScript) {
      faqScript.remove();
    }

    return () => {
      document.getElementById(articleScriptId)?.remove();
      document.getElementById(faqScriptId)?.remove();
      document.title = "Pet Nurse AI – Daily Pet Health Companion";
    };
  }, [pageTitle, description, image, canonicalUrl, authorName, publishedAt, category, faqs]);

  return null;
}
