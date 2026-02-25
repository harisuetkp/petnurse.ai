import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsOptions } from "../_shared/cors.ts";
import { logApiError, logUserAction } from "../_shared/logging.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";

// Rate limit: 30 requests per minute for clinic searches (public access)
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60000;

// Simple hash function for IP-based rate limiting
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsOptions(req);
  }

  try {
    // Handle GET requests for health checks
    if (req.method === 'GET') {
      const url = new URL(req.url);
      if (url.searchParams.get('health') === 'true') {
        return new Response(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString(), clinics: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Parse JSON body for POST requests
    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    }
    
    const { lat, lng, latitude, longitude, radius = 10000 } = body as { lat?: number; lng?: number; latitude?: number; longitude?: number; radius?: number };
    
    // Support both 'lat'/'lng' and 'latitude'/'longitude' parameter names
    const searchLat = lat || latitude;
    const searchLng = lng || longitude;
    
    // Handle health check via POST - simple ping that doesn't require valid coordinates
    if (searchLat === 0 && searchLng === 0) {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: new Date().toISOString(), clinics: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get client identifier for rate limiting (IP hash or fallback)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "anonymous";
    const clientHash = hashString(clientIp);
    
    // Apply rate limiting by IP (public access for emergency clinic searches)
    const rateLimitResult = checkRateLimit(`clinics-${clientHash}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(corsHeaders, rateLimitResult.resetAt);
    }
    
    logUserAction("Nearby clinics search", clientHash);

    if (!searchLat || !searchLng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Search for veterinary clinics using Places API (New)
    const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';
    
    const searchBody = {
      includedTypes: ['veterinary_care'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: searchLat, longitude: searchLng },
          radius: radius
        }
      }
    };

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.location,places.currentOpeningHours,places.regularOpeningHours,places.businessStatus'
      },
      body: JSON.stringify(searchBody)
    });

    if (!response.ok) {
      logApiError("Google Places API", response.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch clinics' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Transform the response to our format
    const clinics = (data.places || []).map((place: any) => {
      // Calculate distance (use searchLat/searchLng which are validated)
      const distance = calculateDistance(searchLat!, searchLng!, place.location.latitude, place.location.longitude);
      
      // Check if it's likely a 24-hour emergency clinic
      const name = place.displayName?.text || '';
      const isEmergency = name.toLowerCase().includes('emergency') || 
                          name.toLowerCase().includes('24') ||
                          name.toLowerCase().includes('urgent');
      
      // Determine if currently open
      const isOpen = place.currentOpeningHours?.openNow ?? false;
      
      // Get hours text
      let hours = 'Hours unavailable';
      if (place.regularOpeningHours?.weekdayDescriptions) {
        // Get today's hours
        const today = new Date().getDay();
        const dayIndex = today === 0 ? 6 : today - 1; // Convert to Mon=0 format
        hours = place.regularOpeningHours.weekdayDescriptions[dayIndex] || 'Hours unavailable';
      }
      if (isEmergency) {
        hours = '24 Hours';
      }

      return {
        id: place.id,
        name: name,
        address: place.formattedAddress || 'Address unavailable',
        phone: place.nationalPhoneNumber || 'Phone unavailable',
        distance: formatDistance(distance),
        distanceValue: distance,
        isOpen,
        isEmergency,
        hours,
        lat: place.location.latitude,
        lng: place.location.longitude
      };
    });

    // Sort by distance
    clinics.sort((a: any, b: any) => a.distanceValue - b.distanceValue);

    return new Response(
      JSON.stringify({ clinics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in nearby-clinics function:', error);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function formatDistance(miles: number): string {
  if (miles < 0.1) {
    return '< 0.1 mi';
  }
  return `${miles.toFixed(1)} mi`;
}
