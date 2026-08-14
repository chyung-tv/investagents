import { config } from "dotenv";
import { resolve } from "node:path";
import type { NextConfig } from "next";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;
