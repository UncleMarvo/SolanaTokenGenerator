import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // JWT tokens are stateless, so we just return success
    // The frontend should remove the token from storage
    return res.status(200).json({
      success: true,
      message: 'Logout successful. Please remove your admin token from storage.'
    });

  } catch (error) {
    console.error('Error during logout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
