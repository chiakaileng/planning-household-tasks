import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Load Prisma from disk so `prisma generate` is not trapped in a bundled snapshot.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
