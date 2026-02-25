import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { validateAuth, unauthorizedResponse } from "../_shared/auth.ts";
import { logApiError, logError, logUserAction } from "../_shared/logging.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

// Rate limit: 30 requests per minute for triage
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60000;

const TOXICOLOGY_REFERENCE = `
## STRICT TOXICOLOGY & TRIAGE REFERENCE

### A. LIFE-THREATENING (IMMEDIATE RED - EMERGENCY):
**Symptoms:**
- Difficulty breathing, blue/pale gums
- Seizures, non-responsive/unconscious
- Bloated/hard abdomen (especially sudden)
- Inability to urinate (especially male cats - can be fatal within 24-48hrs)
- Collapse, extreme weakness
- Profuse bleeding that won't stop
- Suspected broken spine or severe trauma

**Toxic Ingestions (IMMEDIATE EMERGENCY):**
- Xylitol (found in sugar-free gum, mints, peanut butter, toothpaste) - causes rapid insulin release, liver failure
- Lilies (ALL parts, for CATS) - causes acute kidney failure, often fatal
- Grapes/Raisins - kidney failure in dogs
- Dark Chocolate/Cacao/Baking chocolate - cardiac issues, seizures
- Antifreeze (ethylene glycol) - kidney failure, often fatal
- Rat Poison (rodenticides) - internal bleeding
- Sago Palm (all parts) - liver failure
- Azaleas/Rhododendrons - cardiac failure
- Oleander - cardiac arrest
- Onion/Garlic (large amounts) - hemolytic anemia

### B. URGENT (YELLOW - Vet Within 24 Hours):
**Symptoms:**
- Frequent vomiting (3+ times in a few hours)
- Non-weight-bearing lameness (won't put foot down)
- Eye injuries, squinting, discharge
- Hives/facial swelling (allergic reaction)
- Blood in stool or urine
- Persistent coughing or labored breathing
- Not eating for 24+ hours
- Lethargy combined with other symptoms

**Ingestions (Monitor Closely):**
- Milk chocolate (dose-dependent, calculate mg/kg)
- Macadamia nuts (weakness, vomiting)
- Avocado (mild toxicity, mainly birds/rabbits)
- Most houseplants causing GI irritation
- Small amounts of human medications

### C. STABLE (GREEN - Home Care/Monitor):
**Symptoms:**
- Single bout of vomiting (if acting normal after)
- Mild diarrhea (no blood, pet is alert)
- Minor skin scrape or small cut
- Mild limping (still eating, drinking, alert)
- Occasional coughing (not persistent)
- Minor eye discharge (clear)

**Safe for Monitoring:**
- Ate a small piece of bread, rice, plain cooked meat
- Minor hair loss
- Occasional sneezing
`;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// RED EMERGENCY keywords that MUST trigger immediate RED status
const RED_KEYWORDS = [
  "not breathing", "stopped breathing", "can't breathe", "cannot breathe",
  "blue gums", "purple gums", "cyanotic", "white gums", "very pale gums",
  "collapsed", "unresponsive", "unconscious", "won't wake up", "not moving",
  "seizure", "seizing", "convulsing", "multiple seizures", "cluster seizures",
  "severe bleeding", "blood everywhere", "profuse bleeding", "won't stop bleeding",
  "hit by car", "major trauma", "severe trauma",
  "bloated stomach", "stomach twisted", "distended abdomen", "retching but nothing coming up",
  "ate xylitol", "ate antifreeze", "ate rat poison", "ate lily", "lilies",
  "heart stopped", "no pulse", "gasping",
  "completely limp", "extreme weakness", "extremely weak",
  "hyperthermia", "heat stroke", "body temperature over 105",
  "hypothermia", "body temperature under 98"
];

// ORANGE URGENT keywords for Level 2 urgency
const ORANGE_KEYWORDS = [
  "difficulty breathing", "labored breathing", "rapid breathing",
  "having seizure", "just had seizure", "had a seizure",
  "ate something toxic", "ingested poison", "ate chocolate", "ate grapes", "ate raisins",
  "cannot walk", "can't walk", "dragging legs", "paralyzed", "sudden paralysis",
  "straining to urinate", "cannot pee", "can't urinate", "blocked cat",
  "vomiting blood", "bloody diarrhea", "blood in vomit", "blood in stool",
  "swollen face", "hives", "allergic reaction",
  "extremely lethargic", "won't eat", "refuses to eat",
  "racing heart", "irregular heartbeat", "arrhythmia",
  "very weak pulse", "pale gums", "weak and wobbly",
  "crying in pain", "extreme pain", "severe pain"
];

