import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Ensure server actions work properly
  },
  // Suppress specific build warnings
  typescript: {
    // We handle TypeScript errors separately
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
