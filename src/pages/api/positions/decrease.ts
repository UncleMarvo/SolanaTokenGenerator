import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildDecreaseTx, DecreaseParams } from "../../../lib/orcaActions.decrease";
import { preflightPositionOperation, getFriendlyErrorMessage } from "../../../lib/preflight";
import { getTokenBalanceUi } from "../../../lib/balances";
import { isWSOL } from "../../../lib/wsol";
import { clampSlippageBp } from "../../../lib/slippage";
import { mapDexError } from "../../../lib/errors";
import { flags } from "../../../lib/flags";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check if Orca actions are enabled
  if (!flags.orcaActions) {
    return res.status(503).json({ 
      error: "Disabled", 
      message: "Orca actions temporarily disabled" 
    });
  }

  try {
    // Parse JSON body
    const body = req.body as Partial<DecreaseParams>;
    
    // Validate required fields
    const requiredFields = ['walletPubkey', 'whirlpool', 'positionPda', 'positionMint', 'tickLower', 'tickUpper', 'tokenA', 'tokenB', 'percent'];
    for (const field of requiredFields) {
      if (!body[field as keyof DecreaseParams]) {
        return res.status(400).json({ 
          error: "Missing required field", 
          message: `Field '${field}' is required` 
        });
      }
    }

    // Validate percent
    if (typeof body.percent !== 'number' || body.percent < 0 || body.percent > 100) {
      return res.status(400).json({ 
        error: "Invalid percent", 
        message: "percent must be between 0 and 100" 
      });
    }

    // Validate slippageBp (optional, default 100) using centralized helper
    if (body.slippageBp !== undefined) {
      const clamped = clampSlippageBp(body.slippageBp);
      if (clamped !== body.slippageBp) {
        return res.status(400).json({ 
          error: "Invalid slippageBp", 
          message: `slippageBp must be between 10 and 500 basis points, got ${body.slippageBp}` 
        });
      }
    }

    // Build Connection (mainnet RPC)
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );

    // Preflight check: validate SOL balance and ensure ATAs exist
    const owner = new PublicKey(body.walletPubkey!);
    const tokenMints = [
      new PublicKey("11111111111111111111111111111111"), // Placeholder for now
      new PublicKey("11111111111111111111111111111111")  // Placeholder for now
    ];
    
    // For decrease operations, we mainly need SOL for fees
    // Token amounts will be determined by the SDK when building the transaction
    const preflight = await preflightPositionOperation(
      connection,
      owner,
      tokenMints,
      {}, // No specific token amounts required for decrease
      "decrease liquidity"
    );
    
    if (!preflight.isValid) {
      const friendlyMessage = getFriendlyErrorMessage(preflight.errors);
      return res.status(400).json({ 
        error: "Preflight check failed", 
        message: friendlyMessage,
        details: preflight.errors
      });
    }

    // Additional balance check: verify user has sufficient tokens for the decrease
    // For decrease operations, we mainly need to check if the position exists and user has SOL for fees
    // The actual token amounts will be determined by the SDK when building the transaction
    
    // WSOL unwrap warning: if decreasing 100% and one side is WSOL, warn about unwrapping
    const isTokenAWSOL = isWSOL(body.tokenA!);
    const isTokenBWSOL = isWSOL(body.tokenB!);
    const isFullClose = body.percent! >= 100;
    
    let wsolWarning = null;
    if (isFullClose && (isTokenAWSOL || isTokenBWSOL)) {
      wsolWarning = "Note: Decreasing 100% will unwrap WSOL back to SOL";
    }

    // Call the builder
    const result = await buildDecreaseTx({
      connection,
      walletPubkey: body.walletPubkey!,
      whirlpool: body.whirlpool!,
      positionPda: body.positionPda!,
      positionMint: body.positionMint!,
      tickLower: body.tickLower!,
      tickUpper: body.tickUpper!,
      tokenA: body.tokenA!,
      tokenB: body.tokenB!,
      percent: body.percent!,
      slippageBp: body.slippageBp || 100
    });

    // Return success response
    return res.status(200).json({
      txBase64: result.txBase64,
      summary: result.summary,
      warning: wsolWarning
    });

  } catch (error) {
    console.error("Error building decrease liquidity transaction:", error);
    
    // Map error to clean code and message
    const { code, message } = mapDexError(error);
    return res.status(400).json({ error: code, message });
  }
}
