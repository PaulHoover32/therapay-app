import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The old in-app dashboard, planner and profile were removed: Therapay runs in Claude/ChatGPT.
  async redirects() {
    return ["/dashboard", "/planner", "/profile"].map((source) => ({ source, destination: "/connect", permanent: false }));
  },
};

export default nextConfig;
