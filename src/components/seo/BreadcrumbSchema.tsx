import { useEffect } from "react";

interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

/**
 * Injects BreadcrumbList JSON-LD structured data.
 * Shows breadcrumb trails in Google search results for higher CTR.
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  useEffect(() => {
    const scriptId = "breadcrumb-jsonld";
    const siteUrl = "https://petnurseai.com";

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: `${siteUrl}${item.path}`,
      })),
    });

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [items]);

  return null;
}
