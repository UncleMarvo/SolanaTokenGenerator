import { PrismaClient } from "../generated/prisma";

// Global instance for development to prevent multiple connections
export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  (globalThis as any).prisma = prisma;
}
