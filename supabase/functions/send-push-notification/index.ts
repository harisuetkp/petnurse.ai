import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

/**
 * Get a short-lived OAuth2 access token for the FCM v1 API using
 * a Firebase service account's private key.
 */
async function getFirebaseAccessToken(): Promise<string> {
    const serviceAccount = JSON.parse(
        Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "{}"
    );

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: serviceAccount.client_email,
        sub: serviceAccount.client_email,
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
    };

    // Base64url encode
    const enc = (obj: unknown) =>
        btoa(JSON.stringify(obj))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

    const unsignedToken = `${enc(header)}.${enc(payload)}`;

    // Import the RSA private key
    const pemContents = serviceAccount.private_key
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s/g, "");

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
    );

    const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const jwt = `${unsignedToken}.${sig}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
        throw new Error(
            `Failed to get Firebase access token: ${JSON.stringify(tokenData)}`
        );
    }

    return tokenData.access_token;
}

/**
 * Send a push notification via FCM v1 HTTP API.
 */
async function sendFcmNotification(
    accessToken: string,
    projectId: string,
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>
) {
    const message: Record<string, unknown> = {
        message: {
            token: fcmToken,
            notification: { title, body },
            data: data || {},
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                    channel_id: "petnurse_default",
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        },
    };

    const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
        }
    );

    const result = await response.json();

    if (!response.ok) {
        console.error("FCM send error:", result);
        // If the token is invalid/expired, clean it up
        if (
            result?.error?.details?.some(
                (d: { errorCode?: string }) =>
                    d.errorCode === "UNREGISTERED" || d.errorCode === "INVALID_ARGUMENT"
            )
        ) {
            return { success: false, unregistered: true, token: fcmToken };
        }
        return { success: false, error: result };
    }

    return { success: true, messageId: result.name };
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

        const { user_id, title, body, data, send_to_all } = await req.json();

        // Auth check: require service role key OR valid admin user
        const authHeader = req.headers.get("Authorization");
        const apiKey = req.headers.get("apikey");

        // Allow service_role calls (from webhooks/cron)
        const isServiceRole = apiKey === supabaseServiceKey;

        if (!isServiceRole) {
            // Verify the caller is an authenticated admin
            if (!authHeader) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            const userClient = createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: authHeader } },
            });
            const {
                data: { user },
                error: authError,
            } = await userClient.auth.getUser();

            if (authError || !user) {
                return new Response(JSON.stringify({ error: "Unauthorized" }), {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }

            // Optional: check if user is admin
            const adminClient = createClient(supabaseUrl, supabaseServiceKey);
            const { data: profile } = await adminClient
                .from("profiles")
                .select("role")
                .eq("id", user.id)
                .single();

            if (!profile || profile.role !== "admin") {
                return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
                    status: 403,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
            }
        }

        if (!title || !body) {
            return new Response(
                JSON.stringify({ error: "title and body are required" }),
                {
                    status: 400,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Get Firebase config
        const serviceAccount = JSON.parse(
            Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON") || "{}"
        );
        const projectId = serviceAccount.project_id;

        if (!projectId) {
            return new Response(
                JSON.stringify({ error: "Firebase not configured" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const accessToken = await getFirebaseAccessToken();

        // Get FCM tokens from DB
        const adminClient = createClient(supabaseUrl, supabaseServiceKey);
        let query = adminClient.from("fcm_tokens").select("token, user_id");

        if (!send_to_all && user_id) {
            query = query.eq("user_id", user_id);
        }

        const { data: tokens, error: tokensError } = await query;

        if (tokensError) {
            console.error("Error fetching tokens:", tokensError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch tokens" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        if (!tokens || tokens.length === 0) {
            return new Response(
                JSON.stringify({ success: true, sent: 0, message: "No tokens found" }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        // Send to all tokens
        const results = await Promise.allSettled(
            tokens.map((t) =>
                sendFcmNotification(accessToken, projectId, t.token, title, body, data)
            )
        );

        // Clean up unregistered tokens
        const unregisteredTokens = results
            .filter(
                (r) =>
                    r.status === "fulfilled" &&
                    r.value.unregistered &&
                    r.value.token
            )
            .map((r) => (r as PromiseFulfilledResult<{ token: string }>).value.token);

        if (unregisteredTokens.length > 0) {
            await adminClient
                .from("fcm_tokens")
                .delete()
                .in("token", unregisteredTokens);
            console.log(`🧹 Cleaned up ${unregisteredTokens.length} stale tokens`);
        }

        const sent = results.filter(
            (r) => r.status === "fulfilled" && r.value.success
        ).length;
        const failed = results.length - sent;

        return new Response(
            JSON.stringify({
                success: true,
                sent,
                failed,
                cleaned: unregisteredTokens.length,
                total: tokens.length,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (err) {
        console.error("Push notification error:", err);
        return new Response(JSON.stringify({ error: "Internal error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
