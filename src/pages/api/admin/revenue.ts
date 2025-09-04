import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/db";
import { authenticateAdmin } from "../../../lib/adminAuth";

function auth(req: NextApiRequest) {
  const authResult = authenticateAdmin(req.headers.authorization);
  return authResult.isAdmin;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!auth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Last 7 days by default
    const days = Number(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    // Fetch relevant events
    const events = await prisma.txEvent.findMany({
      where: { ts: { gte: since }, action: { in: ["skim", "commit"] } },
      orderBy: { ts: "desc" },
      take: 1000,
    });

    // Aggregate
    let flatSol = 0;
    const skimTotals: Record<string, { skimA: bigint; skimB: bigint; count: number }> = {};
    
    for (const e of events) {
      if (e.action === "commit") {
        // If you logged flat fee in commit summary, parse here (optional)
        // flatSol += Number(e.amountA || 0); // adjust if you stored it
      }
      if (e.action === "skim") {
        const mint = e.mint || "unknown";
        const t = (skimTotals[mint] ||= { skimA: 0n, skimB: 0n, count: 0 });
        t.skimA += BigInt(e.amountA || "0");
        t.skimB += BigInt(e.amountB || "0");
        t.count++;
      }
    }

    const skimArray = Object.entries(skimTotals).map(([mint, v]) => ({
      mint,
      skimA: v.skimA.toString(),
      skimB: v.skimB.toString(),
      launches: v.count,
    }));

    return res.status(200).json({
      since: since.toISOString(),
      flatSol,
      skims: skimArray,
      recent: events.slice(0, 100), // latest 100 for table
    });

  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
