import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "../../../generated/prisma";

// Initialize Prisma client with error handling
let prisma: PrismaClient | null = null;

try {
  prisma = new PrismaClient();
} catch (error) {
  console.warn("Prisma client initialization failed:", error);
}

interface FlowCompletionData {
  tokenMint: string;
  creatorWallet: string;
  honestLaunch?: boolean;
  marketingKit?: boolean;
  liquidity?: boolean;
}

/**
 * API endpoint for tracking progressive flow completion
 * GET: Retrieve completion status
 * POST: Update completion status
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle case where database is not available
  if (!prisma) {
    console.warn("Database not available, returning default completion status");
    const defaultCompletion = {
      honestLaunch: false,
      marketingKit: false,
      liquidity: false,
    };

    if (req.method === "GET") {
      return res.status(200).json({ completion: defaultCompletion });
    } else if (req.method === "POST") {
      // For POST requests, just return the default completion
      return res.status(200).json({ completion: defaultCompletion });
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  }

  if (req.method === "GET") {
    const { tokenMint, creatorWallet } = req.query;

    if (!tokenMint || !creatorWallet) {
      return res.status(400).json({ error: "tokenMint and creatorWallet are required" });
    }

    try {
      const completion = await prisma.flowCompletion.findUnique({
        where: {
          tokenMint_creatorWallet: {
            tokenMint: tokenMint as string,
            creatorWallet: creatorWallet as string,
          },
        },
      });

      res.status(200).json({
        completion: completion || {
          honestLaunch: false,
          marketingKit: false,
          liquidity: false,
        },
      });
    } catch (error) {
      console.error("Error fetching flow completion:", error);
      res.status(500).json({ error: "Failed to fetch completion status" });
    }
  } else if (req.method === "POST") {
    const { tokenMint, creatorWallet, honestLaunch, marketingKit, liquidity } = req.body as FlowCompletionData;

    if (!tokenMint || !creatorWallet) {
      return res.status(400).json({ error: "tokenMint and creatorWallet are required" });
    }

    try {
      // Check if all steps are completed
      const allStepsCompleted = honestLaunch && marketingKit && liquidity;

      const completion = await prisma.flowCompletion.upsert({
        where: {
          tokenMint_creatorWallet: {
            tokenMint,
            creatorWallet,
          },
        },
        update: {
          honestLaunch: honestLaunch ?? false,
          marketingKit: marketingKit ?? false,
          liquidity: liquidity ?? false,
          completedAt: allStepsCompleted ? new Date() : null,
          updatedAt: new Date(),
        },
        create: {
          tokenMint,
          creatorWallet,
          honestLaunch: honestLaunch ?? false,
          marketingKit: marketingKit ?? false,
          liquidity: liquidity ?? false,
          completedAt: allStepsCompleted ? new Date() : null,
        },
      });

      res.status(200).json({ completion });
    } catch (error) {
      console.error("Error updating flow completion:", error);
      res.status(500).json({ error: "Failed to update completion status" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}
