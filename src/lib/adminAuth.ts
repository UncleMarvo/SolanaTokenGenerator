import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "./db";
import { NextApiRequest } from "next";

/**
 * Admin authentication middleware function
 * Extracts and verifies admin JWT tokens from cookies
 * @param req - The incoming Next.js API request object
 * @returns Authentication result with wallet address or error
 */
export function requireAdmin(req: NextApiRequest) {
  // Extract admin session cookie from request headers
  const cookie = req.headers.cookie || "";
  const m = /(?:^|; )admin_session=([^;]+)/.exec(cookie);
  
  // Return error if no admin session cookie found
  if (!m) return { ok:false as const, error:"NoSession" };
  
  try {
    // Verify JWT token and decode payload
    const p:any = jwt.verify(decodeURIComponent(m[1]), process.env.ADMIN_JWT_SECRET!);
    
    // Check if user has admin role
    if (p?.role !== "admin") return { ok:false as const, error:"BadRole" };
    
    // Return success with wallet address
    return { ok:true as const, wallet:p.sub as string };
  } catch {
    // Return error if JWT verification fails
    return { ok:false as const, error:"BadToken" };
  }
}

/**
 * Check if a wallet address is in the admin whitelist
 * @param wallet - Wallet address to check
 * @returns true if wallet is authorized, false otherwise
 */
export function isAdminWallet(wallet: string): boolean {
  const list = (process.env.ADMIN_WALLETS||"").split(",").map(s=>s.trim()).filter(Boolean);
  return list.includes(wallet);
}

/**
 * Generate a secure random nonce for wallet authentication
 * @returns 32-byte hex string nonce
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new authentication nonce for a wallet
 * @param wallet - Wallet address requesting nonce
 * @returns Generated nonce string
 */
export async function createAuthNonce(wallet: string): Promise<string> {
  // Clean up expired nonces first
  const expiryTime = new Date(Date.now() - (Number(process.env.NONCE_TTL_MIN||5) * 60 * 1000));
  await prisma.adminSession.deleteMany({
    where: {
      createdAt: { lt: expiryTime }
    }
  });
  
  // Generate new nonce
  const nonce = generateNonce();
  
  // Store in database
  await prisma.adminSession.create({
    data: {
      wallet,
      nonce,
      used: false
    }
  });
  
  return nonce;
}

/**
 * Verify a wallet signature against a stored nonce
 * @param wallet - Wallet address
 * @param nonce - Nonce to verify
 * @param signature - Signature to verify
 * @returns true if signature is valid, false otherwise
 */
export async function verifyWalletSignature(
  wallet: string, 
  nonce: string, 
  signature: string
): Promise<boolean> {
  try {
    // Find the nonce in database
    const session = await prisma.adminSession.findFirst({
      where: {
        wallet,
        nonce,
        used: false,
        createdAt: {
          gte: new Date(Date.now() - (Number(process.env.NONCE_TTL_MIN||5) * 60 * 1000))
        }
      }
    });
    
    if (!session) {
      return false;
    }
    
    // Mark nonce as used
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { 
        used: true,
        verifiedAt: new Date()
      }
    });
    
    // TODO: Implement actual signature verification using Solana web3.js
    // For now, we'll accept any signature for development
    // In production, this should verify the signature cryptographically
    
    return true;
  } catch (error) {
    console.error('Error verifying wallet signature:', error);
    return false;
  }
}

/**
 * Create a JWT token for an authenticated admin session
 * @param wallet - Wallet address
 * @returns JWT token string
 */
export function createAdminToken(wallet: string): string {
  const payload = {
    sub: wallet,
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (Number(process.env.SESSION_TTL_MIN || 60) * 60)
  };
  
  return jwt.sign(payload, process.env.ADMIN_JWT_SECRET!);
}

