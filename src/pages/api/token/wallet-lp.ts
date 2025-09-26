import { NextApiRequest, NextApiResponse } from "next";
import { fetchOrcaPositionsReal } from "../../../lib/orcaPositions";

/**
 * Check if a wallet has LP positions for a specific token
 * Supports Orca Whirlpool positions (Raydium LP ATAs to be added later)
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mint, owner } = req.query;

    // Validate required parameters
    if (!mint || typeof mint !== "string") {
      return res.status(400).json({ 
        error: "Missing mint parameter",
        message: "mint parameter is required" 
      });
    }

    if (!owner || typeof owner !== "string") {
      // If no owner specified, return false (no wallet connected)
      return res.status(200).json({ 
        has: false, 
        positionsCount: 0,
        message: "No wallet owner specified"
      });
    }

    // Fetch Orca positions for the wallet owner
    let hasOrcaLP = false;
    let orcaPositionsCount = 0;
    
    try {
      // Create connection for Orca position fetching
      const { Connection } = await import("@solana/web3.js");
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
      );
      
      const orcaPositions = await fetchOrcaPositionsReal({ connection, owner });
      
      if (orcaPositions && orcaPositions.length > 0) {
        // Check if any position involves the target mint
        hasOrcaLP = orcaPositions.some(position => 
          position.tokenA === mint || 
          position.tokenB === mint
        );
        orcaPositionsCount = orcaPositions.length;
      }
    } catch (error) {
      console.warn("Failed to fetch Orca positions for wallet LP check:", error);
      // Continue with false result if Orca check fails
    }

    // Check Raydium LP positions
    let hasRaydiumLP = false;
    let raydiumPositionsCount = 0;
    
    try {
      // Create connection for Raydium position fetching
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const connection = new Connection(
        process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
      );
      
      // Import the Raydium position fetching function
      const { fetchRaydiumLpBalances } = await import('../../../lib/positions');
      
      const raydiumPositions = await fetchRaydiumLpBalances({ 
        connection, 
        walletPubkey: new PublicKey(owner) 
      });
      
      hasRaydiumLP = raydiumPositions.length > 0;
      raydiumPositionsCount = raydiumPositions.length;
      
      console.log(`Raydium LP check for ${mint.slice(0, 8)}... by ${owner.slice(0, 8)}...: ${hasRaydiumLP ? "Yes" : "No"} (${raydiumPositionsCount} positions)`);
      
    } catch (error) {
      console.warn("Raydium LP check failed:", error);
      // Continue with false result if Raydium check fails
    }

    // Combine Orca and Raydium results
    const hasLP = hasOrcaLP || hasRaydiumLP;
    const totalPositionsCount = orcaPositionsCount + raydiumPositionsCount;

    console.log(`Wallet LP check for ${mint.slice(0, 8)}... by ${owner.slice(0, 8)}...: ${hasLP ? "Yes" : "No"} (${totalPositionsCount} total positions)`);

    return res.status(200).json({
      has: hasLP,
      positionsCount: totalPositionsCount,
      source: hasOrcaLP && hasRaydiumLP ? "both" : hasOrcaLP ? "orca" : "raydium",
      details: {
        orca: {
          has: hasOrcaLP,
          count: orcaPositionsCount
        },
        raydium: {
          has: hasRaydiumLP,
          count: raydiumPositionsCount
        }
      }
    });

  } catch (error) {
    console.error("Error checking wallet LP:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to check wallet LP status" 
    });
  }
}
