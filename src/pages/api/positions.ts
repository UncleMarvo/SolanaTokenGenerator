import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { fetchOrcaPositionsReal } from "../../lib/orcaPositions";
import { fetchRaydiumPositions } from "../../lib/raydiumPositions";

// Simple in-memory cache for positions
const positionsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30 * 1000; // 30 seconds

interface PositionsRequest {
  owner: string;
}

interface PositionsResponse {
  orcaPositions: any[];
  raydiumPositions: any[];
  timestamp: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PositionsResponse | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { owner } = req.query;
    
    if (!owner || Array.isArray(owner)) {
      return res.status(400).json({ error: "Owner public key is required" });
    }

    // Validate public key format
    let ownerPubkey: PublicKey;
    try {
      ownerPubkey = new PublicKey(owner);
    } catch (error) {
      return res.status(400).json({ error: "Invalid public key format" });
    }

    // Check cache first
    const cacheKey = owner;
    const cached = positionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.status(200).json(cached.data);
    }

    // Initialize Solana connection
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );

    // Fetch both Orca and Raydium positions in parallel
    const [orcaPositions, raydiumPositions] = await Promise.all([
      fetchOrcaPositionsReal({ 
        connection, 
        owner: ownerPubkey.toString() 
      }),
      fetchRaydiumPositions({ 
        connection, 
        owner: ownerPubkey.toString() 
      })
    ]);

    const response: PositionsResponse = {
      orcaPositions,
      raydiumPositions,
      timestamp: Date.now()
    };

    // Cache the response
    positionsCache.set(cacheKey, { data: response, timestamp: Date.now() });

    // Clean up old cache entries (older than 5 minutes)
    const now = Date.now();
    for (const [key, value] of positionsCache.entries()) {
      if (now - value.timestamp > 5 * 60 * 1000) {
        positionsCache.delete(key);
      }
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
