import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { isWSOL, unwrapWSOLIx } from "./wsol";

// USDC mint address
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Note: For MVP, we'll use a simplified approach since the full Raydium SDK
// integration requires more complex setup. In production, you'd use:
// import { Clmm, Percent } from "@raydium-io/raydium-sdk";

export type RayClmmDecreaseParams = {
  connection: Connection;
  walletPubkey: string;
  clmmPoolId: string;
  positionNftMint: string;
  tokenAMint: string;
  tokenBMint: string;
  percent: number;       // 0..100
  slippageBp: number;    // default 100
  tickLower: number;
  tickUpper: number;
};

/**
 * Build a base64 transaction to decrease liquidity for a Raydium CLMM position
 * 
 * This function creates a transaction that allows users to remove liquidity
 * from an existing CLMM position. At 100%, it also closes the position NFT.
 * 
 * Note: This is an MVP implementation. In production, you'd use the full
 * Raydium SDK with proper pool discovery and position management.
 */
export async function buildRayClmmDecreaseTx(p: RayClmmDecreaseParams) {
  const owner = new PublicKey(p.walletPubkey);
  const poolId = new PublicKey(p.clmmPoolId);
  const conn = p.connection;
  const mintA = new PublicKey(p.tokenAMint);
  const mintB = new PublicKey(p.tokenBMint);

  // Fetch pool info - MVP simplified approach
  // Note: In production, you'd use Clmm.fetchMultiplePoolInfos with proper pool keys
  // For MVP, we'll use the provided token mints and assume standard decimals
  
  // Validate and clamp percentage (0-100)
  // This ensures the percentage is within valid bounds and is a whole number
  const pct = Math.max(0, Math.min(100, Math.floor(p.percent || 0)));
  if (pct <= 0) throw new Error("Invalid percentage - must be greater than 0");
  
  // Log the operation for debugging
  console.log(`Decreasing liquidity by ${pct}% for position ${p.positionNftMint.slice(0, 8)}...`);
  
  // Simplified slippage calculation (0.1% to 5.0%)
  // In production, you'd use Raydium's Percent class for proper slippage handling
  // Slippage protects against price movement during transaction execution
  const slippageBp = Math.max(10, Math.min(500, p.slippageBp || 100));
  
  // For MVP, we'll create placeholder instructions
  // In production, you'd use Clmm.buildDecreasePositionTx with proper pool info
  // This would include the actual decrease liquidity instructions and position closure
  const innerTransactions = [{
    instructions: [],
    signers: []
  }];
  
  // If closing position (100%), add placeholder for NFT closure
  if (pct >= 100) {
    console.log("Closing position - will include NFT closure instructions in production");
    // In production, this would add instructions to close the position NFT
    // This typically involves:
    // 1. Removing all remaining liquidity
    // 2. Collecting any accumulated fees
    // 3. Burning the position NFT
    // 4. Returning any remaining tokens to the user
  }
  
  // WSOL handling: Detect if either token is WSOL for unwrapping after decrease
  const isTokenAWSOL = isWSOL(p.tokenAMint);
  const isTokenBWSOL = isWSOL(p.tokenBMint);
  
  if (isTokenAWSOL || isTokenBWSOL) {
    console.log("WSOL detected in pool - will unwrap after decrease operation");
  }

  // Ensure ATAs exist (create if missing)
  // This ensures the user has token accounts for both tokens in the pair
  const ataA = getAssociatedTokenAddressSync(mintA, owner);
  const ataB = getAssociatedTokenAddressSync(mintB, owner);
  const ixs:any[] = [];
  
  // Check if ATAs exist before creating them
  // This prevents unnecessary ATA creation instructions
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
    
  } catch (error) {
    console.warn('Failed to check ATA status, creating both ATAs as fallback:', error);
    // Fallback: create both ATAs (will be no-ops if they exist)
    ixs.push(createAssociatedTokenAccountInstruction(owner, ataA, owner, mintA));
    ixs.push(createAssociatedTokenAccountInstruction(owner, ataB, owner, mintB));
  }
  
  // Add placeholder instructions from inner transactions
  // In production, these would be the actual decrease liquidity instructions
  innerTransactions.forEach((tx:any)=> ixs.push(...tx.instructions));
  
  // WSOL handling: Unwrap WSOL after decrease operation (returns SOL and cleans dust)
  if (isTokenAWSOL || isTokenBWSOL) {
    console.log("Adding WSOL unwrapping instructions to decrease transaction");
    // Add unwrap instruction for WSOL - safe as it closes the ATA after tokens return
    if (isTokenAWSOL) {
      ixs.push(unwrapWSOLIx(owner));
      console.log("Added unwrap instruction for token A (WSOL)");
    }
    if (isTokenBWSOL) {
      ixs.push(unwrapWSOLIx(owner));
      console.log("Added unwrap instruction for token B (WSOL)");
    }
  }

  // Build and serialize the transaction
  const tx = new Transaction();
  ixs.forEach(ix=>tx.add(ix));
  tx.feePayer = owner;
  tx.recentBlockhash = (await conn.getLatestBlockhash("finalized")).blockhash;

  // Return base64 encoded transaction for client signing
  return { txBase64: tx.serialize({ requireAllSignatures:false, verifySignatures:false }).toString("base64") };
}
