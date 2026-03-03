import { memo, useState, useEffect } from "react";
import { Clock } from "lucide-react";

const EXPIRY_KEY = "petnurse_report_expiry";
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

function getOrCreateExpiry(): number {
  const stored = localStorage.getItem(EXPIRY_KEY);
  if (stored) {
    const expiry = parseInt(stored, 10);
    if (expiry > Date.now()) return expiry;
  }
  const expiry = Date.now() + TWENTY_FOUR_HOURS;
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  return expiry;
}

export function clearReportExpiry() {
  localStorage.removeItem(EXPIRY_KEY);
}

export const CountdownTimer = memo(function CountdownTimer() {
  const [expiry] = useState(getOrCreateExpiry);
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, expiry - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, expiry - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiry]);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  const isUrgent = hours < 6;

  return (
    <div className={`flex items-center justify-center gap-3 py-3 px-4 rounded-xl border ${
      isUrgent 
        ? "bg-emergency-red/5 border-emergency-red/20" 
        : "bg-warning-amber/5 border-warning-amber/20"
    }`}>
      <Clock className={`h-4 w-4 shrink-0 ${
        isUrgent ? "text-emergency-red animate-pulse" : "text-warning-amber"
      }`} />
      <div className="flex items-center gap-2">
        <p className={`text-xs font-medium ${
          isUrgent ? "text-emergency-red" : "text-warning-amber"
        }`}>
          Report expires in
        </p>
        <div className="flex items-center gap-1">
          {[
            { value: hours, label: "h" },
            { value: minutes, label: "m" },
            { value: seconds, label: "s" },
          ].map(({ value, label }, i) => (
            <div key={i} className="flex items-center">
              <span className={`font-mono font-bold text-sm tabular-nums ${
                isUrgent ? "text-emergency-red" : "text-foreground"
              }`}>
                {String(value).padStart(2, "0")}
              </span>
              <span className={`text-[10px] ${
                isUrgent ? "text-emergency-red/70" : "text-warning-amber/70"
              }`}>{label}</span>
              {i < 2 && (
                <span className={`mx-0.5 text-xs ${
                  isUrgent ? "text-emergency-red/50" : "text-muted-foreground/40"
                }`}>:</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
