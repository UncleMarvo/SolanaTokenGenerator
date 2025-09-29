/**
 * Token-based Pro status validation
 * Replaces wallet-based Pro status with per-token payment validation
 */

import { prisma } from "./db";

/**
 * Check if a specific token has Pro tier access
 * @param tokenMint - Token mint address
 * @returns Promise<boolean> - True if token has Pro access
 */
export async function isTokenPro(tokenMint: string): Promise<boolean> {
  try {
    if (!tokenMint) {
      return false;
    }

    const token = await prisma.createdToken.findUnique({
      where: { mint: tokenMint },
      select: {
        tier: true,
        paymentVerified: true,
        paymentVerifiedAt: true
      }
    });

    if (!token) {
      return false;
    }

    // Check if token has Pro tier and payment is verified
    return token.tier === 'pro' && token.paymentVerified === true;
  } catch (error) {
    console.error("Error checking token Pro status:", error);
    return false;
  }
}

/**
 * Get detailed Pro status for a token
 * @param tokenMint - Token mint address
 * @returns Promise<{isPro: boolean, tier: string, paymentVerified: boolean, error?: string}>
 */
export async function getTokenProStatus(tokenMint: string): Promise<{
  isPro: boolean;
  tier: string;
  paymentVerified: boolean;
  error?: string;
}> {
  try {
    if (!tokenMint) {
      return { 
        isPro: false, 
        tier: 'free', 
        paymentVerified: false, 
        error: "No token mint provided" 
      };
    }

    const token = await prisma.createdToken.findUnique({
      where: { mint: tokenMint },
      select: {
        tier: true,
        paymentVerified: true,
        paymentVerifiedAt: true,
        paidAmount: true,
        paymentTxSignature: true
      }
    });

    if (!token) {
      return { 
        isPro: false, 
        tier: 'free', 
        paymentVerified: false, 
        error: "Token not found" 
      };
    }

    const isPro = token.tier === 'pro' && token.paymentVerified === true;

    return {
      isPro,
      tier: token.tier,
      paymentVerified: token.paymentVerified || false
    };
  } catch (error) {
    console.error("Error getting token Pro status:", error);
    return { 
      isPro: false, 
      tier: 'free', 
      paymentVerified: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Verify and update token payment status
 * @param tokenMint - Token mint address
 * @param txSignature - Payment transaction signature
 * @returns Promise<boolean> - True if payment was verified and updated
 */
export async function verifyTokenPayment(tokenMint: string, txSignature: string): Promise<boolean> {
  try {
    if (!tokenMint || !txSignature) {
      return false;
    }

    // Update token with verified payment
    await prisma.createdToken.update({
      where: { mint: tokenMint },
      data: {
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        paymentTxSignature: txSignature
      }
    });

    return true;
  } catch (error) {
    console.error("Error verifying token payment:", error);
    return false;
  }
}

/**
 * Create or update token with Pro tier and payment info
 * @param tokenMint - Token mint address
 * @param creatorWallet - Creator wallet address
 * @param tokenData - Token metadata
 * @param paymentInfo - Payment information
 * @returns Promise<CreatedToken> - Created or updated token
 */
export async function createProToken(
  tokenMint: string,
  creatorWallet: string,
  tokenData: any,
  paymentInfo: {
    txSignature: string;
    amount: number;
  }
) {
  return prisma.createdToken.upsert({
    where: { mint: tokenMint },
    update: {
      tier: 'pro',
      paidAmount: paymentInfo.amount,
      paymentTxSignature: paymentInfo.txSignature,
      paymentVerified: true,
      paymentVerifiedAt: new Date(),
      // Update other token fields
      creatorWallet,
      name: tokenData.name,
      ticker: tokenData.symbol,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      amount: tokenData.amount,
      image: tokenData.image,
      description: tokenData.description,
      preset: tokenData.preset,
      vibe: tokenData.vibe,
      links: tokenData.links || {}
    },
    create: {
      mint: tokenMint,
      creatorWallet,
      name: tokenData.name,
      ticker: tokenData.symbol,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      amount: tokenData.amount,
      image: tokenData.image,
      description: tokenData.description,
      preset: tokenData.preset,
      vibe: tokenData.vibe,
      links: tokenData.links || {},
      tier: 'pro',
      paidAmount: paymentInfo.amount,
      paymentTxSignature: paymentInfo.txSignature,
      paymentVerified: true,
      paymentVerifiedAt: new Date()
    }
  });
}

/**
 * Create free token (no payment required)
 * @param tokenMint - Token mint address
 * @param creatorWallet - Creator wallet address
 * @param tokenData - Token metadata
 * @returns Promise<CreatedToken> - Created token
 */
export async function createFreeToken(
  tokenMint: string,
  creatorWallet: string,
  tokenData: any
) {
  return prisma.createdToken.upsert({
    where: { mint: tokenMint },
    update: {
      tier: 'free',
      paidAmount: null,
      paymentTxSignature: null,
      paymentVerified: false,
      paymentVerifiedAt: null,
      // Update other token fields
      creatorWallet,
      name: tokenData.name,
      ticker: tokenData.symbol,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      amount: tokenData.amount,
      image: tokenData.image,
      description: tokenData.description,
      preset: tokenData.preset,
      vibe: tokenData.vibe,
      links: tokenData.links || {}
    },
    create: {
      mint: tokenMint,
      creatorWallet,
      name: tokenData.name,
      ticker: tokenData.symbol,
      symbol: tokenData.symbol,
      decimals: tokenData.decimals,
      amount: tokenData.amount,
      image: tokenData.image,
      description: tokenData.description,
      preset: tokenData.preset,
      vibe: tokenData.vibe,
      links: tokenData.links || {},
      tier: 'free',
      paidAmount: null,
      paymentTxSignature: null,
      paymentVerified: false,
      paymentVerifiedAt: null
    }
  });
}
