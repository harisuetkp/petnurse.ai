import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: posts } = await supabase
      .from("blog_posts")
      .select("title, slug, excerpt, content, author_name, published_at, category")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(50);

    const siteUrl = "https://petnurseai.com";
    const now = new Date().toUTCString();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PetNurse AI Blog</title>
    <link>${siteUrl}/blog</link>
    <description>Clinical pet health insights, symptom guides, and toxicology alerts from PetNurse AI.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${siteUrl}/favicon.png</url>
      <title>PetNurse AI Blog</title>
      <link>${siteUrl}/blog</link>
    </image>
`;

    if (posts) {
      for (const post of posts) {
        const pubDate = post.published_at ? new Date(post.published_at).toUTCString() : now;
        const desc = post.excerpt || post.content?.slice(0, 300) || "";
        // Escape XML special chars
        const escXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        
        xml += `    <item>
      <title>${escXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${siteUrl}/blog/${post.slug}</guid>
      <description>${escXml(desc)}</description>
      <author>noreply@petnurseai.com (${escXml(post.author_name)})</author>
      <category>${escXml(post.category)}</category>
      <pubDate>${pubDate}</pubDate>
    </item>
`;
      }
    }

    xml += `  </channel>
</rss>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("RSS feed error:", error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
});
