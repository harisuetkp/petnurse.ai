/**
 * Auto-internal linking utility for blog content.
 * Scans HTML content and links symptom/toxin keywords to their dedicated pages.
 */

interface LinkTarget {
  keyword: string;
  url: string;
  priority: number; // higher = more important, linked first
}

// Common symptom/condition keywords mapped to symptom pages
const SYMPTOM_LINKS: LinkTarget[] = [
  { keyword: "vomiting", url: "/symptoms/vomiting", priority: 10 },
  { keyword: "diarrhea", url: "/symptoms/diarrhea", priority: 10 },
  { keyword: "lethargy", url: "/symptoms/lethargy", priority: 9 },
  { keyword: "limping", url: "/symptoms/limping", priority: 9 },
  { keyword: "seizure", url: "/symptoms/seizures", priority: 10 },
  { keyword: "seizures", url: "/symptoms/seizures", priority: 10 },
  { keyword: "hair loss", url: "/symptoms/hair-loss", priority: 8 },
  { keyword: "itching", url: "/symptoms/itching", priority: 8 },
  { keyword: "coughing", url: "/symptoms/coughing", priority: 8 },
  { keyword: "sneezing", url: "/symptoms/sneezing", priority: 7 },
  { keyword: "loss of appetite", url: "/symptoms/loss-of-appetite", priority: 8 },
  { keyword: "excessive thirst", url: "/symptoms/excessive-thirst", priority: 7 },
  { keyword: "blood in stool", url: "/symptoms/blood-in-stool", priority: 9 },
  { keyword: "blood in urine", url: "/symptoms/blood-in-urine", priority: 9 },
  { keyword: "eye discharge", url: "/symptoms/eye-discharge", priority: 7 },
  { keyword: "ear infection", url: "/symptoms/ear-infection", priority: 8 },
  { keyword: "swollen abdomen", url: "/symptoms/swollen-abdomen", priority: 8 },
  { keyword: "difficulty breathing", url: "/symptoms/difficulty-breathing", priority: 10 },
  { keyword: "weight loss", url: "/symptoms/weight-loss", priority: 7 },
  { keyword: "excessive drooling", url: "/symptoms/excessive-drooling", priority: 7 },
];

const TOXIN_LINKS: LinkTarget[] = [
  { keyword: "chocolate", url: "/toxins/chocolate", priority: 10 },
  { keyword: "xylitol", url: "/toxins/xylitol", priority: 10 },
  { keyword: "grapes", url: "/toxins/grapes", priority: 9 },
  { keyword: "raisins", url: "/toxins/raisins", priority: 9 },
  { keyword: "onion", url: "/toxins/onions", priority: 8 },
  { keyword: "garlic", url: "/toxins/garlic", priority: 8 },
  { keyword: "antifreeze", url: "/toxins/antifreeze", priority: 10 },
  { keyword: "rat poison", url: "/toxins/rat-poison", priority: 10 },
  { keyword: "lily", url: "/toxins/lilies", priority: 9 },
  { keyword: "lilies", url: "/toxins/lilies", priority: 9 },
  { keyword: "ibuprofen", url: "/toxins/ibuprofen", priority: 9 },
  { keyword: "acetaminophen", url: "/toxins/acetaminophen", priority: 9 },
  { keyword: "tylenol", url: "/toxins/acetaminophen", priority: 8 },
  { keyword: "marijuana", url: "/toxins/marijuana", priority: 8 },
  { keyword: "avocado", url: "/toxins/avocado", priority: 7 },
  { keyword: "macadamia", url: "/toxins/macadamia-nuts", priority: 7 },
];

const ALL_LINKS = [...SYMPTOM_LINKS, ...TOXIN_LINKS].sort((a, b) => b.priority - a.priority);

/**
 * Injects internal links into blog HTML content.
 * Only links the FIRST occurrence of each keyword.
 * Skips content already inside <a> tags, headings, or code blocks.
 */
export function injectInternalLinks(html: string): string {
  if (!html) return html;

  const linkedKeywords = new Set<string>();
  let result = html;
  const maxLinks = 6; // Don't over-link

  for (const link of ALL_LINKS) {
    if (linkedKeywords.size >= maxLinks) break;
    if (linkedKeywords.has(link.url)) continue;

    // Case-insensitive match for keyword NOT already inside an <a> tag or heading
    // Use a regex that matches the keyword only in plain text (not inside HTML tags)
    const escapedKeyword = link.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?<![<\\/\\w])(?<!href=["'][^"']*)(\\b${escapedKeyword}\\b)(?![^<]*<\\/a>)(?![^<]*<\\/h[1-6]>)`,
      "i"
    );

    const match = result.match(regex);
    if (match && match.index !== undefined) {
      // Check we're not inside an existing <a> tag by counting open/close tags before this point
      const before = result.substring(0, match.index);
      const openAs = (before.match(/<a\s/gi) || []).length;
      const closeAs = (before.match(/<\/a>/gi) || []).length;
      if (openAs > closeAs) continue; // Inside an <a> tag, skip

      const replacement = `<a href="https://petnurseai.com${link.url}" class="text-primary underline">${match[0]}</a>`;
      result = result.substring(0, match.index) + replacement + result.substring(match.index + match[0].length);
      linkedKeywords.add(link.url);
    }
  }

  return result;
}
