/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export function trackEvent(name: string, params?: Record<string, string | number>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", name, params);
}

export function trackSignup(clinicName: string) {
  trackEvent("sign_up", { method: "email", clinic_name: clinicName });
}

export function trackPricingView() {
  trackEvent("view_item", { item_name: "NextGency OS Premium" });
}

export function trackCheckoutStart(amount: number, billingCycle: string) {
  trackEvent("begin_checkout", {
    currency: "TRY",
    value: amount,
    billing_cycle: billingCycle,
  });
}
