import { Shield, GraduationCap } from "lucide-react";

export function VetEndorsement() {
  return (
    <div className="apple-card p-5 border border-primary/10">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary/10 shrink-0">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-1.5">
            Built With Clinical Standards
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            "PetNurse AI uses the same symptom evaluation framework we teach in veterinary schools. It's a responsible first step before coming to the clinic."
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
              <Shield className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Dr. Sarah Mitchell, DVM</p>
              <p className="text-[10px] text-muted-foreground">Veterinary advisor • 15 years practice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
