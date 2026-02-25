// Shared CORS configuration for all edge functions
// Restricts access to known origins only

const ALLOWED_ORIGINS = [
  "https://safe-pet-scan.lovable.app",
  // Custom domains
  "https://petnurseai.com",
  "https://www.petnurseai.com",
  "https://id-preview--11c14703-eb67-408e-be6f-404e0a84c680.lovable.app",
  "https://11c14703-eb67-408e-be6f-404e0a84c680.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  
  // Check if the origin is allowed
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0]; // Fallback to primary production URL
  
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function handleCorsOptions(req: Request): Response {
  return new Response(null, { headers: getCorsHeaders(req) });
}
