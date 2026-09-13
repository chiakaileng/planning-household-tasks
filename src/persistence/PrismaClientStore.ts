import { createRequire } from "module";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { GeneratedPrismaClientFingerprint } from "@/persistence/GeneratedPrismaClientFingerprint";

type CachedClient = {
  client: PrismaClient;
  fingerprint: string;
};

const processCache = globalThis as unknown as { householdPrisma?: CachedClient };

/**
 * Hands out a PrismaClient that matches the latest `prisma generate`.
 * Next otherwise keeps one client for the whole process, which is why new fields 500 after a schema change.
 */
export class PrismaClientStore {
  constructor(private readonly fingerprint = new GeneratedPrismaClientFingerprint()) {}

  current(): PrismaClient {
    const stamp = this.fingerprint.read();
    const cached = processCache.householdPrisma;
    if (cached && cached.fingerprint === stamp) {
      return cached.client;
    }
    if (cached) {
      void cached.client.$disconnect();
    }
    const client = new (loadGeneratedPrismaClient())();
    processCache.householdPrisma = { client, fingerprint: stamp };
    return client;
  }
}

function loadGeneratedPrismaClient(): new () => PrismaClient {
  const nodeRequire = tryNodeRequire();
  const cache = nodeRequire?.cache;
  if (nodeRequire && cache) {
    for (const key of Object.keys(cache)) {
      if (key.includes(`${path.sep}.prisma${path.sep}client`) || key.includes(`${path.sep}@prisma${path.sep}client`)) {
        delete cache[key];
      }
    }
    try {
      return nodeRequire("@prisma/client").PrismaClient as new () => PrismaClient;
    } catch {
      // Next's server runtime sometimes cannot re-require; use the imported constructor.
    }
  }
  return PrismaClient;
}

function tryNodeRequire(): NodeJS.Require | null {
  try {
    const created = createRequire(path.join(process.cwd(), "package.json"));
    return typeof created === "function" ? created : null;
  } catch {
    return null;
  }
}
