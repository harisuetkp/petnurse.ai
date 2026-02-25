import { useEffect, useState, useCallback } from "react";

const BUILD_VERSION_KEY = "petnurse_build_version";
const CHECK_INTERVAL = 60000; // Check every 60 seconds

export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);

  const checkForUpdate = useCallback(async () => {
    try {
      // Fetch the index.html to check for new build hash
      const response = await fetch(`/?_t=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      
      if (!response.ok) return;
      
      const html = await response.text();
      
      // Extract the main script hash from the HTML
      // Vite generates unique hashes for each build
      const scriptMatch = html.match(/src="\/src\/main\.tsx\?t=(\d+)"|src="\/assets\/index[.-]([a-zA-Z0-9]+)\.js"/);
      const newVersion = scriptMatch ? (scriptMatch[1] || scriptMatch[2]) : null;
      
      if (!newVersion) return;
      
      const storedVersion = localStorage.getItem(BUILD_VERSION_KEY);
      
      if (!storedVersion) {
        // First visit, store current version
        localStorage.setItem(BUILD_VERSION_KEY, newVersion);
        setCurrentVersion(newVersion);
        return;
      }
      
      if (storedVersion !== newVersion) {
        setUpdateAvailable(true);
        setCurrentVersion(newVersion);
      }
    } catch {
      // Silently handle update check failures
    }
  }, []);

  const applyUpdate = useCallback(() => {
    if (currentVersion) {
      localStorage.setItem(BUILD_VERSION_KEY, currentVersion);
    }
    // Clear all caches and reload
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }
    window.location.reload();
  }, [currentVersion]);

  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
  }, []);

  useEffect(() => {
    // Check immediately on mount
    checkForUpdate();
    
    // Set up periodic checking
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);
    
    // Also check when window regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkForUpdate]);

  return {
    updateAvailable,
    applyUpdate,
    dismissUpdate,
  };
}
