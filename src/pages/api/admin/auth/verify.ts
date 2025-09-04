import { NextApiRequest, NextApiResponse } from 'next';
import { verifyWalletSignature, createAdminToken } from '../../../../lib/adminAuth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { wallet, nonce, signature } = req.body;

    // Validate required fields
    if (!wallet || !nonce || !signature) {
      return res.status(400).json({ 
        error: 'Wallet, nonce, and signature are required' 
      });
    }

    // Verify wallet signature
    const isValid = await verifyWalletSignature(wallet, nonce, signature);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid signature or expired nonce' 
      });
    }

    // Create JWT token for admin session
    const token = createAdminToken(wallet);

    // Return success with JWT token
    return res.status(200).json({
      success: true,
      token,
      wallet,
      message: 'Admin authentication successful',
      expiresIn: `${process.env.SESSION_TTL_MIN || 60} minutes`
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
