import { NextApiRequest, NextApiResponse } from "next";
import { fetchTokenStats, TokenStats } from "../../../lib/analytics";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenStats | { error: string }>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { mint } = req.query;

  if (!mint || typeof mint !== "string") {
    return res.status(400).json({ error: "Mint parameter is required" });
  }

  try {
    const stats = await fetchTokenStats(mint);
    res.status(200).json(stats);
  } catch (error) {
    console.error("Error fetching token stats:", error);
    // Return empty stats object instead of error to prevent page crashes
    res.status(200).json({});
  }
}
