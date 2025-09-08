import { prisma } from "@/lib/db";
import { StoredToken } from "@/utils/tokenStorage";

/**
 * Log a created token to the database with full metadata
 * Uses upsert to handle cases where the same mint might be created multiple times
 * @param token - Complete token metadata
 * @returns Promise<CreatedToken> - The created or updated token record
 */
export async function logCreatedToken(token: StoredToken) {
  return prisma.createdToken.upsert({
    where: { mint: token.mintAddress },
    update: { 
      creatorWallet: token.creatorWallet || "", // Will be set by the calling code
      name: token.name, 
      ticker: token.symbol, // Keep ticker for backward compatibility
      symbol: token.symbol,
      decimals: token.decimals,
      amount: token.amount,
      image: token.image,
      description: token.description,
      preset: token.preset,
      vibe: token.vibe,
      links: token.links || {}
    },
    create: { 
      mint: token.mintAddress, 
      creatorWallet: token.creatorWallet || "", // Will be set by the calling code
      name: token.name, 
      ticker: token.symbol, // Keep ticker for backward compatibility
      symbol: token.symbol,
      decimals: token.decimals,
      amount: token.amount,
      image: token.image,
      description: token.description,
      preset: token.preset,
      vibe: token.vibe,
      links: token.links || {}
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

/**
 * Get the creator wallet for a specific mint address
 * @param mint - The mint address to query
 * @returns Promise<CreatedToken | null> - The token record with creator wallet, or null if not found
 */
export async function getTokenCreator(mint: string) {
  return prisma.createdToken.findUnique({
    where: { mint },
    select: { 
      mint: true,
      creatorWallet: true,
      name: true,
      ticker: true,
      createdAt: true
    },
  });
}

/**
 * Get a token by mint address with full metadata
 * @param mint - The mint address to query
 * @returns Promise<StoredToken | null> - The complete token metadata, or null if not found
 */
export async function getTokenByMint(mint: string): Promise<StoredToken | null> {
  const token = await prisma.createdToken.findUnique({
    where: { mint },
  });

  if (!token) {
    return null;
  }

  // Convert database record to StoredToken format
  return {
    mintAddress: token.mint,
    name: token.name,
    symbol: token.symbol || token.ticker, // Fallback to ticker for backward compatibility
    decimals: token.decimals || "9", // Default decimals
    amount: token.amount || "0", // Default amount
    image: token.image || "", // Default empty image
    description: token.description || "", // Default empty description
    preset: (token.preset as "honest" | "degen") || "honest", // Default to honest
    vibe: (token.vibe as "funny" | "serious" | "degen") || "serious", // Default to serious
    createdAt: token.createdAt.getTime(),
    links: (token.links as any) || {},
    creatorWallet: token.creatorWallet
  };
}