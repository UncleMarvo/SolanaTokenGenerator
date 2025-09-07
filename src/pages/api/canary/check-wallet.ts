import { NextApiRequest, NextApiResponse } from "next";
import { isAllowedWallet } from "../../../lib/canary";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { wallet } = req.body;
    
    if (!wallet) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    const allowed = isAllowedWallet(wallet);
    res.status(200).json({ allowed });
  } catch (error) {
    console.error("Error checking wallet canary status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
