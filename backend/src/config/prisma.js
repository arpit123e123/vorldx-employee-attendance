import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "node:async_hooks";

const globalForPrisma = globalThis;

export const requestDatabaseContext = new AsyncLocalStorage();

const basePrisma =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

// Route handlers keep using the normal Prisma API. When an authenticated
// request has opened an RLS transaction, model calls transparently use its
// transaction client so PostgreSQL's SET LOCAL identity applies to every query.
const prisma = new Proxy(basePrisma, {
  get(target, property, receiver) {
    const transactionClient = requestDatabaseContext.getStore();
    if (transactionClient && typeof property === "string") {
      const transactionDelegate = Reflect.get(transactionClient, property, transactionClient);
      if (transactionDelegate !== undefined) return transactionDelegate;
    }

    const value = Reflect.get(target, property, receiver);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

export default prisma;
