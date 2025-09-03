import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildCommitTx } from "../../../lib/orcaCommit";
import { buildRaydiumClmmCommitTx } from "../../../lib/raydiumClmmCommit";
import { flags } from "../../../lib/flags";
import { withRpc } from "../../../lib/rpc";
import { logAction } from "../../../lib/log";

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
  // NEW: Tick boundaries from quote for Raydium CLMM
  tickLower?: number; // Lower tick boundary from quote
  tickUpper?: number; // Upper tick boundary from quote
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

interface LiquidityCommitError {
  error: string;
  message: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LiquidityCommitResponse | LiquidityCommitError>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ error: "MethodNotAllowed", message: "Method not allowed" });
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
      slippageBp = 100,
      tickLower,
      tickUpper,
    }: LiquidityCommitRequest = req.body;

    if (
      !dex ||
      !pair ||
      !tokenMint ||
      !baseAmount ||
      !quoteAmount ||
      !quoteId
    ) {
      return res
        .status(400)
        .json({ error: "MissingFields", message: "Missing required fields" });
    }

    // Handle Raydium CLMM (real implementation)
    if (dex === "Raydium") {
      // Check if USDC/TOKEN pair (CLMM only supports USDC pairs for now)
      if (pair !== "USDC/TOKEN") {
        return res.status(400).json({
          error: "Unsupported pair",
          message: "Raydium CLMM only supports USDC/TOKEN pairs",
        });
      }

      if (!clmmPoolId) {
        return res.status(400).json({
          error: "Missing CLMM pool ID",
          message: "CLMM pool ID is required for Raydium liquidity commitment",
        });
      }

      // Validate slippage
      if (slippageBp < 10 || slippageBp > 500) {
        return res.status(400).json({
          error: "Invalid slippage",
          message: "Slippage must be between 10-500 basis points (0.1%-5%)",
        });
      }

      // Determine input mint and amount
      const inputMint: "TOKEN" | "USDC" = "TOKEN"; // User always inputs their token
      const inputAmountUi = parseFloat(baseAmount);

      if (isNaN(inputAmountUi) || inputAmountUi <= 0) {
        return res.status(400).json({
          error: "Invalid amount",
          message: "Base amount must be a positive number",
        });
      }

      // Validate tick boundaries from quote
      if (typeof tickLower !== "number" || typeof tickUpper !== "number") {
        return res.status(400).json({
          error: "Missing tick boundaries",
          message:
            "Tick boundaries (tickLower, tickUpper) are required from quote for Raydium CLMM",
        });
      }

      // Build the CLMM commit transaction with RPC failover and structured logging
      const t0 = Date.now();
      try {
        const result = await withRpc((conn) =>
          buildRaydiumClmmCommitTx({
            connection: conn,
            walletPubkey: "11111111111111111111111111111111", // Placeholder - will be replaced by client
            tokenMint,
            inputMint,
            amountUi: inputAmountUi,
            slippageBp,
            clmmPoolId,
            tickLower,
            tickUpper,
          })
        );

        // Log successful action
        logAction({
          action: "commit",
          dex: "raydium",
          mint: tokenMint,
          poolId: clmmPoolId,
          wallet: "11111111111111111111111111111111",
          ms: Date.now() - t0,
          ok: true,
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
          },
        });
      } catch (error: any) {
        // Log failed action
        logAction({
          action: "commit",
          dex: "raydium",
          mint: tokenMint,
          poolId: clmmPoolId,
          wallet: "11111111111111111111111111111111",
          ms: Date.now() - t0,
          ok: false,
          msg: error?.message,
        });

        console.error("Error building Raydium CLMM transaction:", error);

        // Return structured error response
        const errorCode = error.code || "ProviderError";
        const errorMessage = error.message || "Unknown error occurred";

        return res.status(500).json({
          error: errorCode,
          message: errorMessage,
          details: error.originalError
            ? error.originalError.message
            : undefined,
        });
      }
    }

    // Handle Orca (real implementation)
    if (dex === "Orca") {
      // Check if Orca commit functionality is enabled
      if (!flags.orcaCommit) {
        return res.status(503).json({
          error: "Disabled",
          message: "Orca liquidity commit temporarily disabled",
        });
      }

      if (!whirlpool) {
        return res
          .status(400)
          .json({
            error: "MissingWhirlpool",
            message: "Whirlpool address required for Orca",
          });
      }

      // Validate slippage
      if (slippageBp < 10 || slippageBp > 500) {
        return res
          .status(400)
          .json({
            error: "InvalidSlippage",
            message: "Slippage must be between 10-500 basis points (0.1%-5%)",
          });
      }

      // Determine token mints based on pair
      const tokenMintA =
        pair === "SOL/TOKEN"
          ? "So11111111111111111111111111111111111111112"
          : "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
      const tokenMintB = tokenMint;

      // Determine input mint and amount
      const inputMint: "A" | "B" = pair === "SOL/TOKEN" ? "A" : "A"; // Always input the base token (SOL/USDC)
      const inputAmountUi = baseAmount;

      // Build the commit transaction with RPC failover and structured logging
      const t0 = Date.now();
      try {
        const result = await withRpc((conn) =>
          buildCommitTx({
            connection: conn,
            walletPubkey: new PublicKey("11111111111111111111111111111111"), // Placeholder - will be replaced by client
            whirlpool,
            tokenMintA,
            tokenMintB,
            inputMint,
            inputAmountUi,
            slippageBp,
          })
        );

        // Log successful action
        logAction({
          action: "commit",
          dex: "orca",
          mint: tokenMint,
          poolId: whirlpool,
          wallet: "11111111111111111111111111111111",
          ms: Date.now() - t0,
          ok: true,
        });

        return res.status(200).json({
          txBase64: result.txBase64,
          summary: result.summary,
        });
      } catch (error: any) {
        // Log failed action
        logAction({
          action: "commit",
          dex: "orca",
          mint: tokenMint,
          poolId: whirlpool,
          wallet: "11111111111111111111111111111111",
          ms: Date.now() - t0,
          ok: false,
          msg: error?.message,
        });

        console.error("Error building Orca commit transaction:", error);
        throw error;
      }
    }

    // Handle unsupported DEX
    return res
      .status(400)
      .json({ error: "UnsupportedDEX", message: "Unsupported DEX" });
  } catch (error) {
    console.error("Error committing liquidity:", error);
    res
      .status(500)
      .json({ error: "InternalError", message: "Internal server error" });
  }
}
