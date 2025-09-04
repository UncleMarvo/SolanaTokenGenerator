import { prisma } from "./db";

/**
 * Check if a wallet has Pro access
 * @param wallet - Wallet address to check
 * @returns Promise<boolean> - True if wallet has Pro access, false otherwise
 */
export async function isPro(wallet: string): Promise<boolean> {
  try {
    if (!wallet) {
      return false;
    }

    // Check if wallet has Pro access
    const proAccess = await prisma.proAccess.findUnique({
      where: { wallet },
      select: {
        expiresAt: true
      }
    });

    if (!proAccess) {
      return false;
    }

    // Check if Pro access has expired
    if (proAccess.expiresAt) {
      const now = new Date();
      if (proAccess.expiresAt < now) {
        // Remove expired access
        await prisma.proAccess.delete({
          where: { wallet }
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Error checking Pro status:", error);
    return false;
  }
}

/**
 * Get Pro status with additional details
 * @param wallet - Wallet address to check
 * @returns Promise<{isPro: boolean, expiresAt?: string, error?: string}>
 */
export async function getProStatus(wallet: string): Promise<{
  isPro: boolean;
  expiresAt?: string;
  error?: string;
}> {
  try {
    if (!wallet) {
      return { isPro: false, error: "No wallet provided" };
    }

    const proAccess = await prisma.proAccess.findUnique({
      where: { wallet },
      select: {
        expiresAt: true,
        updatedAt: true
      }
    });

    if (!proAccess) {
      return { isPro: false };
    }

    // Check if Pro access has expired
    if (proAccess.expiresAt) {
      const now = new Date();
      if (proAccess.expiresAt < now) {
        // Remove expired access
        await prisma.proAccess.delete({
          where: { wallet }
        });
        return { isPro: false, error: "Pro access expired" };
      }
    }

    return {
      isPro: true,
      expiresAt: proAccess.expiresAt?.toISOString() || undefined
    };
  } catch (error) {
    console.error("Error getting Pro status:", error);
    return { 
      isPro: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
