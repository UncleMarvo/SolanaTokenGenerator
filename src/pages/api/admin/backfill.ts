import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/db";
import { getConnection } from "../../../lib/rpc";
import { findClmmPositionMintFromTx } from "../../../lib/txParse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Admin authentication check
  const admin = process.env.ADMIN_SECRET;
  const auth = req.headers.authorization?.replace("Bearer ", "");
  
  if (admin && auth !== admin) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { limit = 200 } = req.body || {};

    // Get connection for RPC calls
    const conn = getConnection("primary");
    
    // Find Raydium commit events that don't have position mints yet
    const events = await prisma.txEvent.findMany({
      where: { 
        dex: "raydium", 
        action: "commit",
        positionMint: null // Only process events without position mints
      },
      orderBy: { ts: "desc" },
      take: limit,
    });

    let updated = 0;
    let errors = 0;

    // Process each event to extract position mint and upsert
    for (const ev of events) {
      try {
        // Skip if already has position mint
        if (ev.positionMint) continue;

        // Extract position mint from transaction
        const posMint = await findClmmPositionMintFromTx(
          conn, 
          ev.txSig, 
          { 
            wallet: ev.wallet, 
            poolId: ev.poolId ?? undefined 
          }
        );

        if (!posMint) continue;

        // Upsert to positions_clmm table
        await prisma.positionsClmm.upsert({
          where: { positionMint: posMint },
          update: { 
            wallet: ev.wallet, 
            poolId: ev.poolId ?? "", 
            updatedAt: new Date() 
          },
          create: { 
            positionMint: posMint, 
            wallet: ev.wallet, 
            poolId: ev.poolId ?? "", 
            tokenA: "", 
            tokenB: "", 
            decA: 0, 
            decB: 0, 
            tickLower: 0, 
            tickUpper: 0, 
            lastLiquidity: "0" 
          },
        });

        // Update tx_event with position mint reference
        await prisma.txEvent.update({ 
          where: { txSig: ev.txSig }, 
          data: { positionMint: posMint } 
        });

        updated++;
        console.log(`Backfilled position ${posMint} for tx ${ev.txSig.slice(0, 8)}...`);

      } catch (error) {
        errors++;
        console.warn(`Failed to process event ${ev.txSig}:`, error);
        // Continue processing other events
      }
    }

    return res.status(200).json({ 
      scanned: events.length, 
      updated, 
      errors,
      message: `Successfully backfilled ${updated} positions from ${events.length} events`
    });

  } catch (error) {
    console.error("Backfill error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}
