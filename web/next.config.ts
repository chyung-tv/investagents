import { config } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  // Poll so bind-mounts and editor writes still hot-reload.
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
