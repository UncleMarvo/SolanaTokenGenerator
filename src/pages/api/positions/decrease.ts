import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildDecreaseTx, DecreaseParams } from "../../../lib/orcaActions.decrease";
import { preflightPositionOperation, getFriendlyErrorMessage } from "../../../lib/preflight";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse JSON body
    const body = req.body as Partial<DecreaseParams>;
    
    // Validate required fields
    const requiredFields = ['walletPubkey', 'whirlpool', 'positionPda', 'positionMint', 'tickLower', 'tickUpper', 'percent'];
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

    // Validate slippageBp (optional, default 100)
    if (body.slippageBp !== undefined) {
      if (typeof body.slippageBp !== 'number' || body.slippageBp < 10 || body.slippageBp > 500) {
        return res.status(400).json({ 
          error: "Invalid slippageBp", 
          message: "slippageBp must be between 10 and 500 basis points" 
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

    // Call the builder
    const result = await buildDecreaseTx({
      connection,
      walletPubkey: body.walletPubkey!,
      whirlpool: body.whirlpool!,
      positionPda: body.positionPda!,
      positionMint: body.positionMint!,
      tickLower: body.tickLower!,
      tickUpper: body.tickUpper!,
      percent: body.percent!,
      slippageBp: body.slippageBp || 100
    });

    // Return success response
    return res.status(200).json({
      txBase64: result.txBase64,
      summary: result.summary
    });

  } catch (error) {
    console.error("Error building decrease liquidity transaction:", error);
    
    // Return error response
    return res.status(400).json({ 
      error: "Failed to build transaction", 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}
