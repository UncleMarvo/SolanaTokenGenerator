import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildIncreaseTx, IncreaseParams } from "../../../lib/orcaActions.increase";
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
    const body = req.body as Partial<IncreaseParams>;
    
    // Validate required fields
    const requiredFields = ['walletPubkey', 'whirlpool', 'positionPda', 'positionMint', 'tickLower', 'tickUpper', 'tokenA', 'tokenB', 'inputMint', 'amountUi'];
    for (const field of requiredFields) {
      if (!body[field as keyof IncreaseParams]) {
        return res.status(400).json({ 
          error: "Missing required field", 
          message: `Field '${field}' is required` 
        });
      }
    }

    // Validate inputMint
    if (body.inputMint !== 'A' && body.inputMint !== 'B') {
      return res.status(400).json({ 
        error: "Invalid inputMint", 
        message: "inputMint must be 'A' or 'B'" 
      });
    }

    // Validate amountUi
    if (typeof body.amountUi !== 'number' || body.amountUi <= 0) {
      return res.status(400).json({ 
        error: "Invalid amountUi", 
        message: "amountUi must be a positive number" 
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

    // Preflight check: validate balances and ensure ATAs exist
    const owner = new PublicKey(body.walletPubkey!);
    const tokenMints = [
      new PublicKey(body.tokenA!),
      new PublicKey(body.tokenB!)
    ];
    
    // Calculate required amounts (convert UI amount to raw)
    const inputMint = new PublicKey(body.inputMint === "A" ? body.tokenA! : body.tokenB!);
    const [mintAInfo, mintBInfo] = await Promise.all([
      connection.getParsedAccountInfo(new PublicKey(body.tokenA!)),
      connection.getParsedAccountInfo(new PublicKey(body.tokenB!))
    ]);
    
    const decA = (mintAInfo.value?.data as any)?.parsed?.info?.decimals || 9;
    const decB = (mintBInfo.value?.data as any)?.parsed?.info?.decimals || 9;
    const inputDecimals = body.inputMint === "A" ? decA : decB;
    const requiredAmount = BigInt(Math.floor(body.amountUi! * Math.pow(10, inputDecimals)));
    
    const requiredAmounts = {
      [inputMint.toBase58()]: requiredAmount
    };
    
    const preflight = await preflightPositionOperation(
      connection,
      owner,
      tokenMints,
      requiredAmounts,
      "increase liquidity"
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
    const result = await buildIncreaseTx({
      connection,
      walletPubkey: body.walletPubkey!,
      whirlpool: body.whirlpool!,
      positionPda: body.positionPda!,
      positionMint: body.positionMint!,
      tickLower: body.tickLower!,
      tickUpper: body.tickUpper!,
      tokenA: body.tokenA!,
      tokenB: body.tokenB!,
      inputMint: body.inputMint!,
      amountUi: body.amountUi!,
      slippageBp: body.slippageBp || 100
    });

    // Return success response
    return res.status(200).json({
      txBase64: result.txBase64,
      summary: result.summary
    });

  } catch (error) {
    console.error("Error building increase liquidity transaction:", error);
    
    // Return error response
    return res.status(400).json({ 
      error: "Failed to build transaction", 
      message: error instanceof Error ? error.message : "Unknown error occurred" 
    });
  }
}
