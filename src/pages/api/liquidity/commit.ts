import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildCommitTx } from "../../../lib/orcaCommit";
import { buildRaydiumClmmCommitTx } from "../../../lib/raydiumClmmCommit";
import { flags } from "../../../lib/flags";

interface LiquidityCommitRequest {
  dex: "Raydium" | "Orca";
  pair: "SOL/TOKEN" | "USDC/TOKEN";
  tokenMint: string;
  baseAmount: string;
  quoteAmount: string;
  quoteId: string;
  whirlpool?: string; // Required for Orca
  clmmPoolId?: string; // Required for Raydium CLMM
  slippageBp?: number; // Slippage in basis points (default: 100 = 1%)
}

interface LiquidityCommitResponse {
  txid?: string; // For Raydium (mocked)
  txBase64?: string; // For Orca/Raydium CLMM (base64 encoded)
  summary?: {
    whirlpool?: string; // For Orca
    clmmPoolId?: string; // For Raydium CLMM
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
      clmmPoolId,
      slippageBp = 100 
    }: LiquidityCommitRequest = req.body;

    if (!dex || !pair || !tokenMint || !baseAmount || !quoteAmount || !quoteId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Handle Raydium CLMM (real implementation)
    if (dex === "Raydium") {
      // Check if USDC/TOKEN pair (CLMM only supports USDC pairs for now)
      if (pair !== "USDC/TOKEN") {
        return res.status(400).json({ 
          error: "Unsupported pair", 
          message: "Raydium CLMM only supports USDC/TOKEN pairs" 
        });
      }

      if (!clmmPoolId) {
        return res.status(400).json({ 
          error: "Missing CLMM pool ID", 
          message: "CLMM pool ID is required for Raydium liquidity commitment" 
        });
      }

      // Validate slippage
      if (slippageBp < 10 || slippageBp > 500) {
        return res.status(400).json({ 
          error: "Invalid slippage", 
          message: "Slippage must be between 10-500 basis points (0.1%-5%)" 
        });
      }

      try {
        // Initialize Solana connection
        const connection = new Connection(
          process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
        );

        // Determine input mint and amount
        const inputMint: "TOKEN" | "USDC" = "TOKEN"; // User always inputs their token
        const inputAmountUi = parseFloat(baseAmount);

        if (isNaN(inputAmountUi) || inputAmountUi <= 0) {
          return res.status(400).json({ 
            error: "Invalid amount", 
            message: "Base amount must be a positive number" 
          });
        }

        // Build the CLMM commit transaction
        const result = await buildRaydiumClmmCommitTx({
          connection,
          walletPubkey: "11111111111111111111111111111111", // Placeholder - will be replaced by client
          tokenMint,
          inputMint,
          amountUi: inputAmountUi,
          slippageBp,
          clmmPoolId
        });

        return res.status(200).json({
          txBase64: result.txBase64,
          summary: {
            clmmPoolId: clmmPoolId,
            tokenMintA: result.mints.A,
            tokenMintB: result.mints.B,
            inputMint: result.summary.inputIsA ? "A" : "B",
            inputAmountUi: baseAmount,
            expectedOutputAmountUi: "0", // CLMM doesn't provide this in the same way
            slippageBp,
            tickLower: result.summary.tickLower,
            tickUpper: result.summary.tickUpper,
            currentTick: 0, // Not provided by CLMM quote
            tickSpacing: 0, // Not provided by CLMM quote
          }
        });

      } catch (error) {
        console.error("Error building Raydium CLMM transaction:", error);
        return res.status(500).json({ 
          error: "CLMM transaction build failed", 
          message: error instanceof Error ? error.message : "Unknown error" 
        });
      }
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
