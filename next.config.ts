import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [],
    // Allow local images
    unoptimized: false,
  },
};

export default nextConfig;
