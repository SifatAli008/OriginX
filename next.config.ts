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
};

export default nextConfig;
