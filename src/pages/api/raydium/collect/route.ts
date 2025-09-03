import { NextApiRequest, NextApiResponse } from "next";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { buildRayClmmCollectTx } from "../../../../lib/raydiumClmmActions_collect";

// USDC mint address for validation
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// WSOL mint address to reject (not supported in MVP)
const WSOL_MINT = "So11111111111111111111111111111111111111112";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ 
      error: "MethodNotAllowed", 
      message: "Only POST method is allowed" 
    });
  }

  try {
    // Parse and validate request body
    const {
      walletPubkey,
      clmmPoolId,
      positionNftMint,
      tokenAMint,
      tokenBMint
    } = req.body;

    // Validate required fields
    if (!walletPubkey || !clmmPoolId || !positionNftMint || !tokenAMint || !tokenBMint) {
      return res.status(400).json({
        error: "MissingRequiredFields",
        message: "Missing required fields: walletPubkey, clmmPoolId, positionNftMint, tokenAMint, tokenBMint"
      });
    }

    // Validate wallet address format
    if (typeof walletPubkey !== "string" || walletPubkey.length < 32) {
      return res.status(400).json({
        error: "InvalidWalletAddress",
        message: "Invalid wallet address format"
      });
    }

    // Validate pool ID format
    if (typeof clmmPoolId !== "string" || clmmPoolId.length < 32) {
      return res.status(400).json({
        error: "InvalidPoolId",
        message: "Invalid CLMM pool ID format"
      });
    }

    // Validate position NFT mint format
    if (typeof positionNftMint !== "string" || positionNftMint.length < 32) {
      return res.status(400).json({
        error: "InvalidPositionNft",
        message: "Invalid position NFT mint format"
      });
    }

    // Validate token mints format
    if (typeof tokenAMint !== "string" || typeof tokenBMint !== "string" || 
        tokenAMint.length < 32 || tokenBMint.length < 32) {
      return res.status(400).json({
        error: "InvalidTokenMints",
        message: "Invalid token mint format"
      });
    }

    // Guard against WSOL (not supported in MVP)
    if (tokenAMint === WSOL_MINT || tokenBMint === WSOL_MINT) {
      return res.status(400).json({
        error: "WSOLNotSupported",
        message: "WSOL pairs are not supported in MVP. Only USDC pairs are allowed."
      });
    }

    // Ensure one of the tokens is USDC
    if (tokenAMint !== USDC_MINT && tokenBMint !== USDC_MINT) {
      return res.status(400).json({
        error: "USDCRequired",
        message: "One of the tokens must be USDC. Only USDC pairs are supported in MVP."
      });
    }

    // Create Solana connection (mainnet)
    const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

    // Build the collect fees transaction
    const result = await buildRayClmmCollectTx({
      connection,
      walletPubkey,
      clmmPoolId,
      positionNftMint,
      tokenAMint,
      tokenBMint
    });

    // Return the base64 encoded transaction
    return res.status(200).json({
      txBase64: result.txBase64
    });

  } catch (error) {
    console.error("Error building Raydium CLMM collect fees transaction:", error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      return res.status(400).json({
        error: "TransactionBuildError",
        message: error.message
      });
    }
    
    return res.status(500).json({
      error: "InternalServerError",
      message: "Failed to build transaction"
    });
  }
}
