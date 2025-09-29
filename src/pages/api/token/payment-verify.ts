import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../lib/db";
import { Connection, PublicKey } from "@solana/web3.js";
import { getConnection } from "../../../lib/rpc";
import { retryWithBackoff } from "../../../lib/confirmRetry";
import { TOKEN_CREATION_TYPES, getPriceInLamports, requiresPayment } from "../../../lib/tokenPricing";

// Payment configuration from environment variables
const FEE_WALLET = new PublicKey(process.env.FEE_WALLET!);

// Response type for the API
type TokenPaymentResponse = {
  ok: boolean;
  verified?: boolean;
  tokenType?: string;
  paidAmount?: number;
  requiredAmount?: number;
  error?: string;
  message?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenPaymentResponse>
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "MethodNotAllowed" });
  }

  try {
    const { wallet, txSig, tokenType } = req.body;
    
    // Validate required parameters
    if (!wallet || !txSig || !tokenType) {
      return res.status(400).json({ 
        ok: false, 
        error: "BadRequest",
        message: "Missing wallet, transaction signature, or token type"
      });
    }

    // Validate token type
    if (!(tokenType in TOKEN_CREATION_TYPES)) {
      return res.status(400).json({ 
        ok: false, 
        error: "InvalidTokenType",
        message: `Invalid token type: ${tokenType}. Must be 'free' or 'pro'`
      });
    }

    // Get Solana connection and fetch transaction details
    const conn = getConnection("primary");
    const tx = await retryWithBackoff(() => conn.getParsedTransaction(txSig, { 
      maxSupportedTransactionVersion: 0, 
      commitment: "confirmed" 
    }));
    
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

    // For free tokens, no payment verification needed
    if (tokenType === 'free') {
      return res.status(200).json({ 
        ok: true, 
        verified: true,
        tokenType: 'free',
        paidAmount: 0,
        requiredAmount: 0,
        message: "Free token creation verified"
      });
    }

    // For Pro tokens, verify payment amount
    const requiredAmount = TOKEN_CREATION_TYPES[tokenType].price;
    const requiredLamports = getPriceInLamports(tokenType);
    
    // Calculate SOL payment (lamports to fee wallet)
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];
    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());
    const feeWalletIndex = accountKeys.indexOf(FEE_WALLET.toBase58());
    
    let paidAmount = 0;
    if (feeWalletIndex >= 0 && 
        preBalances[feeWalletIndex] != null && 
        postBalances[feeWalletIndex] != null) {
      // Convert lamports to SOL (1 SOL = 1e9 lamports)
      const paidLamports = postBalances[feeWalletIndex] - preBalances[feeWalletIndex];
      paidAmount = paidLamports / 1e9;
    }

    // Check if payment meets requirements (with small tolerance for rounding)
    const meetsRequirement = paidAmount >= requiredAmount - 1e-9;
    
    if (!meetsRequirement) {
      return res.status(400).json({ 
        ok: false, 
        error: "Underpaid",
        message: `Payment amount (${paidAmount} SOL) does not meet Pro token requirement (${requiredAmount} SOL)`,
        paidAmount,
        requiredAmount
      });
    }

    // Log the token creation payment for tracking
    try {
      await prisma.txEvent.create({
        data: {
          txSig,
          wallet,
          mint: "TOKEN_CREATION_PAYMENT", // Special identifier for token creation payments
          action: `create_${tokenType}_token`,
          flatSol: paidAmount,
          success: true
        }
      });
    } catch (dbError) {
      console.error("Failed to log token creation payment:", dbError);
      // Don't fail the verification if logging fails
    }

    // Return success response
    return res.status(200).json({ 
      ok: true, 
      verified: true,
      tokenType,
      paidAmount,
      requiredAmount,
      message: "Token creation payment verified successfully"
    });

  } catch (error: any) {
    console.error("Token payment verification error:", error);
    
    return res.status(500).json({ 
      ok: false, 
      error: "ServerError",
      message: error?.message || "Internal server error occurred"
    });
  }
}
