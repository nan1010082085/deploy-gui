import type { NextConfig } from "next";

const basePath = process.env.NODE_ENV === 'production' ? '/deploy' : '';

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  serverExternalPackages: ['ssh2', 'better-sqlite3'],
};

export default nextConfig;
