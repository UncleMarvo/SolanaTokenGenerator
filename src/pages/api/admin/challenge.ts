import { NextApiRequest, NextApiResponse } from 'next';
import { isAdminWallet, createAuthNonce } from '../../../lib/adminAuth';

/**
 * Admin Challenge API Endpoint
 * Generates authentication challenges for admin wallet login
 * Compatible with the existing login component expectations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet } = req.body;

    // Validate wallet address
    if (!wallet || typeof wallet !== 'string') {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Check if wallet is in admin whitelist
    if (!isAdminWallet(wallet)) {
      return res.status(403).json({ error: 'Wallet not authorized for admin access' });
    }

    // Generate authentication nonce
    const nonce = await createAuthNonce(wallet);

    // Create message for wallet to sign
    const message = `Please sign this message with your wallet: ${nonce}`;

    // Return response in format expected by login component
    return res.status(200).json({
      id: nonce, // Use nonce as ID for compatibility
      message: message,
      nonce: nonce,
      expiresIn: `${process.env.NONCE_TTL_MIN || 5} minutes`
    });

  } catch (error) {
    console.error('Error generating challenge:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
