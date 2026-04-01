import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inline scripts + Sentry
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paytr.com https://*.sentry.io",
      // Tailwind inline styles + Google Fonts
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts files
      "font-src 'self' https://fonts.gstatic.com",
      // PayTR iFrame
      "frame-src 'self' https://www.paytr.com",
      // Supabase, Resend (email images), PayTR
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.paytr.com https://*.sentry.io",
      // Images: Supabase Storage + Resend CDN
      "img-src 'self' data: blob: https://*.supabase.co https://resend.com https://*.resend.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "batuhan-arioz",
  project: "dentist-panel",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
