// Shared authentication utilities for edge functions

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

/**
 * Validates the user's JWT token and returns user information
 * Uses getUser() API which is more reliable than getClaims()
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    return { authenticated: false, error: "No authorization header provided" };
  }
  
  const token = authHeader.replace("Bearer ", "");
  
  // Skip validation for anon key (it's not a user token)
  // The anon key is a fixed value that shouldn't be used for user authentication
  if (token === Deno.env.get("SUPABASE_ANON_KEY")) {
    return { authenticated: false, error: "Authentication required. Please sign in." };
  }
  
  try {
    // Use getUser endpoint which is more reliable than getClaims
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY!,
      },
    });
    
    if (!userResponse.ok) {
      return { authenticated: false, error: "Invalid or expired session. Please sign in again." };
    }
    
    const userData = await userResponse.json();
    
    if (!userData.id) {
      return { authenticated: false, error: "User not found" };
    }
    
    return {
      authenticated: true,
      userId: userData.id,
      email: userData.email,
    };
  } catch (error) {
    console.error("Auth validation error:", error);
    return { authenticated: false, error: "Authentication validation failed" };
  }
}

/**
 * Returns an unauthorized response with proper CORS headers
 */
export function unauthorizedResponse(corsHeaders: Record<string, string>, message = "Authentication required"): Response {
  return new Response(
    JSON.stringify({ error: message, code: "AUTH_REQUIRED" }),
    {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
