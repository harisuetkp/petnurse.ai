import { useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const TAP_COUNT = 7;
const TAP_WINDOW_MS = 3000;

export function useDebugTap() {
  const navigate = useNavigate();
  const taps = useRef<number[]>([]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    taps.current.push(now);
    // Keep only taps within the window
    taps.current = taps.current.filter((t) => now - t < TAP_WINDOW_MS);
    if (taps.current.length >= TAP_COUNT) {
      taps.current = [];
      navigate("/debug");
    }
  }, [navigate]);

  return handleTap;
}
