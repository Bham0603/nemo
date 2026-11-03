import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // the floating dev badge overlaps the sidebar's bottom action in this layout
  devIndicators: false,
};

export default nextConfig;
