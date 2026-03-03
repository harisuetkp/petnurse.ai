import { Link } from "react-router-dom";
import { Sparkles, MapPin, Bell, FlaskConical, Pill, HelpCircle } from "lucide-react";

const actions = [
  { to: "/triage?start=true", icon: Sparkles, label: "Symptom Check", subtitle: "AI health triage", color: "bg-primary/10 text-primary" },
  { to: "/clinic-finder", icon: MapPin, label: "Find Vet", subtitle: "Nearby clinics", color: "bg-[hsl(var(--safe-green))]/10 text-[hsl(var(--safe-green))]" },
  { to: "/care#reminders", icon: Bell, label: "Reminders", subtitle: "Vaccines & meds", color: "bg-[hsl(var(--primary-accent))]/10 text-[hsl(var(--primary-accent))]" },
  { to: "/care#toxicity", icon: FlaskConical, label: "Toxicity Check", subtitle: "Is it safe?", color: "bg-[hsl(var(--warning-amber))]/10 text-[hsl(var(--warning-amber))]" },
  { to: "/care#medication", icon: Pill, label: "Medication Safety", subtitle: "Dosage check", color: "bg-primary/10 text-primary" },
  { to: "/care#quickchecks", icon: HelpCircle, label: "Is This Normal?", subtitle: "Quick answers", color: "bg-[hsl(var(--primary-accent))]/10 text-[hsl(var(--primary-accent))]" },
];

export function QuickActionGrid() {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map((action) => {
          const Icon = action.icon;
          const isHash = action.to.startsWith("/care#");
          const Comp = isHash ? "a" : Link;
          const props = isHash ? { href: action.to.replace("/care", "") } : { to: action.to };
          return (
            <Link
              key={action.label}
              to={action.to}
              className="apple-card p-3 text-center hover:shadow-md transition-all active:scale-[0.97] flex flex-col items-center gap-1.5"
            >
              <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{action.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{action.subtitle}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
