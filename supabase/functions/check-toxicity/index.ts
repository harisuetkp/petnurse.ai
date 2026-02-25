import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { logError, logStep } from "../_shared/logging.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

const EPA_API_KEY = Deno.env.get("EPA_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// EPA CCTE API endpoints
const EPA_BASE_URL = "https://api-ccte.epa.gov/hazard";

interface ToxicityResult {
  chemical: string;
  found: boolean;
  dtxsid?: string;
  hazardData?: {
    humanHealth: string[];
    ecological: string[];
    cancerClassification?: string;
    developmentalToxicity?: boolean;
    reproductiveToxicity?: boolean;
    acuteToxicity?: string;
  };
  petSpecificRisks?: string[];
  urgencyLevel: "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";
  aiAnalysis?: string;
  error?: string;
}

// Common pet toxins database for quick lookup
const KNOWN_PET_TOXINS: Record<string, { urgency: "HIGH" | "MODERATE"; risks: string[] }> = {
  "xylitol": { urgency: "HIGH", risks: ["Rapid insulin release causing hypoglycemia", "Liver failure within 24-72 hours", "Can be fatal even in small amounts for dogs"] },
  "chocolate": { urgency: "HIGH", risks: ["Theobromine toxicity", "Cardiac arrhythmias", "Seizures", "Dark chocolate more dangerous"] },
  "theobromine": { urgency: "HIGH", risks: ["Cardiac stimulation", "CNS stimulation", "Vomiting, diarrhea", "Potentially fatal in dogs"] },
  "caffeine": { urgency: "HIGH", risks: ["Cardiac arrhythmias", "Tremors", "Seizures", "Hyperactivity"] },
  "grapes": { urgency: "HIGH", risks: ["Acute kidney failure in dogs", "Vomiting within hours", "Lethargy and anorexia"] },
  "raisins": { urgency: "HIGH", risks: ["Acute kidney failure in dogs", "Even small amounts can be toxic", "Rapid onset of symptoms"] },
  "onion": { urgency: "MODERATE", risks: ["Hemolytic anemia", "Oxidative damage to red blood cells", "Weakness and pale gums"] },
  "garlic": { urgency: "MODERATE", risks: ["Similar to onion toxicity but more potent", "GI upset", "Anemia"] },
  "ethylene glycol": { urgency: "HIGH", risks: ["Antifreeze poisoning", "Acute kidney failure", "Fatal if untreated", "Sweet taste attracts pets"] },
  "acetaminophen": { urgency: "HIGH", risks: ["Liver damage", "Methemoglobinemia in cats", "Red blood cell damage"] },
  "ibuprofen": { urgency: "HIGH", risks: ["GI ulceration", "Kidney damage", "Neurological effects at high doses"] },
  "aspirin": { urgency: "MODERATE", risks: ["GI bleeding", "Kidney damage with chronic use", "Cats are extremely sensitive"] },
  "lily": { urgency: "HIGH", risks: ["Acute kidney failure in cats", "All parts of plant toxic", "Even pollen can be dangerous"] },
  "permethrin": { urgency: "HIGH", risks: ["Highly toxic to cats", "Tremors and seizures", "Used in some dog flea products"] },
  "macadamia": { urgency: "MODERATE", risks: ["Weakness in dogs", "Vomiting", "Tremors and hyperthermia"] },
  "avocado": { urgency: "MODERATE", risks: ["Persin toxicity", "GI upset", "More dangerous for birds"] },
  "marijuana": { urgency: "MODERATE", risks: ["CNS depression", "Incoordination", "Urinary incontinence"] },
  "alcohol": { urgency: "HIGH", risks: ["Ethanol toxicity", "Hypoglycemia", "Respiratory depression", "Coma"] },
};

async function searchEPAChemical(chemicalName: string): Promise<{ dtxsid?: string; found: boolean }> {
  try {
    // Search for chemical by name
    const searchUrl = `https://api-ccte.epa.gov/chemical/search/equal/${encodeURIComponent(chemicalName)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        "x-api-key": EPA_API_KEY!,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      logStep("EPA search failed", { status: response.status });
      return { found: false };
    }

    const data = await response.json();
    
    if (data && Array.isArray(data) && data.length > 0) {
      return { dtxsid: data[0].dtxsid, found: true };
    }
    
    return { found: false };
  } catch (error) {
    logError("EPA chemical search", error);
    return { found: false };
  }
}

async function getHazardData(dtxsid: string): Promise<ToxicityResult["hazardData"] | null> {
  try {
    const hazardUrl = `${EPA_BASE_URL}/human/search/by-dtxsid/${dtxsid}`;
    
    const response = await fetch(hazardUrl, {
      headers: {
        "x-api-key": EPA_API_KEY!,
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      logStep("EPA hazard data failed", { status: response.status });
      return null;
    }

    const data = await response.json();
    
    // Process hazard data
    const hazardData: ToxicityResult["hazardData"] = {
      humanHealth: [],
      ecological: [],
    };

    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.humanHealthHazard) {
          hazardData.humanHealth.push(item.humanHealthHazard);
        }
        if (item.cancerClassification) {
          hazardData.cancerClassification = item.cancerClassification;
        }
        if (item.developmentalToxicity !== undefined) {
          hazardData.developmentalToxicity = item.developmentalToxicity;
        }
        if (item.reproductiveToxicity !== undefined) {
          hazardData.reproductiveToxicity = item.reproductiveToxicity;
        }
        if (item.acuteToxicity) {
          hazardData.acuteToxicity = item.acuteToxicity;
        }
      }
    }

    return hazardData;
  } catch (error) {
    logError("EPA hazard data fetch", error);
    return null;
  }
}

async function analyzeWithAI(chemical: string, epaData: ToxicityResult["hazardData"] | null | undefined, petSpecies?: string): Promise<string> {
  if (!LOVABLE_API_KEY) return "";

  try {
    const prompt = `You are a veterinary toxicologist. Analyze the following chemical toxicity data for pet safety.

Chemical: ${chemical}
Pet Species: ${petSpecies || "dog or cat"}

EPA Hazard Data:
- Human Health Effects: ${epaData?.humanHealth?.join(", ") || "Not available"}
- Cancer Classification: ${epaData?.cancerClassification || "Not classified"}
- Developmental Toxicity: ${epaData?.developmentalToxicity ? "Yes" : "Unknown"}
- Reproductive Toxicity: ${epaData?.reproductiveToxicity ? "Yes" : "Unknown"}
- Acute Toxicity: ${epaData?.acuteToxicity || "Unknown"}

Provide a brief (2-3 sentences) clinical assessment of the risk this chemical poses to pets, focusing on:
1. Severity of potential toxicity
2. Common exposure routes for pets
3. Key symptoms to watch for

Be direct and clinically accurate.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return "";
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    logError("AI analysis", error);
    return "";
  }
}

async function checkToxicity(chemical: string, petSpecies?: string): Promise<ToxicityResult> {
  const normalizedChemical = chemical.toLowerCase().trim();
  
  // Check known pet toxins first for fast response
  const knownToxin = KNOWN_PET_TOXINS[normalizedChemical];
  if (knownToxin) {
    logStep("Known pet toxin found", { chemical: normalizedChemical });
    
    // Get AI analysis for known toxins too
    const aiAnalysis = await analyzeWithAI(chemical, null, petSpecies);
    
    return {
      chemical,
      found: true,
      hazardData: {
        humanHealth: knownToxin.risks,
        ecological: [],
      },
      petSpecificRisks: knownToxin.risks,
      urgencyLevel: knownToxin.urgency,
      aiAnalysis: aiAnalysis || `${chemical} is a known pet toxin requiring immediate veterinary attention.`,
    };
  }

  // Search EPA database
  if (!EPA_API_KEY) {
    logStep("EPA API key not configured");
    return {
      chemical,
      found: false,
      urgencyLevel: "UNKNOWN",
      error: "EPA API not configured",
    };
  }

  const searchResult = await searchEPAChemical(chemical);
  
  if (!searchResult.found || !searchResult.dtxsid) {
    // Try AI analysis even without EPA data
    const aiAnalysis = await analyzeWithAI(chemical, null, petSpecies);
    
    return {
      chemical,
      found: false,
      urgencyLevel: "UNKNOWN",
      aiAnalysis: aiAnalysis || `Unable to find toxicity data for "${chemical}". If you suspect your pet ingested this substance, contact your veterinarian or poison control.`,
    };
  }

  // Get hazard data from EPA
  const hazardData = await getHazardData(searchResult.dtxsid);
  
  // Determine urgency based on hazard data
  let urgencyLevel: ToxicityResult["urgencyLevel"] = "LOW";
  if (hazardData) {
    if (hazardData.acuteToxicity?.toLowerCase().includes("high") || 
        hazardData.acuteToxicity?.toLowerCase().includes("fatal") ||
        hazardData.humanHealth.some(h => h.toLowerCase().includes("fatal") || h.toLowerCase().includes("death"))) {
      urgencyLevel = "HIGH";
    } else if (hazardData.developmentalToxicity || 
               hazardData.reproductiveToxicity ||
               hazardData.humanHealth.length > 2) {
      urgencyLevel = "MODERATE";
    }
  }

  // Get AI analysis
  const aiAnalysis = await analyzeWithAI(chemical, hazardData, petSpecies);

  return {
    chemical,
    found: true,
    dtxsid: searchResult.dtxsid,
    hazardData: hazardData ?? undefined,
    urgencyLevel,
    aiAnalysis,
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    // Health check endpoint
    const url = new URL(req.url);
    if (url.pathname.endsWith("/health")) {
      return new Response(JSON.stringify({ status: "ok", service: "check-toxicity" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by IP - 10 requests per minute
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`toxicity:${clientIP}`, 10);
    if (!rateLimit.allowed) {
      return rateLimitResponse(corsHeaders, rateLimit.resetAt);
    }

    const body = await req.json();
    const { chemical, chemicals, petSpecies } = body;

    // Support both single chemical and array of chemicals
    if (chemicals && Array.isArray(chemicals)) {
      const results = await Promise.all(
        chemicals.slice(0, 10).map((c: string) => checkToxicity(c, petSpecies))
      );
      
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!chemical || typeof chemical !== "string") {
      return new Response(JSON.stringify({ error: "Chemical name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (chemical.length > 200) {
      return new Response(JSON.stringify({ error: "Chemical name too long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Checking toxicity", { chemical, petSpecies });
    
    const result = await checkToxicity(chemical, petSpecies);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logError("check-toxicity", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
