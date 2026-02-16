import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  silent: true,
  org: "batuhan-arioz",
  project: "dentist-panel",
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
});
