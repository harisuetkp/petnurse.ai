import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { logError, logStep } from "../_shared/logging.ts";

// Ping Google's indexing endpoint to request faster crawling
// Called automatically when a blog post is published
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    const { urls } = await req.json();
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ error: "urls array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sitemapUrl = "https://petnurseai.com/sitemap.xml";
    const results: { url: string; status: string }[] = [];

    // Ping Google sitemap endpoint for each URL
    // This is the free, no-API-key method using sitemap ping
    const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
    
    try {
      const response = await fetch(pingUrl);
      logStep("Google sitemap ping", { status: response.status });
      results.push({ url: sitemapUrl, status: response.ok ? "pinged" : "failed" });
    } catch (e) {
      logError("Google ping", e);
      results.push({ url: sitemapUrl, status: "error" });
    }

    // Also ping Bing
    const bingPingUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(urls[0])}&key=petnurseai`;
    try {
      const bingResponse = await fetch(bingPingUrl);
      logStep("Bing ping", { status: bingResponse.status });
      results.push({ url: "bing", status: bingResponse.ok ? "pinged" : "failed" });
    } catch {
      results.push({ url: "bing", status: "error" });
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logError("ping-google", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
