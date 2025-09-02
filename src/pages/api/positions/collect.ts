import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildCollectTx, CollectParams } from "../../../lib/orcaActions.collect";
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
    const body = req.body as Partial<CollectParams>;
    
    // Validate required fields
    const requiredFields = ['walletPubkey', 'whirlpool', 'positionPda', 'positionMint'];
    for (const field of requiredFields) {
      if (!body[field as keyof CollectParams]) {
        return res.status(400).json({ 
          error: "Missing required field", 
          message: `Field '${field}' is required` 
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
    
    // For collect operations, we mainly need SOL for fees
    // No specific token amounts are required for collecting fees
    const preflight = await preflightPositionOperation(
      connection,
      owner,
      tokenMints,
      {}, // No specific token amounts required for collect
      "collect fees"
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
    const result = await buildCollectTx({
      connection,
      walletPubkey: body.walletPubkey!,
      whirlpool: body.whirlpool!,
      positionPda: body.positionPda!,
      positionMint: body.positionMint!
    });

    // Return success response
    return res.status(200).json({
      txBase64: result.txBase64,
      summary: result.summary
    });

  } catch (error) {
    console.error("Error building collect fees transaction:", error);
    
    // Return error response
    return res.status(400).json({ 
      error: "Failed to build transaction", 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}
