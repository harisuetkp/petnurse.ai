import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronRight, Sparkles, MapPin, Bell, FlaskConical, Pill, HelpCircle } from "lucide-react";
import { motion } from "framer-motion";

const tools = [
  {
    to: "/triage?start=true",
    icon: Sparkles,
    title: "Check Symptoms",
    subtitle: "AI-powered health guidance",
    gradient: "from-[hsl(221,64%,33%)] to-[hsl(221,64%,45%)]",
  },
  {
    to: "/clinic-finder",
    icon: MapPin,
    title: "Find a Vet",
    subtitle: "Nearby & emergency clinics",
    gradient: "from-[hsl(195,100%,35%)] to-[hsl(195,100%,50%)]",
  },
  {
    to: "/care#reminders",
    icon: Bell,
    title: "Care Reminders",
    subtitle: "Vaccines & medications",
    gradient: "from-[hsl(262,60%,45%)] to-[hsl(262,60%,58%)]",
  },
  {
    to: "/care#toxicity",
    icon: FlaskConical,
    title: "Toxicity Check",
    subtitle: "Is it safe for your pet?",
    gradient: "from-[hsl(38,92%,40%)] to-[hsl(38,92%,55%)]",
  },
  {
    to: "/care#medication",
    icon: Pill,
    title: "Medication Safety",
    subtitle: "Safe dosage guidance",
    gradient: "from-[hsl(142,71%,35%)] to-[hsl(142,71%,50%)]",
  },
  {
    to: "/care#quickchecks",
    icon: HelpCircle,
    title: "Is This Normal?",
    subtitle: "Quick answers in seconds",
    gradient: "from-[hsl(210,80%,45%)] to-[hsl(210,80%,60%)]",
  },
];

export function CareToolCards() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = useCallback((to: string) => {
    const hashIndex = to.indexOf("#");
    const path = hashIndex >= 0 ? to.substring(0, hashIndex) : to;
    const hash = hashIndex >= 0 ? to.substring(hashIndex + 1) : null;

    // If we're already on the same page and there's a hash, scroll to it
    if (hash && location.pathname === path) {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        // Focus the first input in the section if available
        const input = el.querySelector("input");
        if (input) setTimeout(() => input.focus(), 400);
        return;
      }
    }

    // Otherwise navigate normally
    navigate(to);
    // After navigation, scroll to hash
    if (hash) {
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          const input = el.querySelector("input");
          if (input) setTimeout(() => input.focus(), 400);
        }
      }, 300);
    }
  }, [navigate, location.pathname]);

  return (
    <div>
      <h3 className="text-sm font-bold text-foreground mb-3 tracking-tight">Care Tools</h3>
      <div className="space-y-3">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
            >
              <button
                onClick={() => handleClick(tool.to)}
                className="block group w-full text-left"
              >
                <div
                  className={`relative overflow-hidden rounded-[18px] bg-gradient-to-br ${tool.gradient} p-4 shadow-md active:scale-[0.97] transition-transform duration-150`}
                >
                  <div className="absolute -right-4 -bottom-4 opacity-[0.08] pointer-events-none">
                    <Icon className="h-24 w-24 text-white" strokeWidth={1} />
                  </div>

                  <div className="relative z-10 flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-white tracking-tight">{tool.title}</p>
                      <p className="text-[12px] text-white/70 leading-snug">{tool.subtitle}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-white/40 shrink-0 group-hover:text-white/70 transition-colors" />
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
