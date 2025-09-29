import { NextApiRequest, NextApiResponse } from "next";
import { completeMigration, verifyNewSystemWorking, archiveProAccessData } from "../../../lib/migrateProAccess";

type MigrationResponse = {
  ok: boolean;
  message: string;
  data?: any;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MigrationResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ 
      ok: false, 
      message: "Method not allowed" 
    });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case "verify":
        const verification = await verifyNewSystemWorking();
        return res.status(200).json({
          ok: true,
          message: "System verification completed",
          data: verification
        });

      case "archive":
        const archival = await archiveProAccessData();
        return res.status(200).json({
          ok: true,
          message: "Data archival completed",
          data: archival
        });

      case "complete":
        const migration = await completeMigration();
        return res.status(200).json({
          ok: true,
          message: "Migration completed successfully",
          data: migration
        });

      default:
        return res.status(400).json({
          ok: false,
          message: "Invalid action. Use 'verify', 'archive', or 'complete'"
        });
    }

  } catch (error: any) {
    console.error("Migration error:", error);
    return res.status(500).json({
      ok: false,
      message: "Migration failed",
      error: error.message
    });
  }
}
