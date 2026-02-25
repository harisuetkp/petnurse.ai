import { memo, useState, useEffect } from "react";
import { Activity } from "lucide-react";

function getRandomAssessments() {
  return Math.floor(Math.random() * 6) + 2; // 2-7
}

export const LiveActivityIndicator = memo(function LiveActivityIndicator() {
  const [count, setCount] = useState(getRandomAssessments);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(2, Math.min(9, prev + delta));
      });
    }, 8000 + Math.random() * 7000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-safe-green" />
        </div>
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          <strong className="text-foreground">{count}</strong> assessments in progress
        </span>
      </div>
    </div>
  );
});
