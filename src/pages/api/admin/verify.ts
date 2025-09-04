import { NextApiRequest, NextApiResponse } from 'next';
import { verifyWalletSignature, createAdminToken } from '../../../lib/adminAuth';

/**
 * Admin Verify API Endpoint
 * Verifies wallet signatures and creates admin sessions
 * Compatible with the existing login component expectations
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, wallet, signature, message } = req.body;

    // Validate required fields
    if (!id || !wallet || !signature || !message) {
      return res.status(400).json({ 
        error: 'ID, wallet, signature, and message are required' 
      });
    }

    // Extract nonce from message (format: "Please sign this message with your wallet: {nonce}")
    const nonceMatch = message.match(/Please sign this message with your wallet: (.+)/);
    if (!nonceMatch) {
      return res.status(400).json({ error: 'Invalid message format' });
    }

    const nonce = nonceMatch[1];

    // Verify wallet signature
    const isValid = await verifyWalletSignature(wallet, nonce, signature);
    
    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid signature or expired nonce' 
      });
    }

    // Create JWT token for admin session
    const token = createAdminToken(wallet);

    // Set admin session cookie
    res.setHeader('Set-Cookie', [
      `admin_session=${encodeURIComponent(token)}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Lax; Max-Age=${Number(process.env.SESSION_TTL_MIN || 60) * 60}; Path=/`
    ]);

    // Return success response in format expected by login component
    return res.status(200).json({
      ok: true,
      token: token,
      wallet: wallet,
      message: 'Admin authentication successful',
      expiresIn: `${process.env.SESSION_TTL_MIN || 60} minutes`
    });

  } catch (error) {
    console.error('Error verifying signature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
