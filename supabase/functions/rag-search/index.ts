import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logApiError, logError, logUserAction } from "../_shared/logging.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Input validation constants
const MAX_QUERY_LENGTH = 1000;

// Rate limit: 30 requests per minute for RAG search
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60000;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Validate authentication
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      console.log("RAG search auth failed");
      return unauthorizedResponse(corsHeaders, authResult.error);
    }
    
    const userId = authResult.userId;
    
    // Apply rate limiting
    const rateLimitResult = checkRateLimit(`rag-${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user: ${userId?.slice(0, 8)}...`);
      return rateLimitResponse(corsHeaders, rateLimitResult.resetAt);
    }
    
    logUserAction("RAG search request", userId || "unknown");

    const { query, type } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate query length
    if (typeof query !== 'string' || query.length > MAX_QUERY_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Query exceeds maximum length of ${MAX_QUERY_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate embedding for the query using Lovable AI
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 768,
      }),
    });

    if (!embeddingResponse.ok) {
      logApiError("Embedding API", embeddingResponse.status);
      // Fall back to returning empty results if embeddings fail
      return new Response(
        JSON.stringify({ results: [], fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      return new Response(
        JSON.stringify({ results: [], fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search the knowledge base using vector similarity
    const searchResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_veterinary_knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_threshold: 0.5,
        match_count: 5,
      }),
    });

    if (!searchResponse.ok) {
      logApiError("Knowledge search", searchResponse.status);
      return new Response(
        JSON.stringify({ results: [], fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await searchResponse.json();

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    logError("RAG search", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "Internal server error", results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
