import { prisma } from "@/lib/db";

/**
 * Log a created token to the database
 * Uses upsert to handle cases where the same mint might be created multiple times
 * @param p - Token creation parameters
 * @returns Promise<CreatedToken> - The created or updated token record
 */
export async function logCreatedToken(p: { 
  mint: string; 
  creatorWallet: string; 
  name: string; 
  ticker: string; 
}) {
  return prisma.createdToken.upsert({
    where: { mint: p.mint },
    update: { 
      creatorWallet: p.creatorWallet, 
      name: p.name, 
      ticker: p.ticker 
    },
    create: { 
      mint: p.mint, 
      creatorWallet: p.creatorWallet, 
      name: p.name, 
      ticker: p.ticker 
    },
  });
}

/**
 * List all tokens created by a specific wallet
 * Returns tokens ordered by creation date (newest first)
 * @param wallet - The wallet address to query
 * @returns Promise<CreatedToken[]> - Array of created tokens
 */
export async function listCreatedTokens(wallet: string) {
  return prisma.createdToken.findMany({
    where: { creatorWallet: wallet },
    orderBy: { createdAt: "desc" },
  });
}
