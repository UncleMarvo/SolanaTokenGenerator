import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { requireAdmin } from "../../../lib/adminAuth";

const DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "last-commit.json");

/**
 * Server-side persistence for transaction metadata
 * This endpoint is for internal use only
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Admin authentication check using new requireAdmin function
  const auth = requireAdmin(req as any);
  if (!auth.ok) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { action, data } = req.body;

    if (action === "save") {
      // Save data to disk
      if (!fs.existsSync(DIR)) {
        fs.mkdirSync(DIR, { recursive: true });
      }

      // Atomic write: write to temp file then rename
      const tmp = FILE + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(data, null, 0), "utf8");
      fs.renameSync(tmp, FILE);

      console.log(`Persisted ${Object.keys(data).length} transaction records to disk`);
      return res.status(200).json({ success: true, count: Object.keys(data).length });

    } else if (action === "load") {
      // Load data from disk
      if (!fs.existsSync(FILE)) {
        return res.status(200).json({ data: {} });
      }

      const raw = fs.readFileSync(FILE, "utf8");
      const data = JSON.parse(raw || "{}");
      
      console.log(`Loaded ${Object.keys(data).length} transaction records from disk`);
      return res.status(200).json({ data });

    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

  } catch (error) {
    console.error("Persistence error:", error);
    return res.status(500).json({ 
      error: "Internal server error", 
      message: "Failed to persist data" 
    });
  }
}
