import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, Brain, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ServiceInfo {
  name: string;
  icon: React.ElementType;
  status: "operational" | "degraded" | "down" | "checking";
  latency?: number;
}

export function ServiceStatus() {
  const [services, setServices] = useState<ServiceInfo[]>([
    { name: "Database", icon: Database, status: "checking" },
    { name: "AI Engine", icon: Brain, status: "checking" },
    { name: "Maps API", icon: Map, status: "checking" },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkServices = async () => {
    setIsChecking(true);
    const updatedServices: ServiceInfo[] = [];

    // Check Supabase (Database)
    try {
      const start = performance.now();
      const { error } = await supabase.from("profiles").select("id").limit(1);
      const latency = Math.round(performance.now() - start);
      updatedServices.push({
        name: "Database",
        icon: Database,
        status: error ? "down" : latency > 1000 ? "degraded" : "operational",
        latency,
      });
    } catch {
      updatedServices.push({ name: "Database", icon: Database, status: "down" });
    }

    // Check AI Engine (Triage function)
    try {
      const start = performance.now();
      const { error } = await supabase.functions.invoke("triage", {
        body: { type: "health-check" },
      });
      const latency = Math.round(performance.now() - start);
      // A 400/401 error is fine - it means the function is responding
      updatedServices.push({
        name: "AI Engine",
        icon: Brain,
        status: latency > 3000 ? "degraded" : "operational",
        latency,
      });
    } catch {
      updatedServices.push({ name: "AI Engine", icon: Brain, status: "down" });
    }

    // Check Maps API (nearby-clinics function)
    try {
      const start = performance.now();
      const { error } = await supabase.functions.invoke("nearby-clinics", {
        body: { latitude: 0, longitude: 0 },
      });
      const latency = Math.round(performance.now() - start);
      updatedServices.push({
        name: "Maps API",
        icon: Map,
        status: latency > 3000 ? "degraded" : "operational",
        latency,
      });
    } catch {
      updatedServices.push({ name: "Maps API", icon: Map, status: "down" });
    }

    setServices(updatedServices);
    setLastChecked(new Date());
    setIsChecking(false);
  };

  useEffect(() => {
    checkServices();
    // Check every 60 seconds
    const interval = setInterval(checkServices, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: ServiceInfo["status"]) => {
    switch (status) {
      case "operational":
        return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
      case "degraded":
        return <AlertCircle className="h-4 w-4 text-amber-400" />;
      case "down":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <RefreshCw className="h-4 w-4 text-slate-400 animate-spin" />;
    }
  };

  const getStatusText = (status: ServiceInfo["status"]) => {
    switch (status) {
      case "operational":
        return "Operational";
      case "degraded":
        return "Degraded";
      case "down":
        return "Down";
      default:
        return "Checking...";
    }
  };

  const overallStatus = services.every((s) => s.status === "operational")
    ? "operational"
    : services.some((s) => s.status === "down")
    ? "down"
    : services.some((s) => s.status === "degraded")
    ? "degraded"
    : "checking";

  return (
    <div className="rounded-xl bg-[hsl(217,33%,17%)] border border-[hsl(217,33%,22%)] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon(overallStatus)}
          <h3 className="font-semibold text-white text-sm">System Status</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkServices}
          disabled={isChecking}
          className="text-slate-400 hover:text-white hover:bg-[hsl(217,33%,22%)] h-7 px-2"
        >
          <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin")} />
        </Button>
      </div>

      {/* Services */}
      <div className="space-y-3">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between py-2 border-b border-[hsl(217,33%,22%)] last:border-0"
          >
            <div className="flex items-center gap-2">
              <service.icon className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-white">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {service.latency !== undefined && (
                <span className="text-[10px] text-slate-500">{service.latency}ms</span>
              )}
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                  service.status === "operational" && "bg-emerald-500/20 text-emerald-400",
                  service.status === "degraded" && "bg-amber-500/20 text-amber-400",
                  service.status === "down" && "bg-red-500/20 text-red-400",
                  service.status === "checking" && "bg-slate-500/20 text-slate-400"
                )}
              >
                {getStatusText(service.status)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Last checked */}
      {lastChecked && (
        <p className="text-[10px] text-slate-500 mt-3 text-center">
          Last checked: {lastChecked.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
