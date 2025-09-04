import { NextApiRequest, NextApiResponse } from "next";
import { Connection } from "@solana/web3.js";
import { prisma } from "../../../lib/db";
import { findClmmPositionMint } from "../../../lib/txParse";

// Type for the request body
interface TxNotifyRequest {
  txSig: string;
  wallet: string;
  mint: string;
  dex: "raydium" | "orca";
  context?: {
    poolId?: string;
    positionMint?: string;
    tickLower?: number;
    tickUpper?: number;
    tokenA?: string;
    tokenB?: string;
    decA?: number;
    decB?: number;
    lastLiquidity?: string;
    action?: string;
    amountA?: string;
    amountB?: string;
    liquidityDelta?: string;
    // NEW: Fee tracking fields
    skimBp?: number;
    skimA?: string;
    skimB?: string;
    flatSol?: number;
  };
}

// Type for the response
interface TxNotifyResponse {
  saved: boolean;
  positionMint?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TxNotifyResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ saved: false, error: "Method not allowed" });
  }

  try {
    const body: TxNotifyRequest = req.body;

    // Validate required fields
    if (!body.txSig || !body.wallet || !body.mint || !body.dex) {
      return res.status(400).json({
        saved: false,
        error: "Missing required fields: txSig, wallet, mint, or dex"
      });
    }

    // Normalize strings (trim whitespace)
    const txSig = body.txSig.trim();
    const wallet = body.wallet.trim();
    const mint = body.mint.trim();
    const dex = body.dex;

    // Upsert TxEvent by txSig (idempotent)
    const txEvent = await prisma.txEvent.upsert({
      where: { txSig },
      update: {
        // Update fields if they exist in context
        ...(body.context?.action && { action: body.context.action }),
        ...(body.context?.amountA && { amountA: body.context.amountA }),
        ...(body.context?.amountB && { amountB: body.context.amountB }),
        ...(body.context?.liquidityDelta && { liquidityDelta: body.context.liquidityDelta }),
        ...(body.context?.poolId && { poolId: body.context.poolId }),
        ...(body.context?.positionMint && { positionMint: body.context.positionMint }),
        // NEW: Update fee fields if they exist
        ...(body.context?.skimBp !== undefined && { skimBp: body.context.skimBp }),
        ...(body.context?.skimA && { skimA: body.context.skimA }),
        ...(body.context?.skimB && { skimB: body.context.skimB }),
        ...(body.context?.flatSol !== undefined && { flatSol: body.context.flatSol }),
        ts: new Date() // Update timestamp
      },
      create: {
        txSig,
        wallet,
        mint,
        action: body.context?.action || "unknown",
        amountA: body.context?.amountA || null,
        amountB: body.context?.amountB || null,
        liquidityDelta: body.context?.liquidityDelta || null,
        poolId: body.context?.poolId || null,
        positionMint: body.context?.positionMint || null,
        // NEW: Include fee fields
        skimBp: body.context?.skimBp || null,
        skimA: body.context?.skimA || null,
        skimB: body.context?.skimB || null,
        flatSol: body.context?.flatSol || null,
        success: true,
        ts: new Date()
      }
    });

    // If this is a Raydium transaction and we have position metadata, upsert PositionsClmm
    let positionMint: string | undefined;
    if (dex === "raydium" && body.context?.poolId && 
        body.context?.tickLower !== undefined && body.context?.tickUpper !== undefined) {
      
      const context = body.context;
      let finalPositionMint = context.positionMint;
      
      // If positionMint is missing, try to extract it from the transaction
      if (!finalPositionMint) {
        console.log(`Position mint missing for Raydium transaction ${txSig}, attempting to extract from transaction`);
        
        try {
          // Create a Solana connection for transaction parsing
          const connection = new Connection(
            process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
          );
          
          // Attempt to find the position mint from the transaction
          const discoveredPositionMint = await findClmmPositionMint(connection, txSig, {
            wallet,
            poolId: context.poolId
          });
          
          if (discoveredPositionMint) {
            console.log(`Successfully extracted position mint: ${discoveredPositionMint}`);
            finalPositionMint = discoveredPositionMint;
          } else {
            console.log("Could not extract position mint from transaction");
          }
        } catch (error) {
          console.error("Error extracting position mint from transaction:", error);
        }
      }
      
      // Only proceed if we have a position mint (either from context or discovered)
      if (finalPositionMint) {
        // Upsert PositionsClmm by positionMint
        const position = await prisma.positionsClmm.upsert({
          where: { positionMint: finalPositionMint },
          update: {
            // Update all fields that might have changed
            poolId: context.poolId,
            tokenA: context.tokenA || "",
            tokenB: context.tokenB || "",
            decA: context.decA || 0,
            decB: context.decB || 0,
            tickLower: context.tickLower,
            tickUpper: context.tickUpper,
            lastLiquidity: context.lastLiquidity || "",
            updatedAt: new Date()
          },
          create: {
            positionMint: finalPositionMint,
            wallet,
            poolId: context.poolId,
            tokenA: context.tokenA || "",
            tokenB: context.tokenB || "",
            decA: context.decA || 0,
            decB: context.decB || 0,
            tickLower: context.tickLower,
            tickUpper: context.tickUpper,
            lastLiquidity: context.lastLiquidity || "",
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        positionMint = position.positionMint;
      } else {
        console.log("Skipping PositionsClmm upsert - no position mint available");
      }
    }

    return res.status(200).json({
      saved: true,
      positionMint
    });

  } catch (error) {
    console.error("Error in tx/notify:", error);
    return res.status(500).json({
      saved: false,
      error: "Internal server error"
    });
  }
}
