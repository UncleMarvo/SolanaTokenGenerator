import { NextApiRequest, NextApiResponse } from "next";
import { getCanaryStatus } from "../../../lib/canary";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const status = getCanaryStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error("Error getting canary status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
