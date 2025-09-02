import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { getTokenBalanceUi } from "../../lib/balances";
import { isWSOL } from "../../lib/wsol";

interface PreflightRequest {
  walletPubkey: string;
  action: "increase" | "decrease" | "collect";
  tokenA: string;
  tokenB: string;
  amountUi?: number; // For increase
  inputMint?: "A" | "B"; // For increase
  percent?: number; // For decrease
}

interface PreflightResponse {
  balances: {
    A: number;
    B: number;
  };
  need: {
    A: number;
    B: number;
  };
  warnings: string[];
  canProceed: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreflightResponse | { error: string; message: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed", message: "Method not allowed" });
  }

  try {
    const body: PreflightRequest = req.body;
    
    // Validate required fields
    if (!body.walletPubkey || !body.action || !body.tokenA || !body.tokenB) {
      return res.status(400).json({ 
        error: "Missing required fields", 
        message: "Missing required fields" 
      });
    }

    // Build Connection (mainnet RPC)
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );

    const owner = new PublicKey(body.walletPubkey);
    const mintA = new PublicKey(body.tokenA);
    const mintB = new PublicKey(body.tokenB);

    // Get mint decimals
    const [mintAInfo, mintBInfo] = await Promise.all([
      connection.getParsedAccountInfo(mintA),
      connection.getParsedAccountInfo(mintB)
    ]);
    
    const decA = (mintAInfo.value?.data as any)?.parsed?.info?.decimals || 9;
    const decB = (mintBInfo.value?.data as any)?.parsed?.info?.decimals || 9;

    // Get current balances
    const [balanceA, balanceB] = await Promise.all([
      getTokenBalanceUi(connection, owner, mintA, decA),
      getTokenBalanceUi(connection, owner, mintB, decB)
    ]);

    const balances = { A: balanceA, B: balanceB };
    const warnings: string[] = [];
    let need = { A: 0, B: 0 };
    let canProceed = true;

    // Calculate required amounts based on action
    if (body.action === "increase") {
      if (!body.amountUi || !body.inputMint) {
        return res.status(400).json({ 
          error: "Invalid request", 
          message: "amountUi and inputMint required for increase" 
        });
      }

      if (body.inputMint === "A") {
        need.A = body.amountUi;
        need.B = 0;
      } else {
        need.A = 0;
        need.B = body.amountUi;
      }

      // Check if user has sufficient balance
      if (body.inputMint === "A" && balanceA < body.amountUi) {
        canProceed = false;
      } else if (body.inputMint === "B" && balanceB < body.amountUi) {
        canProceed = false;
      }

      // WSOL warnings
      if (isWSOL(body.tokenA) && body.inputMint === "A") {
        warnings.push("WSOL will be wrapped from SOL");
      } else if (isWSOL(body.tokenB) && body.inputMint === "B") {
        warnings.push("WSOL will be wrapped from SOL");
      }

    } else if (body.action === "decrease") {
      if (body.percent === undefined) {
        return res.status(400).json({ 
          error: "Invalid request", 
          message: "percent required for decrease" 
        });
      }

      // For decrease, we mainly need SOL for fees
      need.A = 0;
      need.B = 0;

      // WSOL unwrap warnings for 100% decrease
      if (body.percent >= 100) {
        if (isWSOL(body.tokenA)) {
          warnings.push("WSOL will be unwrapped to SOL after 100% decrease");
        }
        if (isWSOL(body.tokenB)) {
          warnings.push("WSOL will be unwrapped to SOL after 100% decrease");
        }
      }

    } else if (body.action === "collect") {
      // For collect, we mainly need SOL for fees
      need.A = 0;
      need.B = 0;
      warnings.push("Collecting fees and rewards");
    }

    // Add general warnings
    if (balanceA === 0 && balanceB === 0) {
      warnings.push("No token balances found");
    }

    return res.status(200).json({
      balances,
      need,
      warnings,
      canProceed
    });

  } catch (error) {
    console.error("Error in preflight check:", error);
    return res.status(500).json({ 
      error: "Preflight failed", 
      message: "Failed to perform preflight check" 
    });
  }
}
