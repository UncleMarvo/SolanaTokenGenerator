import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildCommitTx } from "../../../lib/orcaCommit";
import { flags } from "../../../lib/flags";

interface LiquidityCommitRequest {
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  tokenMint: string;
  baseAmount: string;
  quoteAmount: string;
  quoteId: string;
  whirlpool?: string; // Required for Orca
  slippageBp?: number; // Slippage in basis points (default: 100 = 1%)
}

interface LiquidityCommitResponse {
  txid?: string; // For Raydium (mocked)
  txBase64?: string; // For Orca (base64 encoded)
  summary?: {
    whirlpool: string;
    tokenMintA: string;
    tokenMintB: string;
    inputMint: "A" | "B";
    inputAmountUi: string;
    expectedOutputAmountUi: string;
    slippageBp: number;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    tickSpacing: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LiquidityCommitResponse | { error: string; message?: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { 
      dex, 
      pair, 
      tokenMint, 
      baseAmount, 
      quoteAmount, 
      quoteId, 
      whirlpool, 
      slippageBp = 100 
    }: LiquidityCommitRequest = req.body;

    if (!dex || !pair || !tokenMint || !baseAmount || !quoteAmount || !quoteId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Handle Raydium (mocked for now)
    if (dex === "Raydium") {
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substr(2, 9);
      const txid = `MockTx${timestamp}${randomSuffix}`;

      return res.status(200).json({ txid });
    }

    // Handle Orca (real implementation)
    if (dex === "Orca") {
      // Check if Orca commit functionality is enabled
      if (!flags.orcaCommit) {
        return res.status(503).json({ 
          error: "Disabled", 
          message: "Orca liquidity commit temporarily disabled" 
        });
      }

      if (!whirlpool) {
        return res.status(400).json({ error: "Whirlpool address required for Orca" });
      }

      // Validate slippage
      if (slippageBp < 10 || slippageBp > 500) {
        return res.status(400).json({ error: "Slippage must be between 10-500 basis points (0.1%-5%)" });
      }

      // Initialize Solana connection
      const connection = new Connection(process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com");
      
      // Determine token mints based on pair
      const tokenMintA = pair === "SOL/TOKEN" ? "So11111111111111111111111111111111111111112" : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      const tokenMintB = tokenMint;
      
      // Determine input mint and amount
      const inputMint: "A" | "B" = pair === "SOL/TOKEN" ? "A" : "A"; // Always input the base token (SOL/USDC)
      const inputAmountUi = baseAmount;

      // Build the commit transaction
      const result = await buildCommitTx({
        connection,
        walletPubkey: new PublicKey("11111111111111111111111111111111"), // Placeholder - will be replaced by client
        whirlpool,
        tokenMintA,
        tokenMintB,
        inputMint,
        inputAmountUi,
        slippageBp
      });

      return res.status(200).json({
        txBase64: result.txBase64,
        summary: result.summary
      });
    }

    return res.status(400).json({ error: "Unsupported DEX" });

  } catch (error) {
    console.error("Error committing liquidity:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
