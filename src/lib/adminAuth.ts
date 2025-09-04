import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from './db';

// Admin authentication configuration
const ADMIN_WALLETS = process.env.ADMIN_WALLETS?.split(',') || [];
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'fallback-secret-change-in-production';
const SESSION_TTL_MIN = parseInt(process.env.SESSION_TTL_MIN || '60');
const NONCE_TTL_MIN = parseInt(process.env.NONCE_TTL_MIN || '5');

// Legacy admin secret for backward compatibility
const LEGACY_ADMIN_SECRET = process.env.ADMIN_SECRET;

/**
 * Check if a wallet address is in the admin whitelist
 */
export function isAdminWallet(wallet: string): boolean {
  return ADMIN_WALLETS.includes(wallet);
}

/**
 * Generate a secure random nonce for wallet authentication
 */
export function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a JWT token for an authenticated admin session
 */
export function createAdminToken(wallet: string): string {
  const payload = {
    wallet,
    type: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (SESSION_TTL_MIN * 60)
  };
  
  return jwt.sign(payload, ADMIN_JWT_SECRET);
}

/**
 * Verify and decode an admin JWT token
 */
export function verifyAdminToken(token: string): { wallet: string; type: string } | null {
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as any;
    
    // Check if token is expired
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      return null;
    }
    
    // Verify it's an admin token
    if (decoded.type !== 'admin' || !decoded.wallet) {
      return null;
    }
    
    // Verify wallet is still in admin list
    if (!isAdminWallet(decoded.wallet)) {
      return null;
    }
    
    return {
      wallet: decoded.wallet,
      type: decoded.type
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create a new authentication nonce for a wallet
 */
export async function createAuthNonce(wallet: string): Promise<string> {
  // Clean up expired nonces first
  const expiryTime = new Date(Date.now() - (NONCE_TTL_MIN * 60 * 1000));
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
          gte: new Date(Date.now() - (NONCE_TTL_MIN * 60 * 1000))
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
 * Legacy authentication check for backward compatibility
 */
export function checkLegacyAuth(authHeader: string | undefined): boolean {
  if (!LEGACY_ADMIN_SECRET) return false;
  
  const token = authHeader?.replace('Bearer ', '');
  return token === LEGACY_ADMIN_SECRET;
}

/**
 * Main authentication middleware - checks both new JWT and legacy auth
 */
export function authenticateAdmin(authHeader: string | undefined): { 
  isAdmin: boolean; 
  wallet?: string; 
  method: 'jwt' | 'legacy' | 'none' 
} {
  // Try JWT authentication first
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyAdminToken(token);
    
    if (decoded) {
      return {
        isAdmin: true,
        wallet: decoded.wallet,
        method: 'jwt'
      };
    }
  }
  
  // Fall back to legacy authentication
  if (checkLegacyAuth(authHeader)) {
    return {
      isAdmin: true,
      method: 'legacy'
    };
  }
  
  return {
    isAdmin: false,
    method: 'none'
  };
}
