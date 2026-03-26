"use client";

import { useEffect } from "react";

export function AnalyticsConsent() {
  useEffect(() => {
    // Apply saved consent on mount
    const stored = localStorage.getItem("cookie_consent");
    if (stored) applyConsent(stored as "all" | "essential");

    // Listen for future changes
    const handler = (e: Event) => {
      const type = (e as CustomEvent).detail as "all" | "essential";
      applyConsent(type);
    };
    window.addEventListener("cookie_consent_updated", handler);
    return () => window.removeEventListener("cookie_consent_updated", handler);
  }, []);

  return null;
}

function applyConsent(type: "all" | "essential") {
  if (typeof window === "undefined" || !window.gtag) return;
  if (type === "all") {
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
    });
  } else {
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
    });
  }
}
