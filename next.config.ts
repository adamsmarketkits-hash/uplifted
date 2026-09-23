import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  allowedDevOrigins: ["192.168.*.*"],
};

export default nextConfig;
