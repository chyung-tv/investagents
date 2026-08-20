import { config } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  // Poll so bind-mounts and editor writes still hot-reload.
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
});
