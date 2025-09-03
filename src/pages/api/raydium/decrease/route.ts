import { NextApiRequest, NextApiResponse } from "next";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { buildRayClmmDecreaseTx } from "../../../../lib/raydiumClmmActions_decrease";

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
      tokenBMint,
      percent,
      slippageBp,
      tickLower,
      tickUpper
    } = req.body;

    // Validate required fields
    if (!walletPubkey || !clmmPoolId || !positionNftMint || !tokenAMint || !tokenBMint || !percent || !tickLower || !tickUpper) {
      return res.status(400).json({
        error: "MissingRequiredFields",
        message: "Missing required fields: walletPubkey, clmmPoolId, positionNftMint, tokenAMint, tokenBMint, percent, tickLower, tickUpper"
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

    // Validate percentage
    if (typeof percent !== "number" || percent <= 0 || percent > 100 || !Number.isFinite(percent)) {
      return res.status(400).json({
        error: "InvalidPercentage",
        message: "Percentage must be a positive number between 0 and 100"
      });
    }

    // Validate slippage (optional, default to 100)
    if (slippageBp !== undefined && (typeof slippageBp !== "number" || slippageBp < 10 || slippageBp > 500)) {
      return res.status(400).json({
        error: "InvalidSlippage",
        message: "Slippage must be between 10 and 500 basis points (0.1% to 5.0%)"
      });
    }

    // Validate tick values
    if (typeof tickLower !== "number" || typeof tickUpper !== "number" || 
        !Number.isInteger(tickLower) || !Number.isInteger(tickUpper) ||
        tickLower >= tickUpper) {
      return res.status(400).json({
        error: "InvalidTicks",
        message: "Tick values must be integers with lower < upper"
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

    // Build the decrease transaction
    const result = await buildRayClmmDecreaseTx({
      connection,
      walletPubkey,
      clmmPoolId,
      positionNftMint,
      tokenAMint,
      tokenBMint,
      percent,
      slippageBp: slippageBp || 100,
      tickLower,
      tickUpper
    });

    // Return the base64 encoded transaction
    return res.status(200).json({
      txBase64: result.txBase64
    });

  } catch (error) {
    console.error("Error building Raydium CLMM decrease transaction:", error);
    
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
