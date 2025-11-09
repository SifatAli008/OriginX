import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/app/auth/login",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/app/auth/register",
        destination: "/register",
        permanent: false,
      },
    ];
  },
  // Ensure firebase-admin is properly handled for serverless functions
  experimental: {
    serverComponentsExternalPackages: ['firebase-admin'],
  },
};

export default nextConfig;
