import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { buildDecreaseLiquidityTx } from "../../../lib/orcaActions";

interface DecreaseLiquidityRequest {
  positionMint: string;
  percent: number;
  slippageBp: number;
  walletPubkey: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { positionMint, percent, slippageBp, walletPubkey } = req.body as DecreaseLiquidityRequest;

    // Validate required fields
    if (!positionMint || percent === undefined || !slippageBp || !walletPubkey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate percent
    if (percent < 0 || percent > 100) {
      return res.status(400).json({ error: "Percent must be between 0-100" });
    }

    // Validate slippage
    if (slippageBp < 10 || slippageBp > 500) {
      return res.status(400).json({ error: "Slippage must be between 10-500 basis points" });
    }

    // Create connection
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );

    // For now, we'll use a mock position since we don't have the full position data
    // In production, you would fetch the actual position data from the blockchain
    const mockPosition = {
      positionMint,
      whirlpool: "mock_whirlpool_address",
      lowerTick: -1000,
      upperTick: 1000,
      liquidity: "1000000",
      tokenA: "So11111111111111111111111111111111111111112", // WSOL
      tokenB: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    };

    // Build the transaction
    const result = await buildDecreaseLiquidityTx({
      connection,
      walletPubkey: new PublicKey(walletPubkey),
      position: mockPosition,
      percent,
      slippageBp,
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error("Error building decrease liquidity transaction:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
