import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity, CheckCircle, XCircle, Loader2, Copy, Wifi, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getPlatform, isNative } from "@/lib/platform";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/PageHeader";
import { PageTransition } from "@/components/PageTransition";

interface HealthCheckResult {
  url: string;
  status: number | null;
  error: string | null;
  responsePreview: string | null;
  durationMs: number;
  timestamp: string;
}

interface NetworkError {
  endpoint: string;
  status: number | null;
  error: string;
  timestamp: string;
}

function DebugPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [dimensions, setDimensions] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [networkErrors, setNetworkErrors] = useState<NetworkError[]>([]);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "(not set)";
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "(not set)";
  const APP_VERSION = "1.0.0";
  const PROJECT_REF = import.meta.env.VITE_SUPABASE_PROJECT_ID || "mxggjalmwclhsabbyvcf";
  useEffect(() => {
    const handler = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
    staleTime: 5000,
  });

  const safeAreaTop = getComputedStyle(document.documentElement).getPropertyValue("--sat") || "unknown";

  const platform = getPlatform();
  const native = isNative();
  const buildType = import.meta.env.MODE;
  const env = import.meta.env.PROD ? "production" : "development";

  const runHealthCheck = async () => {
    setIsChecking(true);
    const url = `${SUPABASE_URL}/functions/v1/triage`;
    const start = Date.now();
    let result: HealthCheckResult;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
      };
      if (currentSession?.access_token) {
        headers["Authorization"] = `Bearer ${currentSession.access_token}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          type: "generate-next-question",
          symptomDescription: "Debug health check - test connectivity",
          previousAnswers: [],
          questionNumber: 1,
          petName: "TestPet",
          petSpecies: "dog",
        }),
      });

      const duration = Date.now() - start;
      let bodyText = "";
      try {
        bodyText = await response.text();
      } catch {
        bodyText = "(could not read body)";
      }

      result = {
        url,
        status: response.status,
        error: response.ok ? null : `HTTP ${response.status}`,
        responsePreview: bodyText.substring(0, 500),
        durationMs: duration,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      result = {
        url,
        status: null,
        error: err?.message || String(err),
        responsePreview: null,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      };
    }

    setHealthCheck(result);
    setIsChecking(false);

    // Log to console (won't be dropped in dev; for TestFlight use the debug UI)
    if (import.meta.env.DEV) {
      console.log("[DebugPage] Health check result:", result);
    }
    // Log network error
    if (result.error) {
      setNetworkErrors(prev => [{
        endpoint: "AI Health Check",
        status: result.status,
        error: result.error!,
        timestamp: result.timestamp,
      }, ...prev].slice(0, 10));
    }
  };

  // Test community endpoint
  const testCommunityEndpoint = async () => {
    try {
      const { data, error } = await supabase.rpc("get_community_waitlist_count");
      if (error) {
        setNetworkErrors(prev => [{
          endpoint: "Community Waitlist",
          status: null,
          error: error.message,
          timestamp: new Date().toISOString(),
        }, ...prev].slice(0, 10));
      } else {
        toast({ title: "Community OK", description: `Waitlist count: ${data}` });
      }
    } catch (err: any) {
      setNetworkErrors(prev => [{
        endpoint: "Community",
        status: null,
        error: err?.message || String(err),
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 10));
    }
  };
  const copyDiagnostics = () => {
    const info = [
      `App: PetNurse AI v${APP_VERSION}`,
      `Platform: ${platform} (native: ${native})`,
      `Build: ${buildType} | Env: ${env}`,
      `Screen: ${dimensions.w}x${dimensions.h} | DPR: ${window.devicePixelRatio}`,
      `Auth: ${session ? "Yes" : "No"}`,
      `API URL: ${SUPABASE_URL}`,
      healthCheck ? [
        `\nHealth Check (${healthCheck.timestamp}):`,
        `  URL: ${healthCheck.url}`,
        `  Status: ${healthCheck.status}`,
        `  Duration: ${healthCheck.durationMs}ms`,
        `  Error: ${healthCheck.error || "none"}`,
        `  Response: ${healthCheck.responsePreview?.substring(0, 200) || "none"}`,
      ].join("\n") : "",
    ].join("\n");

    navigator.clipboard?.writeText(info).then(() => {
      toast({ title: "Copied", description: "Diagnostics copied to clipboard" });
    });
  };

  return (
    <PageTransition className="min-h-screen pb-24">
      <PageHeader
        title="Debug & Diagnostics"
        subtitle="Hidden developer screen"
        icon={<Activity className="h-4 w-4 text-primary" />}
      />

      <div className="px-5 max-w-lg mx-auto space-y-4">
        {/* App Info */}
        <div className="apple-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">App Info</h2>
          <InfoRow label="Version" value={APP_VERSION} />
          <InfoRow label="Build" value={buildType} />
          <InfoRow label="Environment" value={env} />
          <InfoRow label="Platform" value={`${platform} (native: ${native})`} />
          <InfoRow label="Project Ref" value={PROJECT_REF} />
        </div>

        {/* Environment */}
        <div className="apple-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Server className="h-3.5 w-3.5" /> Environment
          </h2>
          <InfoRow label="Env Name" value={env} />
          <InfoRow label="API URL" value={SUPABASE_URL} />
          <InfoRow label="Key" value={SUPABASE_KEY ? `${SUPABASE_KEY.substring(0, 20)}...` : "(not set)"} />
          <InfoRow
            label="Auth"
            value={session ? `Yes (${session.user.email})` : "Not authenticated"}
          />
          {session && (
            <InfoRow label="Token" value={`${session.access_token.substring(0, 15)}...`} />
          )}
        </div>
        <div className="apple-card p-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Device</h2>
          <InfoRow label="Screen" value={`${dimensions.w} × ${dimensions.h}`} />
          <InfoRow label="DPR" value={String(window.devicePixelRatio)} />
          <InfoRow label="User Agent" value={navigator.userAgent.substring(0, 80) + "..."} />
        </div>




        {/* Health Check */}
        <div className="apple-card p-4 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">AI Health Check</h2>
          <Button onClick={runHealthCheck} disabled={isChecking} className="w-full rounded-xl h-10 text-sm">
            {isChecking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            {isChecking ? "Running..." : "Run Health Check"}
          </Button>

          {healthCheck && (
            <div className="space-y-2 mt-3">
              <div className="flex items-center gap-2">
                {healthCheck.status && healthCheck.status >= 200 && healthCheck.status < 300 ? (
                  <Badge className="bg-[hsl(var(--safe-green))]/10 text-[hsl(var(--safe-green))]">
                    <CheckCircle className="h-3 w-3 mr-1" /> Pass
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" /> Fail
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">{healthCheck.durationMs}ms</span>
              </div>
              <InfoRow label="URL" value={healthCheck.url} />
              <InfoRow label="Status" value={String(healthCheck.status ?? "N/A")} />
              {healthCheck.error && <InfoRow label="Error" value={healthCheck.error} />}
              {healthCheck.responsePreview && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Response:</p>
                  <pre className="text-[10px] bg-muted p-2 rounded-lg overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-all">
                    {healthCheck.responsePreview}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <Button variant="outline" onClick={copyDiagnostics} className="w-full rounded-xl h-10 text-sm">
          <Copy className="h-4 w-4 mr-2" />
          Copy Diagnostics
        </Button>

        {/* Test Community */}
        <Button variant="outline" onClick={testCommunityEndpoint} className="w-full rounded-xl h-10 text-sm">
          <Wifi className="h-4 w-4 mr-2" />
          Test Community Endpoint
        </Button>

        {/* Network Errors Log */}
        {networkErrors.length > 0 && (
          <div className="apple-card p-4 space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Recent Network Errors</h2>
            {networkErrors.map((err, i) => (
              <div key={i} className="text-xs space-y-0.5 pb-2 border-b border-border last:border-0">
                <div className="flex justify-between">
                  <span className="font-medium text-destructive">{err.endpoint}</span>
                  <span className="text-muted-foreground">{err.status ?? "N/A"}</span>
                </div>
                <p className="text-muted-foreground break-all">{err.error}</p>
                <p className="text-[10px] text-muted-foreground">{err.timestamp}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-foreground text-right break-all">{value}</span>
    </div>
  );
}

export default DebugPage;
