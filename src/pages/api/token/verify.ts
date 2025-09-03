import { NextApiRequest, NextApiResponse } from "next";
import { verifyHonestMint } from "../../../lib/solanaToken";

/**
 * Verify if a token is honest on-chain
 * Called from the Proof section to check verification status
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mint } = req.body;

    // Validate required parameters
    if (!mint || typeof mint !== "string") {
      return res.status(400).json({ 
        error: "Missing mint parameter",
        message: "mint parameter is required" 
      });
    }

    // Create connection for on-chain verification
    const { Connection } = await import("@solana/web3.js");
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );

    // Perform on-chain verification
    const verified = await verifyHonestMint({ connection, mint });

    console.log(`Token verification for ${mint.slice(0, 8)}...: ${verified ? "Verified" : "Not verified"}`);

    return res.status(200).json({
      verified,
      mint,
      timestamp: new Date().toISOString(),
      message: verified ? "Token verified as honest on-chain" : "Token verification failed"
    });

  } catch (error) {
    console.error("Error verifying token:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to verify token",
      verified: false
    });
  }
}