function checkForEmergencyKeywords(text: string): { isRed: boolean; isOrange: boolean; matchedKeywords: string[] } {
  const lowerText = text.toLowerCase();
  const matchedRed: string[] = [];
  const matchedOrange: string[] = [];
  
  for (const keyword of RED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedRed.push(keyword);
    }
  }
  
  for (const keyword of ORANGE_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      matchedOrange.push(keyword);
    }
  }
  
  return {
    isRed: matchedRed.length > 0,
    isOrange: matchedOrange.length > 0,
    matchedKeywords: [...matchedRed, ...matchedOrange]
  };
}

interface KnowledgeResult {
  title: string;
  category: string;
  content: string;
  source?: string;
  similarity: number;
}

async function searchKnowledgeBase(query: string, apiKey: string, prioritizeEmergency = false): Promise<{ context: string; results: KnowledgeResult[] }> {
  try {
    const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: query,
        dimensions: 768,
      }),
    });

    if (!embeddingResponse.ok) {
      logApiError("Triage embedding", embeddingResponse.status);
      return { context: "", results: [] };
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) return { context: "", results: [] };

    const searchResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_veterinary_knowledge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_SERVICE_ROLE_KEY!,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_threshold: 0.4,
        match_count: 8,
      }),
    });

    if (!searchResponse.ok) {
      logApiError("Triage knowledge search", searchResponse.status);
      return { context: "", results: [] };
    }

    const results: KnowledgeResult[] = await searchResponse.json();
    
    if (!results || results.length === 0) return { context: "", results: [] };

    // Sort by priority: RED_EMERGENCY first, then ORANGE_URGENT, then by similarity
    const sortedResults = results.sort((a, b) => {
      const categoryPriority = (cat: string) => {
        if (cat === 'RED_EMERGENCY') return 0;
        if (cat === 'ORANGE_URGENT') return 1;
        return 2;
      };
      const priorityDiff = categoryPriority(a.category) - categoryPriority(b.category);
      if (priorityDiff !== 0) return priorityDiff;
      return b.similarity - a.similarity;
    });

    const context = sortedResults.slice(0, 5).map((r) => 
      `### ${r.title} [${r.category}]\n${r.content}${r.source ? `\n(Source: ${r.source})` : ""}`
    ).join("\n\n");

    return { context, results: sortedResults };
  } catch (error) {
    logError("RAG search", error);
    return { context: "", results: [] };
  }
}

