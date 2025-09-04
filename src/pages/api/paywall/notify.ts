import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/db";
import { Connection, PublicKey } from "@solana/web3.js";
import { getConnection } from "../../../lib/rpc";

// Payment configuration from environment variables
const USDC_MINT = new PublicKey(process.env.USDC_MINT!);
const FEE_WALLET = new PublicKey(process.env.FEE_WALLET!);
  const REQ_SOL = Number(process.env.PRO_FEE_SOL || 0);
  const REQ_USDC = Number(process.env.PRO_FEE_USDC || 0);

// Response type for the API
type PaywallResponse = {
  ok: boolean;
  pro?: boolean;
  error?: string;
  details?: {
    paidSOL: number;
    paidUSDC: number;
    need: {
      REQ_SOL: number;
      REQ_USDC: number;
    };
  };
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaywallResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "MethodNotAllowed" });
  }

  try {
    const { wallet, txSig } = req.body;
    
    // Validate required parameters
    if (!wallet || !txSig) {
      return res.status(400).json({ 
        ok: false, 
        error: "BadRequest",
        message: "Missing wallet or transaction signature"
      });
    }

    // Get Solana connection and fetch transaction details
    const conn = getConnection("primary");
    const tx = await conn.getParsedTransaction(txSig, { 
      maxSupportedTransactionVersion: 0, 
      commitment: "confirmed" 
    });
    
    if (!tx) {
      return res.status(404).json({ 
        ok: false, 
        error: "TxNotFound",
        message: "Transaction not found or not confirmed"
      });
    }

    // Verify the signer matches the provided wallet address
    const signerPubkey = tx.transaction.message.accountKeys[0].pubkey.toBase58();
    if (signerPubkey !== wallet) {
      return res.status(400).json({ 
        ok: false, 
        error: "WalletMismatch",
        message: "Transaction signer does not match provided wallet"
      });
    }

    // Parse SOL and USDC transfers to FEE_WALLET
    let paidSOL = 0;
    let paidUSDC = 0;
    
    // Get token balance changes for USDC tracking
    const preTokenBalances = tx.meta?.preTokenBalances || [];
    const postTokenBalances = tx.meta?.postTokenBalances || [];
    
    // 1) Calculate SOL payment (lamports to fee wallet)
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];
    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());
    const feeWalletIndex = accountKeys.indexOf(FEE_WALLET.toBase58());
    
    if (feeWalletIndex >= 0 && 
        preBalances[feeWalletIndex] != null && 
        postBalances[feeWalletIndex] != null) {
      // Convert lamports to SOL (1 SOL = 1e9 lamports)
      paidSOL = (postBalances[feeWalletIndex] - preBalances[feeWalletIndex]) / 1e9;
    }

    // 2) Calculate USDC SPL transfer to fee wallet
    function findTokenDelta(mint: string, owner: string) {
      const preBalance = preTokenBalances.find(b => b.mint === mint && b.owner === owner);
      const postBalance = postTokenBalances.find(b => b.mint === mint && b.owner === owner);
      
      if (!preBalance || !postBalance) return 0;
      
      const decimals = postBalance.uiTokenAmount.decimals || 6;
      const preAmount = Number(preBalance.uiTokenAmount.uiAmount || 0);
      const postAmount = Number(postBalance.uiTokenAmount.uiAmount || 0);
      const delta = postAmount - preAmount; // positive means received
      
      return delta;
    }
    
    paidUSDC = findTokenDelta(USDC_MINT.toBase58(), FEE_WALLET.toBase58());

    // Check if payment meets requirements (with small tolerance for rounding)
    const meetsSolRequirement = REQ_SOL > 0 && paidSOL >= REQ_SOL - 1e-9;
    const meetsUsdcRequirement = REQ_USDC > 0 && paidUSDC >= REQ_USDC - 1e-6;
    
    if (!meetsSolRequirement && !meetsUsdcRequirement) {
      return res.status(400).json({ 
        ok: false, 
        error: "Underpaid",
        details: { 
          paidSOL, 
          paidUSDC, 
          need: { REQ_SOL, REQ_USDC } 
        },
        message: "Payment amount does not meet Pro access requirements"
      });
    }

    // Grant Pro access by creating/updating database record
    await prisma.proAccess.upsert({
      where: { wallet },
      update: { 
        txSig, 
        expiresAt: null, // null = permanent access
        updatedAt: new Date()
      },
      create: { 
        wallet, 
        txSig, 
        expiresAt: null, // null = permanent access
        createdAt: new Date(),
        updatedAt: new Date()
      },
    });

    // Return success response
    return res.status(200).json({ 
      ok: true, 
      pro: true,
      message: "Pro access granted successfully"
    });

  } catch (error: any) {
    console.error("Paywall notification error:", error);
    
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError",
      message: error?.message || "Internal server error occurred"
    });
  }
}
