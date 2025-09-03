import { NextApiRequest, NextApiResponse } from "next";
import { saveTx } from "../../../lib/lastCommitMeta";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { mint, txid, whirlpool, tickLower, tickUpper } = req.body;

    // Validate required fields
    if (!mint || !txid) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        message: "mint and txid are required" 
      });
    }

    // Save transaction metadata
    saveTx(mint, {
      txid,
      whirlpool,
      tickLower,
      tickUpper
    });

    console.log(`Saved transaction metadata for ${mint.slice(0, 8)}...:`, txid);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Error saving transaction metadata:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to save transaction metadata" 
    });
  }
}
