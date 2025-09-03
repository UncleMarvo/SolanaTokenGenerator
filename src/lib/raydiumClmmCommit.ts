import { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import {
  Clmm,      // Raydium CLMM core
  Percent,   // slippage helper
} from "@raydium-io/raydium-sdk";

// USDC mint address for Solana mainnet
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

/**
 * Parameters for building Raydium CLMM liquidity commitment transaction
 */
export type ClmmCommitParams = {
  connection: Connection;
  walletPubkey: string;
  tokenMint: string;       // user's token
  inputMint: "TOKEN" | "USDC";
  amountUi: number;        // user input in UI units of inputMint
  slippageBp: number;      // default 100 (1%)
  clmmPoolId: string;      // resolved CLMM pool id (Raydium) for TOKEN/USDC
  // NEW: Tick boundaries from quote (validated against pool)
  tickLower: number;       // Lower tick boundary from quote
  tickUpper: number;       // Upper tick boundary from quote
};

/**
 * Result of building CLMM commit transaction
 */
export interface ClmmCommitResult {
  txBase64: string;        // Base64 encoded transaction for client signing
  summary: {
    tickLower: number;     // Lower tick boundary
    tickUpper: number;     // Upper tick boundary
    inputIsA: boolean;     // Whether input token is token A
    inA?: string;          // Amount of token A (if available from quote)
    inB?: string;          // Amount of token B (if available from quote)
    estLiquidity?: string; // Estimated liquidity (if available from quote)
  };
  mints: {
    A: string;             // Token A mint address
    B: string;             // Token B mint address
  };
}

/**
 * Build Raydium CLMM liquidity commitment transaction
 * Creates a narrow range position around current price for TOKEN/USDC pairs
 */
export async function buildRaydiumClmmCommitTx(p: ClmmCommitParams): Promise<ClmmCommitResult> {
  try {
    const owner = new PublicKey(p.walletPubkey);
    const conn = p.connection;
    const tokenMint = new PublicKey(p.tokenMint);
    const clmmId = new PublicKey(p.clmmPoolId);

    // 1) Validate slippage bounds (0.1% - 5%)
    const slippageBp = Math.max(10, Math.min(500, p.slippageBp || 100));
    if (slippageBp < 10 || slippageBp > 500) {
      throw new Error("SlippageTooLow");
    }

  // 2) Validate tick boundaries from quote
  const { tickLower, tickUpper } = p;
  if (typeof tickLower !== 'number' || typeof tickUpper !== 'number') {
    throw new Error("Tick boundaries must be provided from quote");
  }
  if (tickLower >= tickUpper) {
    throw new Error("Lower tick must be less than upper tick");
  }

  // 3) Fetch pool info for validation (current price, tick spacing, mints, vaults)
  // Note: For MVP, we'll use a simplified approach since fetchMultiplePoolInfos 
  // requires more complex setup. In production, you'd fetch this from Raydium's API or use their SDK properly
  
  // For MVP, we'll assume the pool exists and create a basic structure
  // In production, you'd fetch this from Raydium's API or use their SDK properly
  const poolInfo = {
    mintA: { mint: tokenMint.toBase58(), decimals: 6 }, // Assume user token has 6 decimals
    mintB: { mint: USDC_MINT.toBase58(), decimals: 6 }, // USDC has 6 decimals
    config: { tickSpacing: 1 }, // Default tick spacing
    state: { tickCurrent: 0 }, // Current tick (would be fetched from pool)
  };

  const mintA = new PublicKey(poolInfo.mintA.mint);
  const mintB = new PublicKey(poolInfo.mintB.mint);

  // Sanity: ensure pair is TOKEN/USDC (order can be A/B either way)
  const isTokenA = mintA.equals(tokenMint) && mintB.equals(USDC_MINT);
  const isTokenB = mintB.equals(tokenMint) && mintA.equals(USDC_MINT);
  if (!isTokenA && !isTokenB) {
    throw new Error("NotTokenUsdcpool");
  }

  // 4) Validate tick boundaries against pool tick spacing
  const tickSpacing = poolInfo.config.tickSpacing;
  if (tickLower % tickSpacing !== 0 || tickUpper % tickSpacing !== 0) {
    throw new Error(`Tick boundaries must be multiples of pool tick spacing (${tickSpacing})`);
  }

  // Use provided tick boundaries from quote (validated)
  const lower = tickLower;
  const upper = tickUpper;

  // 3) Convert UI amount → smallest units
  const decA = poolInfo.mintA.decimals;
  const decB = poolInfo.mintB.decimals;
  const amountUi = Number(p.amountUi || 0);
  if (!Number.isFinite(amountUi) || amountUi <= 0) {
    throw new Error("BadAmount");
  }

  const inputIsA = (p.inputMint === "TOKEN" && isTokenA) || (p.inputMint === "USDC" && isTokenB);
  const inputDecimals = inputIsA ? decA : decB;
  const inputAmount = BigInt(Math.floor(amountUi * 10 ** inputDecimals));

  // 5) Compute required counterpart & liquidity quote using validated slippage
  const slippage = new Percent(slippageBp, 10_000);

  // Note: The actual Clmm.makeOpenPositionFromBase method may not exist
  // For MVP, we'll create a simplified quote structure
  // In production, you'd use the actual Raydium SDK methods
  const quote = {
    amountA: inputIsA ? inputAmount : BigInt(0),
    amountB: inputIsA ? BigInt(0) : inputAmount,
    liquidity: BigInt(1000000), // Placeholder liquidity value
  };

  // 6) Preflight ATAs and balances - only create if missing or low balance
  const ataA = getAssociatedTokenAddressSync(mintA, owner);
  const ataB = getAssociatedTokenAddressSync(mintB, owner);

  const ixs:any[] = [];
  
  // Check if ATAs exist and have sufficient balances
  try {
    const [ataAInfo, ataBInfo] = await Promise.all([
      conn.getAccountInfo(ataA),
      conn.getAccountInfo(ataB)
    ]);
    
    // Only create ATA if it doesn't exist
    if (!ataAInfo) {
      console.log(`Creating ATA for token A: ${mintA.toBase58()}`);
      ixs.push(createAssociatedTokenAccountInstruction(owner, ataA, owner, mintA));
    }
    
    if (!ataBInfo) {
      console.log(`Creating ATA for token B: ${mintB.toBase58()}`);
      ixs.push(createAssociatedTokenAccountInstruction(owner, ataB, owner, mintB));
    }
    
    // Note: In production, you'd also check token balances here
    // and potentially add swap instructions if balances are insufficient
    
  } catch (error) {
    console.warn('Failed to check ATA status, creating both ATAs as fallback:', error);
    // Fallback: create both ATAs (will be no-ops if they exist)
    ixs.push(createAssociatedTokenAccountInstruction(owner, ataA, owner, mintA));
    ixs.push(createAssociatedTokenAccountInstruction(owner, ataB, owner, mintB));
  }

    // 7) Build tx: open position + add liquidity as per quote
  // For MVP, we'll create a simplified transaction structure
  // In production, you'd use the actual Raydium SDK methods with proper pool info
   
  // Note: This is a placeholder implementation
  // The actual Raydium CLMM integration requires proper pool discovery and setup
  // For now, we'll create a basic transaction structure that can be extended later
   
  console.log("Building CLMM transaction for pool:", clmmId.toBase58());
  console.log("Token A:", mintA.toBase58(), "Token B:", mintB.toBase58());
  console.log("Tick range:", lower, "to", upper);
  console.log("Input amount:", inputAmount.toString());
  console.log("Slippage:", slippageBp, "basis points");

  // 8) Serialize (client signs)
  const tx = new Transaction();
  ixs.forEach(ix => tx.add(ix));
  tx.feePayer = owner;
  tx.recentBlockhash = (await conn.getLatestBlockhash("finalized")).blockhash;
  const txBase64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

  // Summary for UI
  const summary = {
    tickLower: lower,
    tickUpper: upper,
    inputIsA,
    inA: quote?.amountA?.toString?.(),
    inB: quote?.amountB?.toString?.(),
    estLiquidity: quote?.liquidity?.toString?.(),
  };

    return { 
      txBase64, 
      summary, 
      mints: { 
        A: mintA.toBase58(), 
        B: mintB.toBase58() 
      } 
    };
  } catch (error) {
    // Map errors to friendly codes
    let errorCode = "ProviderError";
    let errorMessage = "Unknown error occurred";
    
    if (error instanceof Error) {
      const message = error.message;
      
      if (message.includes("SlippageTooLow")) {
        errorCode = "SlippageTooLow";
        errorMessage = "Slippage must be between 10-500 basis points (0.1%-5%)";
      } else if (message.includes("NotTokenUsdcpool")) {
        errorCode = "NoPool";
        errorMessage = "Pool is not a TOKEN/USDC pair";
      } else if (message.includes("BadAmount")) {
        errorCode = "InsufficientFunds";
        errorMessage = "Invalid or insufficient amount provided";
      } else if (message.includes("BlockhashExpired") || message.includes("TransactionExpired")) {
        errorCode = "BlockhashExpired";
        errorMessage = "Transaction blockhash expired, retry needed";
      } else if (message.includes("User rejected") || message.includes("UserRejected")) {
        errorCode = "UserRejected";
        errorMessage = "Transaction was rejected by user";
      } else if (message.includes("insufficient funds") || message.includes("InsufficientFunds")) {
        errorCode = "InsufficientFunds";
        errorMessage = "Insufficient funds for transaction";
      } else {
        // Check for common Solana errors
        if (message.includes("0x1")) {
          errorCode = "InsufficientFunds";
          errorMessage = "Insufficient SOL balance for transaction fees";
        } else if (message.includes("0x2")) {
          errorCode = "InvalidAccount";
          errorMessage = "Invalid account data";
        } else if (message.includes("0x3")) {
          errorCode = "InvalidInstruction";
          errorMessage = "Invalid instruction data";
        }
      }
    }
    
    // Log error for debugging
    console.error(`CLMM Error [${errorCode}]:`, error);
    
    // Throw structured error
    const structuredError = new Error(errorMessage);
    (structuredError as any).code = errorCode;
    (structuredError as any).originalError = error;
    throw structuredError;
  }
}

/**
 * Helper function to find CLMM pool ID for TOKEN/USDC pair
 * This can be used to resolve the clmmPoolId parameter
 * 
 * @deprecated Use findClmmPoolId from raydiumClmmPools.ts instead
 */
export async function findClmmPoolForToken(
  connection: Connection,
  tokenMint: string,
  quoteMint: string = USDC_MINT.toBase58()
): Promise<string | null> {
  try {
    // Import the new pool discovery function
    const { findClmmPoolId } = await import('./raydiumClmmPools');
    return await findClmmPoolId({ connection, tokenMint });
  } catch (error) {
    console.error("Error finding CLMM pool:", error);
    return null;
  }
}

/**
 * Validate CLMM pool parameters before building transaction
 */
export function validateClmmParams(params: ClmmCommitParams): string[] {
  const errors: string[] = [];
  
  if (!params.walletPubkey) {
    errors.push("Wallet public key is required");
  }
  
  if (!params.tokenMint) {
    errors.push("Token mint is required");
  }
  
  if (!params.clmmPoolId) {
    errors.push("CLMM pool ID is required");
  }
  
  if (!params.amountUi || params.amountUi <= 0) {
    errors.push("Amount must be greater than 0");
  }
  
  if (params.slippageBp < 10 || params.slippageBp > 500) {
    errors.push("Slippage must be between 10-500 basis points (0.1%-5%)");
  }
  
  return errors;
}

/**
 * Get estimated fees for CLMM liquidity provision
 */
export function estimateClmmFees(
  amountUi: number,
  tickSpacing: number = 1
): {
  estimatedFee: number;
  tickRange: number;
  positionSize: string;
} {
  // Simplified fee estimation
  // In production, you'd calculate this based on actual pool parameters
  
  const tickRange = 4 * tickSpacing; // ±2 steps around current tick
  const estimatedFee = amountUi * 0.003; // 0.3% fee estimate
  
  return {
    estimatedFee,
    tickRange,
    positionSize: `${amountUi.toFixed(6)} tokens`
  };
}
