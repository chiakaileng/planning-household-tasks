import type { PrismaClient } from "@prisma/client";
import { PrismaClientStore } from "@/persistence/PrismaClientStore";

const store = new PrismaClientStore();

/**
 * Always resolve through the store so a new generate is picked up on the next query.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = store.current();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
