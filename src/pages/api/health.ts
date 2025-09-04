import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../lib/db";
import { Connection } from "@solana/web3.js";

// Helper function to measure execution time and handle errors gracefully
async function time<T>(fn: () => Promise<T>) {
  const t0 = Date.now();
  try {
    const data = await fn();
    return { ok: true, ms: Date.now() - t0, data };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.message || String(e) };
  }
}

// Health check response type
type HealthResponse = {
  status: "ok" | "degraded";
  app: {
    name: string;
    env: string | undefined;
    ts: number;
    version: string;
  };
  checks: {
    db: { ok: boolean; ms: number; data?: any; error?: string };
    rpcPrimary: { ok: boolean; ms: number; data?: any; error?: string };
    rpcFallback: { ok: boolean; ms: number; data?: any; error?: string };
    dexscreener: { ok: boolean; ms: number; data?: any; error?: string };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ 
      status: "degraded", 
      app: { name: "", env: "", ts: 0, version: "" },
      checks: { db: { ok: false, ms: 0 }, rpcPrimary: { ok: false, ms: 0 }, rpcFallback: { ok: false, ms: 0 }, dexscreener: { ok: false, ms: 0 } }
    });
  }

  // Application metadata
  const app = {
    name: "sol-meme-gen",
    env: process.env.NODE_ENV,
    ts: Date.now(),
    version: process.env.APP_VERSION || "dev"
  };

  // Database health check - simple, cheap query
  const db = await time(async () => {
    await prisma.$queryRawUnsafe("SELECT 1");
    return true;
  });

  // Primary RPC health check
  const rpcPrimary = await time(async () => {
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    return await connection.getSlot("processed");
  });

  // Fallback RPC health check (using same endpoint if no fallback configured)
  const rpcFallback = await time(async () => {
    const rpcUrl = process.env.RPC_FALLBACK || process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    return await connection.getSlot("processed");
  });

  // DexScreener API health check - use a simple token query instead of /ping
  const dexscreener = await time(async () => {
    const response = await fetch("https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112", { 
      cache: "no-store",
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return true;
  });

  // Determine overall status
  // Status is "ok" only if all critical services (DB, primary RPC, DexScreener) are working
  // Fallback RPC failure doesn't affect status if primary is working
  const criticalServicesOk = db.ok && rpcPrimary.ok && dexscreener.ok;
  const status: "ok" | "degraded" = criticalServicesOk ? "ok" : "degraded";

  // Return comprehensive health status
  return res.status(200).json({
    status,
    app,
    checks: {
      db,
      rpcPrimary,
      rpcFallback,
      dexscreener
    }
  });
}
