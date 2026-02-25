import { useMemo } from "react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  htmlContent: string;
}

export function TableOfContents({ htmlContent }: TableOfContentsProps) {
  const items = useMemo<TocItem[]>(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    const headings = doc.querySelectorAll("h2, h3");
    return Array.from(headings).map((el, i) => {
      const text = el.textContent || "";
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `heading-${i}`;
      return {
        id,
        text,
        level: el.tagName === "H2" ? 2 : 3,
      };
    });
  }, [htmlContent]);

  if (items.length < 2) return null;

  return (
    <nav className="mb-8 p-4 rounded-xl border border-border bg-muted/30" aria-label="Table of contents">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        In this article
      </p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
            <a
              href={`#${item.id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Inject IDs into h2/h3 elements in HTML string so anchor links work */
export function injectHeadingIds(html: string): string {
  let counter = 0;
  return html.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, content) => {
    const text = content.replace(/<[^>]+>/g, "");
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `heading-${counter}`;
    counter++;
    return `<${tag}${attrs} id="${id}">${content}</${tag}>`;
  });
}
