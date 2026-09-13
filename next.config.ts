import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load Prisma from disk so `prisma generate` is not trapped in a bundled snapshot.
  serverExternalPackages: ["@prisma/client"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : [];
      externals.push(({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        if (!request) {
          callback();
          return;
        }
        if (request.startsWith("node:") || request === "fs" || request === "path" || request === "module" || request === "fs/promises") {
          callback(null, `commonjs ${request.replace(/^node:/, "")}`);
          return;
        }
        callback();
      });
      config.externals = externals;
    }
    return config;
  },
};

export default nextConfig;
