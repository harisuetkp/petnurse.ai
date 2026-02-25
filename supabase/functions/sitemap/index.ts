import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false });

    // Fetch veterinary knowledge for programmatic pages
    const { data: knowledge } = await supabase
      .from("veterinary_knowledge")
      .select("title, category, created_at")
      .order("title");

    const siteUrl = "https://petnurseai.com";

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/about", priority: "0.8", changefreq: "monthly" },
      { loc: "/blog", priority: "0.9", changefreq: "daily" },
      { loc: "/triage", priority: "0.8", changefreq: "weekly" },
      { loc: "/clinic-finder", priority: "0.7", changefreq: "weekly" },
      { loc: "/premium", priority: "0.7", changefreq: "monthly" },
      { loc: "/reviews", priority: "0.6", changefreq: "weekly" },
      { loc: "/community", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.3", changefreq: "yearly" },
      { loc: "/terms-of-service", priority: "0.3", changefreq: "yearly" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

    for (const page of staticPages) {
      xml += `  <url>
    <loc>${siteUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`;
    }

    if (posts) {
      for (const post of posts) {
        const lastmod = post.updated_at || post.published_at || "";
        xml += `  <url>
    <loc>${siteUrl}/blog/${post.slug}</loc>
    <lastmod>${lastmod.split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add programmatic symptom/toxin pages
    const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    
    if (knowledge) {
      // Add index pages
      xml += `  <url>
    <loc>${siteUrl}/symptoms</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${siteUrl}/toxins</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
      for (const entry of knowledge) {
        const isSymptom = ["symptoms", "clinical_signs", "emergency", "first_aid"].includes(entry.category);
        const isToxin = entry.category === "toxicology";
        const prefix = isToxin ? "toxins" : isSymptom ? "symptoms" : null;
        if (!prefix) continue;
        
        const lastmod = entry.created_at?.split("T")[0] || "";
        xml += `  <url>
    <loc>${siteUrl}/${prefix}/${slugify(entry.title)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
      }
    }

    xml += `</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
});
