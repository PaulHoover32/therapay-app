import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dashboard, planner, and profile pages were replaced by the chat workspace
  async redirects() {
    return [
      { source: "/dashboard", destination: "/chat", permanent: false },
      { source: "/planner", destination: "/chat", permanent: false },
      { source: "/profile", destination: "/settings", permanent: false },
    ];
  },
};

export default nextConfig;