// Input validation constants
const MAX_MESSAGE_LENGTH = 2000;
const MAX_SYMPTOM_LENGTH = 1000;
const MAX_MESSAGES = 50;
const MAX_PET_NAME_LENGTH = 100;
const MAX_ANSWERS = 20;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateTriageInput(body: Record<string, unknown>): ValidationResult {
  // Validate symptom description
  if (body.symptomDescription && typeof body.symptomDescription === 'string') {
    if (body.symptomDescription.length > MAX_SYMPTOM_LENGTH) {
      return { valid: false, error: `Symptom description exceeds maximum length of ${MAX_SYMPTOM_LENGTH} characters` };
    }
  }

  // Validate messages array
  if (body.messages && Array.isArray(body.messages)) {
    if (body.messages.length > MAX_MESSAGES) {
      return { valid: false, error: `Too many messages in conversation (max: ${MAX_MESSAGES})` };
    }
    for (const msg of body.messages) {
      if (msg && typeof msg === 'object' && 'content' in msg) {
        const content = (msg as { content: unknown }).content;
        if (typeof content === 'string' && content.length > MAX_MESSAGE_LENGTH) {
          return { valid: false, error: `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters` };
        }
      }
    }
  }

  // Validate pet name
  if (body.petName && typeof body.petName === 'string') {
    if (body.petName.length > MAX_PET_NAME_LENGTH) {
      return { valid: false, error: `Pet name exceeds maximum length of ${MAX_PET_NAME_LENGTH} characters` };
    }
  }

  // Validate pet species
  if (body.petSpecies && typeof body.petSpecies === 'string') {
    if (body.petSpecies.length > MAX_PET_NAME_LENGTH) {
      return { valid: false, error: `Pet species exceeds maximum length of ${MAX_PET_NAME_LENGTH} characters` };
    }
  }

  // Validate answers array
  if (body.answers && Array.isArray(body.answers)) {
    if (body.answers.length > MAX_ANSWERS) {
      return { valid: false, error: `Too many answers provided (max: ${MAX_ANSWERS})` };
    }
  }

  return { valid: true };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  try {
    // Handle GET requests for health checks
    if (req.method === "GET") {
      const url = new URL(req.url);
      if (url.searchParams.get("health") === "true") {
        return new Response(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    // Parse JSON body safely
    interface TriageBody {
      type?: string;
      messages?: Array<{ role: string; content: string }>;
      symptomDescription?: string;
      answers?: Array<{ stepId: string; value: string | number; label?: string; isCritical?: boolean }>;
      petName?: string;
      petSpecies?: string;
      previousAnswers?: Array<{ question: string; answer: string }>;
      questionNumber?: number;
      image?: string;
      [key: string]: unknown; // Index signature for validateTriageInput compatibility
    }
    
    let body: TriageBody = {};
    if (req.method === "POST") {
      // Enforce max request body size (1MB) to prevent memory exhaustion
      const contentLength = req.headers.get("content-length");
      if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Request too large" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await req.text();
      if (text.length > 1024 * 1024) {
        return new Response(
          JSON.stringify({ error: "Request too large" }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (text) {
        body = JSON.parse(text) as TriageBody;
      }
    }
    
    // Handle health check via POST - simple ping that doesn't require auth
    if (body.type === "health-check") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Validate authentication for all other triage requests
    const authResult = await validateAuth(req);
    if (!authResult.authenticated) {
      console.log("Triage auth failed");
      return unauthorizedResponse(corsHeaders, authResult.error);
    }
    
    const userId = authResult.userId;
    
    // Apply rate limiting
    const rateLimitResult = checkRateLimit(`triage-${userId}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!rateLimitResult.allowed) {
      console.log(`Rate limit exceeded for user: ${userId?.slice(0, 8)}...`);
      return rateLimitResponse(corsHeaders, rateLimitResult.resetAt);
    }
    
    logUserAction("Triage request", userId || "unknown");
    
    // Validate input before processing
    const validation = validateTriageInput(body);
    if (!validation.valid) {
      console.log("Triage input validation failed");
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { type, messages, symptomDescription, answers, petName, petSpecies } = body;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate a SINGLE adaptive follow-up question based on conversation history
    if (type === "generate-questions" || type === "generate-next-question") {
      // First, check for emergency keywords in the symptom description
      const emergencyCheck = checkForEmergencyKeywords(symptomDescription || "");
      
      // Search knowledge base, prioritizing emergency content
      const { context: ragContext, results: kbResults } = await searchKnowledgeBase(symptomDescription || "", LOVABLE_API_KEY, true);
      
      // Check if any RED_EMERGENCY knowledge base matches were found
      const hasRedKBMatch = kbResults.some(r => r.category === 'RED_EMERGENCY' && r.similarity > 0.5);
      const hasOrangeKBMatch = kbResults.some(r => r.category === 'ORANGE_URGENT' && r.similarity > 0.5);
      
      // Get previous answers from the request (for adaptive questioning)
      const previousAnswers = body.previousAnswers || [];
      const questionNumber = body.questionNumber || 1;
      const totalQuestionsNeeded = 5;
      
      // Build conversation history for context
      const conversationHistory = previousAnswers.map((a: { question: string; answer: string }) => 
        `Q: ${a.question}\nA: ${a.answer}`
      ).join('\n\n');

      const systemPrompt = `You are a Senior Veterinary Triage Nurse conducting a structured clinical assessment for ${petName || "a pet"} (${petSpecies || "species unknown"}). You are generating question ${questionNumber} of ${totalQuestionsNeeded}. Your expertise draws from veterinary textbooks, official veterinary associations (AVMA, AAHA, WSAVA), peer-reviewed journals, clinical case studies, behavioral science, and species-specific care protocols.

${TOXICOLOGY_REFERENCE}

${ragContext ? `\n## RELEVANT CLINICAL KNOWLEDGE FROM DATABASE:\n${ragContext}\n` : ""}

## INITIAL SYMPTOM REPORT:
"${symptomDescription}"

${conversationHistory ? `## ASSESSMENT SO FAR:\n${conversationHistory}\n` : ""}

CRITICAL INSTRUCTIONS FOR ADAPTIVE QUESTIONING:
- Generate EXACTLY 1 question that DIRECTLY FOLLOWS from the previous answers
- Each question must BUILD on what you've learned - DO NOT repeat or ask about already-covered topics
- Use clinical reasoning: if they said "vomiting blood", ask about color/consistency, not "is your pet vomiting?"
- Be like a real triage nurse: react to concerning answers, dig deeper into worrying symptoms
- Use the pet's name naturally when appropriate (not every question)

QUESTION PROGRESSION LOGIC:
- Question 1-2: Assess the PRIMARY complaint based on symptoms described
- Question 3-4: Dig into SPECIFIC clinical indicators (vital signs, onset, severity)
- Question 5: Final clarifying question or timeline/history

SYMPTOM-SPECIFIC ADAPTIVE LOGIC:
${previousAnswers.length === 0 ? `
- For VOMITING: First ask about frequency/timing, then content/blood, then appetite
- For BREATHING: First assess current status, then ask about onset/triggers, then activity level
- For LETHARGY: First assess severity/duration, then appetite/water intake, then temperature
- For LIMPING: First identify limb, then assess weight-bearing, then check for swelling/heat
- For TOXIN: First confirm substance/amount, then time since ingestion, then current symptoms
` : `
BASED ON PREVIOUS ANSWERS, determine the NEXT most clinically relevant question:
- If they reported a severe symptom: Ask about onset and progression
- If they mentioned a toxin: Ask about amount and time since exposure
- If there's pain: Ask about location and when it's worse
- If concerning vital signs: Ask about related symptoms
- NEVER ask a question that was already answered or is redundant
`}

PROFESSIONAL TONE:
- Direct, clinical language. No "I'm sorry" or conversational filler.
- Use directive phrasing: "Check the gum color" not "Could you maybe check..."
- Refer to specific symptoms they mentioned to show you're listening

${emergencyCheck.isRed ? `\n⚠️ EMERGENCY KEYWORDS DETECTED: ${emergencyCheck.matchedKeywords.join(', ')}\nThis is a potential emergency. Ask questions to rapidly assess severity. Be direct and urgent in tone.\n` : ""}
${emergencyCheck.isOrange ? `\n⚠️ URGENT SYMPTOMS: ${emergencyCheck.matchedKeywords.join(', ')}\nThis needs prompt attention. Focus questions on assessing urgency level.\n` : ""}

MEDICAL TERM EXPLANATIONS (MANDATORY):
- ALWAYS include "infoTerm" and "infoDefinition" when using ANY medical terminology
- Terms requiring definitions: lethargy, cyanosis, mucous membrane, respiratory distress, labored breathing, anemia, jaundice, bloat, toxicosis, hemorrhage, dehydration, hypoglycemia, tachycardia, bradycardia, ataxia, paresis, etc.
- Keep definitions SIMPLE (5-15 words) using everyday language
- If the title or options use medical terms, define the MOST important one

EXAMPLES of good infoTerm/infoDefinition pairs:
- "lethargy" → "Unusual tiredness or lack of energy and interest in activities"
- "mucous membranes" → "The gums and inner lips - shows blood circulation health"  
- "labored breathing" → "Difficult, heavy breathing with visible effort"
- "bloat" → "Dangerous stomach swelling that can twist and cut off blood flow"
- "cyanosis" → "Blue or purple color indicating lack of oxygen in blood"
- "jaundice" → "Yellow coloring of skin/gums from liver problems"
- "respiratory distress" → "Serious difficulty breathing requiring urgent attention"

Return ONLY valid JSON for a SINGLE question:
{
  "question": {
    "id": "unique_id_based_on_symptom",
    "title": "The clinical question - direct and specific",
    "subtitle": "Brief instruction or context",
    "inputType": "single-choice" | "color-swatch" | "slider",
    "options": [
      {"value": "option_value", "label": "Display Label", "isCritical": true/false, "color": "#hexcolor if color-swatch"}
    ],
    "min": 0,
    "max": 10,
    "infoTerm": "The medical term to explain (REQUIRED for any medical terminology)",
    "infoDefinition": "Simple 5-15 word everyday-language definition (REQUIRED)"
  },
  "clinicalReasoning": "Why this question follows logically"
}

For single-choice: 3-4 options with isCritical flag for concerning findings
For color-swatch: mucous membrane/gum assessment only
For slider: pain/severity scales (0-10)`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: previousAnswers.length === 0 
                ? `Generate the FIRST clinical assessment question (Question 1 of 5) to follow up on: "${symptomDescription}"`
                : `Based on the assessment so far, generate Question ${questionNumber} of ${totalQuestionsNeeded}. The last answer was: "${previousAnswers[previousAnswers.length - 1]?.answer || 'N/A'}". What is the next most important clinical question?`
            },
          ],
        }),
      });

      if (!response.ok) {
        logApiError("Triage AI", response.status);
        return new Response(JSON.stringify({ 
          question: null,
          emergencyDetected: emergencyCheck.isRed,
          urgentDetected: emergencyCheck.isOrange
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Extract JSON from response
      let question = null;
      let clinicalReasoning = "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*"question"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          question = parsed.question || null;
          clinicalReasoning = parsed.clinicalReasoning || "";
        }
      } catch (e) {
        logError("Parse question", e);
      }

      return new Response(JSON.stringify({ 
        question,
        clinicalReasoning,
        questionNumber,
        totalQuestions: totalQuestionsNeeded,
        emergencyDetected: emergencyCheck.isRed || hasRedKBMatch,
        urgentDetected: emergencyCheck.isOrange || hasOrangeKBMatch
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate final triage report
    if (type === "generate-report") {
      // SECURITY: Check if user has premium status before returning full report
      // This prevents network inspection bypass of the paywall
      let isPremiumUser = false;
      if (userId) {
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=is_premium`,
          {
            headers: {
              "apikey": SUPABASE_SERVICE_ROLE_KEY!,
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          }
        );
        if (profileResponse.ok) {
          const profiles = await profileResponse.json();
          isPremiumUser = profiles.length > 0 && profiles[0].is_premium === true;
        }
      }
      
      // Check for emergency keywords in both symptom description and answers
      const allText = `${symptomDescription} ${answers?.map((a: { label?: string; value: string | number }) => a.label || a.value).join(' ') || ''}`;
      const emergencyCheck = checkForEmergencyKeywords(allText);
      
      // Check if any answer is marked as critical
      const hasCriticalAnswer = answers?.some((a: { isCritical?: boolean }) => a.isCritical);
      
      // Search knowledge base for relevant clinical information
      const { context: ragContext, results: kbResults } = await searchKnowledgeBase(symptomDescription || "", LOVABLE_API_KEY, true);
      
      // Check for RED/ORANGE matches in knowledge base
      const redKBMatches = kbResults.filter(r => r.category === 'RED_EMERGENCY' && r.similarity > 0.45);
      const orangeKBMatches = kbResults.filter(r => r.category === 'ORANGE_URGENT' && r.similarity > 0.45);
      
      // Determine if we should FORCE a specific status based on evidence
      const forceRed = emergencyCheck.isRed || hasCriticalAnswer || redKBMatches.length > 0;
      const forceOrange = !forceRed && (emergencyCheck.isOrange || orangeKBMatches.length > 0);
      
      const answersFormatted = answers?.map((a: { stepId: string; value: string | number; label?: string; isCritical?: boolean }) => 
        `- ${a.label || a.value}${a.isCritical ? ' [CRITICAL]' : ''}`
      ).join("\n") || "";

      // Build clinical evidence from knowledge base for the report
      const clinicalEvidence = [...redKBMatches, ...orangeKBMatches].slice(0, 3).map(r => 
        `Based on clinical guidelines: ${r.title} - ${r.content.substring(0, 200)}...`
      );

      const systemPrompt = `You are a Senior Veterinary Triage Nurse generating a comprehensive clinical triage assessment with differential diagnosis.

Your clinical knowledge is sourced from:
- Veterinary textbooks (Merck Veterinary Manual, Plumb's, Small Animal Internal Medicine)
- Official veterinary associations (AVMA, AAHA, WSAVA, BSAVA)
- Peer-reviewed journals (JAVMA, Veterinary Record, Journal of Veterinary Internal Medicine)
- Clinical veterinarian interviews and case studies
- Behavioral training data (AVSAB, IAABC guidelines)
- Pet lifestyle, nutrition, and species-specific care protocols
- Legal and safety regulations (rabies laws, breed legislation, poison control databases)
- Community-sourced data from verified pet health outcomes

${TOXICOLOGY_REFERENCE}

${ragContext ? `\n## RELEVANT CLINICAL KNOWLEDGE FROM VETERINARY DATABASE:\n${ragContext}\n` : ""}

TRIAGE STATUS CLASSIFICATION:
- RED: Life-threatening emergency requiring immediate veterinary care
- YELLOW: Urgent, requires veterinary attention within 24 hours  
- GREEN: Stable, can monitor at home with guidance

${forceRed ? `\n⚠️ CRITICAL: Emergency indicators detected. Status MUST be RED.
Indicators: ${emergencyCheck.matchedKeywords.join(', ')}
${redKBMatches.length > 0 ? `Clinical matches: ${redKBMatches.map(r => r.title).join(', ')}` : ''}
${hasCriticalAnswer ? 'Critical symptom reported in assessment.' : ''}\n` : ''}

${forceOrange ? `\n⚠️ URGENT: Urgent indicators detected. Status should be YELLOW or RED.
Indicators: ${emergencyCheck.matchedKeywords.join(', ')}
${orangeKBMatches.length > 0 ? `Clinical matches: ${orangeKBMatches.map(r => r.title).join(', ')}` : ''}\n` : ''}

MANDATORY RED STATUS TRIGGERS:
- Unresponsive/unconscious or active seizures
- Cyanotic (blue/purple) or severely pale mucous membranes
- Severe respiratory distress or apnea
- Known toxin ingestion (xylitol, lilies for cats, grapes/raisins, antifreeze, rat poison)
- Uncontrolled hemorrhage
- Cardiovascular collapse
- Any RED_EMERGENCY knowledge base match

## CRITICAL: POTENTIAL DIAGNOSES
You MUST provide 2-4 potential diagnoses based on the symptoms. Even for emergencies (RED), the pet owner deserves to know what conditions their pet MIGHT have. This helps them:
1. Communicate effectively with the emergency vet
2. Understand the seriousness of the situation
3. Prepare for potential treatment options

For each potential diagnosis, include:
- The condition name (medical term and common name)
- Why the symptoms suggest this condition
- A likelihood indicator (Highly Likely, Possible, Less Likely)

RESPONSE REQUIREMENTS:
- Use direct, clinical language only
- No conversational phrases ("I'm sorry", "I hope", "unfortunately")
- Be factual and directive
- Include specific clinical findings from the assessment
- Reference knowledge base information when applicable
- ALWAYS include potential diagnoses with clinical reasoning
- ALWAYS include a medicalGlossary explaining difficult terms for pet owners

MEDICAL TERM GLOSSARY (MANDATORY):
- Include a "medicalGlossary" array with definitions for ALL medical terms used
- Each term should have a simple 5-15 word everyday-language definition
- This helps pet owners understand their pet's condition without medical training

Return ONLY valid JSON:
{
  "status": "RED" | "YELLOW" | "GREEN",
  "title": "Clinical 3-5 word assessment title",
  "potentialDiagnoses": [
    {
      "condition": "Medical condition name",
      "commonName": "Common name/description",
      "likelihood": "Highly Likely" | "Possible" | "Less Likely",
      "reasoning": "Why symptoms suggest this condition",
      "urgency": "Why immediate care is needed (for RED) or timeline for care"
    }
  ],
  "clinicalSummary": ["Clinical finding 1", "Clinical finding 2", "Clinical finding 3"],
  "recommendedActions": ["Directive action 1", "Directive action 2", "Directive action 3", "Directive action 4"],
  "warningSignsToWatch": ["Warning sign 1", "Warning sign 2", "Warning sign 3"],
  "knowledgeBaseReferences": ["Clinical reference 1", "Clinical reference 2"],
  "vetCommunicationTips": ["What to tell the vet 1", "What to tell the vet 2"],
  "medicalGlossary": [
    {"term": "Medical term used in report", "definition": "Simple 5-15 word everyday definition"}
  ]
}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { 
              role: "user", 
              content: `Pet: ${petName || "Unknown"} (${petSpecies || "Unknown species"})

Initial Symptom Description:
${symptomDescription}

Assessment Findings:
${answersFormatted}

Generate the triage report. ${forceRed ? 'Status MUST be RED due to emergency indicators.' : forceOrange ? 'Status should be at least YELLOW due to urgent indicators.' : ''}` 
            },
          ],
        }),
      });

      if (!response.ok) {
        logApiError("Triage report AI", response.status);
        // Even on AI error, respect the emergency detection
        const fallbackStatus = forceRed ? "RED" : forceOrange ? "YELLOW" : "YELLOW";
        return new Response(JSON.stringify({ 
          status: fallbackStatus,
          title: forceRed ? "Emergency Detected" : "Assessment Complete",
          clinicalSummary: forceRed 
            ? ["Emergency indicators detected in symptoms", ...clinicalEvidence.slice(0, 2)]
            : ["Unable to generate AI assessment"],
          recommendedActions: forceRed 
            ? ["SEEK IMMEDIATE EMERGENCY VETERINARY CARE", "Do not delay - time is critical", "Call ahead to emergency clinic if possible"]
            : ["Consult with a veterinarian for proper evaluation"],
          warningSignsToWatch: ["Any worsening of symptoms"],
          knowledgeBaseReferences: clinicalEvidence
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";
      
      // Extract JSON from response
      let report = {
        status: forceRed ? "RED" : forceOrange ? "YELLOW" : "YELLOW" as "RED" | "YELLOW" | "GREEN",
        title: "Assessment Complete",
        potentialDiagnoses: [] as Array<{
          condition: string;
          commonName: string;
          likelihood: string;
          reasoning: string;
          urgency: string;
        }>,
        clinicalSummary: [] as string[],
        recommendedActions: [] as string[],
        warningSignsToWatch: [] as string[],
        knowledgeBaseReferences: clinicalEvidence as string[],
        vetCommunicationTips: [] as string[],
        medicalGlossary: [] as Array<{ term: string; definition: string }>,
      };
      
      try {
        const jsonMatch = content.match(/\{[\s\S]*"status"[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Override status if emergency was detected but AI didn't catch it
          let finalStatus = parsed.status || "YELLOW";
          if (forceRed && finalStatus !== "RED") {
            finalStatus = "RED";
          } else if (forceOrange && finalStatus === "GREEN") {
            finalStatus = "YELLOW";
          }
          
          report = {
            status: finalStatus,
            title: parsed.title || "Assessment Complete",
            potentialDiagnoses: parsed.potentialDiagnoses || [],
            clinicalSummary: parsed.clinicalSummary || [],
            recommendedActions: parsed.recommendedActions || [],
            warningSignsToWatch: parsed.warningSignsToWatch || [],
            knowledgeBaseReferences: parsed.knowledgeBaseReferences || clinicalEvidence,
            vetCommunicationTips: parsed.vetCommunicationTips || [],
            medicalGlossary: parsed.medicalGlossary || [],
          };
        }
      } catch (e) {
        logError("Parse report", e);
      }

      // SECURITY: Redact detailed content for non-premium users
      // They can see status (for emergencies) but not detailed diagnoses/recommendations
      if (!isPremiumUser) {
        const redactedReport = {
          status: report.status,
          title: "Assessment Complete",
          // Only show that diagnoses exist, not the actual content
          potentialDiagnoses: report.potentialDiagnoses.length > 0 
            ? [{ 
                condition: "Unlock to view diagnoses", 
                commonName: `${report.potentialDiagnoses.length} potential condition${report.potentialDiagnoses.length > 1 ? 's' : ''} identified`,
                likelihood: "Possible" as const,
                reasoning: "Subscribe to PetNurse Pro or purchase a one-time scan to view detailed clinical analysis.",
                urgency: report.status === "RED" ? "Immediate veterinary attention recommended" : "Unlock for details"
              }]
            : [],
          clinicalSummary: report.status === "RED" 
            ? ["⚠️ EMERGENCY: Critical symptoms detected. Seek immediate veterinary care."]
            : ["Assessment complete. Unlock to view detailed clinical summary."],
          recommendedActions: report.status === "RED"
            ? ["SEEK IMMEDIATE VETERINARY CARE", "Call ahead to your nearest emergency vet"]
            : ["Unlock your full report to see personalized recommendations"],
          warningSignsToWatch: [],
          knowledgeBaseReferences: [],
          vetCommunicationTips: [],
          medicalGlossary: [],
          // Flag to indicate this is a preview
          isPremiumRequired: true,
          previewData: {
            diagnosesCount: report.potentialDiagnoses.length,
            hasEmergency: report.status === "RED",
          }
        };
        
        return new Response(JSON.stringify(redactedReport), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(report), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For visual triage (gums/eyes analysis)
    if (type === "visual-triage") {
      const { image } = body;
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are a veterinary visual assessment expert. Analyze photos of pet gums and eyes to assess their health status.

## GUM COLOR ASSESSMENT:
- **PINK (Healthy)**: Normal, healthy gums. Good blood circulation.
- **PALE/WHITE (EMERGENCY)**: Indicates shock, blood loss, or anemia. IMMEDIATE veterinary care needed.
- **BLUE/PURPLE (EMERGENCY)**: Cyanosis - lack of oxygen. LIFE-THREATENING.
- **BRIGHT RED (Urgent)**: May indicate heatstroke, carbon monoxide poisoning, or high blood pressure.
- **YELLOW (Urgent)**: Jaundice - liver problems. See vet within 24 hours.
- **GRAY (EMERGENCY)**: Poor circulation, shock. Immediate emergency care.

Provide a clear assessment with urgency level (EMERGENCY/URGENT/MONITOR) and next steps.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this photo of my pet's gums or eyes and tell me if there are any concerning signs.",
                },
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        logApiError("Visual triage AI", response.status);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ error: "Failed to analyze image" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For vision requests (toxic food scanner) - REQUIRES PRO SUBSCRIPTION
    if (type === "vision") {
      // User is already authenticated at this point
      // Check if user has Pro subscription in profiles table
      const profileResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${userId}&select=is_premium`,
        {
          headers: {
            "apikey": SUPABASE_SERVICE_ROLE_KEY!,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      
      if (!profileResponse.ok) {
        console.log("Subscription status check failed");
        return new Response(JSON.stringify({ 
          error: "Failed to verify subscription",
          code: "SUBSCRIPTION_CHECK_FAILED"
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const profiles = await profileResponse.json();
      const isPremium = profiles.length > 0 && profiles[0].is_premium === true;
      
      if (!isPremium) {
        return new Response(JSON.stringify({ 
          error: "Pro subscription required to use the Toxic Food Scanner",
          code: "SUBSCRIPTION_REQUIRED"
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      // User is verified Pro subscriber - proceed with vision analysis
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            {
              role: "system",
              content: `You are a veterinary toxicology expert following NIH clinical triage protocols. Analyze images of food labels, plants, or substances to identify potential pet toxins with clinical precision.

${TOXICOLOGY_REFERENCE}

CLINICAL ASSESSMENT PROTOCOL:
1. Identify the item with specificity (product name, plant species, substance type)
2. Cross-reference ALL ingredients against the toxicology reference database
3. Flag dangerous ingredients with dose-dependent risk assessment
4. Provide evidence-based safety classification
5. Include species-specific contraindications

Response format:
\`\`\`toxicity_result
{
  "item_identified": "Precise identification of the item",
  "status": "TOXIC" | "CAUTION" | "SAFE",
  "dangerous_ingredients": ["ingredient 1 (mechanism of toxicity)", "ingredient 2"],
  "explanation": "Clinical explanation of the danger with dose considerations",
  "species_specific": "Note species-specific risks (e.g., cats vs dogs)",
  "recommended_action": "Clinical recommendation based on NIH triage guidelines"
}
\`\`\``,
            },
            ...(messages || []),
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        logApiError("Vision AI", response.status);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ error: "Failed to analyze image" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Standard triage chat with streaming (legacy support)
    const SYSTEM_PROMPT = `You are a Senior Veterinary Triage Nurse with 20+ years of emergency room experience.

${TOXICOLOGY_REFERENCE}

## SAFETY DISCLAIMER (include with every final result):
"⚠️ NOT A DIAGNOSIS. This is a priority assessment only. If your pet is in distress, go to a vet immediately regardless of this result."`;

    const latestUserMessage = messages?.filter((m: { role: string }) => m.role === "user").pop()?.content || "";
    const { context: ragContext } = await searchKnowledgeBase(latestUserMessage, LOVABLE_API_KEY);
    
    let enhancedSystemPrompt = SYSTEM_PROMPT;
    if (ragContext) {
      enhancedSystemPrompt = `${SYSTEM_PROMPT}\n\n## RELEVANT CLINICAL KNOWLEDGE:\n${ragContext}`;
    }

    const requestMessages = [
      { role: "system", content: enhancedSystemPrompt },
      ...(messages || []),
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: requestMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      logApiError("Triage streaming AI", response.status);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    logError("Triage function", error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
