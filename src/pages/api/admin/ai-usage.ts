import { NextApiRequest, NextApiResponse } from "next";

// Simple in-memory store for AI usage stats
// In production, this should be replaced with a proper database
let aiUsageStats: { day: string; count: number; max: number } | null = null;

// Update stats (called from kit.zip.ts)
export function updateAiUsageStats(stats: { day: string; count: number }, max: number) {
  aiUsageStats = { ...stats, max };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Basic protection - check for admin secret if configured
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const providedSecret = req.headers.authorization?.replace('Bearer ', '');
    if (providedSecret !== adminSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    // Return current AI usage statistics
    const max = Number(process.env.MEME_AI_DAILY_MAX || "0");
    
    if (!aiUsageStats) {
      // If no stats available, return current day with 0 count
      const today = new Date().toISOString().slice(0, 10);
      return res.json({ day: today, count: 0, max });
    }

    return res.json(aiUsageStats);
  } catch (error) {
    console.error("Error fetching AI usage stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
