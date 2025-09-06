import type { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { IS_DEVNET } from "../../../lib/network";

/**
 * DEVNET Airdrop API Endpoint
 * 
 * This endpoint is only available when NETWORK=devnet is set in environment variables.
 * It provides SOL airdrops for testing purposes on Solana devnet.
 * 
 * Usage:
 * GET /api/dev/airdrop?wallet=<PUBKEY>&sol=5
 * 
 * Parameters:
 * - wallet (required): Public key of the wallet to receive SOL
 * - sol (optional): Amount of SOL to airdrop (default: 2)
 * 
 * Returns:
 * - Success: { ok: true, sig: "transaction_signature" }
 * - Error: { ok: false, error: "error_message" }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "MethodNotAllowed" });
  }

  // Check if we're running on devnet
  if (!IS_DEVNET) {
    return res.status(400).json({ 
      ok: false, 
      error: "NotDevnet",
      message: "Airdrop endpoint is only available on devnet"
    });
  }

  // Extract and validate parameters
  const { wallet, sol = 2 } = req.query as { wallet?: string; sol?: string };

  // Validate wallet parameter
  if (!wallet) {
    return res.status(400).json({ 
      ok: false, 
      error: "MissingWallet",
      message: "wallet parameter is required"
    });
  }

  // Validate wallet format
  let walletPubkey: PublicKey;
  try {
    walletPubkey = new PublicKey(wallet);
  } catch (error) {
    return res.status(400).json({ 
      ok: false, 
      error: "InvalidWallet",
      message: "Invalid wallet public key format"
    });
  }

  // Validate and parse SOL amount
  const solAmount = Number(sol);
  if (isNaN(solAmount) || solAmount <= 0 || solAmount > 10) {
    return res.status(400).json({ 
      ok: false, 
      error: "InvalidAmount",
      message: "SOL amount must be between 0 and 10"
    });
  }

  try {
    // Create connection to devnet
    const connection = new Connection(process.env.RPC_PRIMARY || process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.devnet.solana.com", "confirmed");
    
    // Calculate lamports (1 SOL = 1,000,000,000 lamports)
    const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
    
    // Request airdrop
    const signature = await connection.requestAirdrop(walletPubkey, lamports);
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, "confirmed");
    
    // Return success response
    return res.status(200).json({ 
      ok: true, 
      sig: signature,
      amount: solAmount,
      wallet: wallet,
      message: `Successfully airdropped ${solAmount} SOL to ${wallet}`
    });

  } catch (error: any) {
    console.error("Airdrop error:", error);
    
    // Return error response
    return res.status(500).json({ 
      ok: false, 
      error: "AirdropFailed",
      message: error.message || "Failed to process airdrop"
    });
  }
}
