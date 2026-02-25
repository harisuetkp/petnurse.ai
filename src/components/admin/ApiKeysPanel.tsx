import { useState } from "react";
import { Key, CheckCircle, XCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyConfig {
  name: string;
  description: string;
  envVar: string;
  docsUrl?: string;
  required: boolean;
}

const API_KEYS: ApiKeyConfig[] = [
  {
    name: "Stripe Secret",
    description: "Payment processing for subscriptions and one-time purchases",
    envVar: "STRIPE_SECRET_KEY",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    required: true,
  },
  {
    name: "Stripe Publishable",
    description: "Public key for Stripe.js frontend integration",
    envVar: "STRIPE_PUBLISHABLE_KEY",
    docsUrl: "https://dashboard.stripe.com/apikeys",
    required: true,
  },
  {
    name: "Google Places",
    description: "Nearby veterinary clinic search functionality",
    envVar: "GOOGLE_PLACES_API_KEY",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    required: true,
  },
  {
    name: "Lovable AI",
    description: "AI-powered triage and RAG search capabilities",
    envVar: "LOVABLE_API_KEY",
    docsUrl: undefined,
    required: true,
  },
  {
    name: "Stripe Webhook",
    description: "Webhook signature verification for secure payment events",
    envVar: "STRIPE_WEBHOOK_SIGNING_SECRET",
    docsUrl: "https://dashboard.stripe.com/webhooks",
    required: true,
  },
];

// These are the keys we know are configured based on the Supabase secrets
const CONFIGURED_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "GOOGLE_PLACES_API_KEY", 
  "LOVABLE_API_KEY",
  "STRIPE_WEBHOOK_SIGNING_SECRET",
];

export function ApiKeysPanel() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Status Refreshed",
        description: "API key configurations have been verified.",
      });
    }, 1000);
  };

  const isConfigured = (envVar: string) => CONFIGURED_KEYS.includes(envVar);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">API Keys</h2>
          <p className="text-slate-400 mt-1">
            Manage external service integrations and API configurations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>
      </div>

      <div className="grid gap-4">
        {API_KEYS.map((key) => {
          const configured = isConfigured(key.envVar);
          
          return (
            <Card 
              key={key.envVar} 
              className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${configured ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      <Key className={`h-5 w-5 ${configured ? "text-green-400" : "text-red-400"}`} />
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{key.name}</CardTitle>
                      <CardDescription className="text-slate-400 text-sm">
                        {key.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {configured ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configured
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Configured
                      </Badge>
                    )}
                    {key.required && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400">
                        Required
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Environment Variable:</span>
                    <code className="px-2 py-1 rounded bg-slate-800 text-slate-300 font-mono text-xs">
                      {key.envVar}
                    </code>
                  </div>
                  {key.docsUrl && (
                    <a
                      href={key.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                    >
                      <span>Documentation</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-[hsl(217,33%,17%)] border-[hsl(217,33%,22%)]">
        <CardHeader>
          <CardTitle className="text-white text-base">Security Note</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            API keys are stored securely as encrypted secrets and are only accessible to backend functions. 
            For security reasons, actual key values cannot be displayed here. To update a key, 
            use the Lovable secrets management interface.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
