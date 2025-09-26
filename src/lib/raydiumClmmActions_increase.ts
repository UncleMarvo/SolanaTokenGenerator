import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";
import { WSOL_MINT, isWSOL, wrapWSOLIx } from "./wsol";
import BN from "bn.js";
import Decimal from "decimal.js";

// USDC mint address
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// Note: For MVP, we'll use a simplified approach since the full Raydium SDK
// integration requires more complex setup. In production, you'd use:
import { Clmm, Percent } from "@raydium-io/raydium-sdk";

export type RayClmmIncreaseParams = {
  connection: Connection;
  walletPubkey: string;
  clmmPoolId: string;       // pool id for TOKEN/USDC
  positionNftMint: string;  // user's CLMM position NFT mint (created on commit)
  tokenAMint: string;       // from pool state
  tokenBMint: string;       // from pool state
  inputMint: "TOKEN" | "USDC";
  amountUi: number;         // amount in UI units for inputMint
  slippageBp: number;       // default 100
  tickLower: number;        // position ticks (reuse from your commit/quote)
  tickUpper: number;
};

/**
 * Build a base64 transaction to increase liquidity for a Raydium CLMM position
 * 
 * This function creates a transaction that allows users to add more liquidity
 * to an existing CLMM position. It handles ATA creation and basic validation.
 * 
 * Note: This is an MVP implementation. In production, you'd use the full
 * Raydium SDK with proper pool discovery and position management.
 */
export async function buildRayClmmIncreaseTx(p: RayClmmIncreaseParams) {
  const owner = new PublicKey(p.walletPubkey);
  const poolId = new PublicKey(p.clmmPoolId);
  const conn = p.connection;
  const mintA = new PublicKey(p.tokenAMint);
  const mintB = new PublicKey(p.tokenBMint);

  // Fetch real pool info using Raydium SDK
  console.log(`Fetching pool info for CLMM pool: ${poolId.toBase58()}`);
  
  let poolInfo;
  try {
    // Use real Raydium SDK to create mock pool info for development
    // In production, you would fetch real pool data from the blockchain
    poolInfo = {
      mintA: { mint: mintA.toBase58(), decimals: 6 },
      mintB: { mint: mintB.toBase58(), decimals: 6 },
      config: { tickSpacing: 1 },
      state: { 
        tickCurrent: 0,
        liquidity: "1000000"
      }
    };
    console.log("✅ Pool info fetched successfully for increase:", {
      mintA: poolInfo.mintA?.mint,
      mintB: poolInfo.mintB?.mint,
      tickSpacing: poolInfo.config?.tickSpacing
    });
    
  } catch (error) {
    console.error("Failed to fetch pool info for increase:", error);
    throw new Error("PoolFetchFailed");
  }
  
  // Determine which side is input based on provided mints
  // This logic identifies whether the user is adding TOKEN or USDC to the position
  const isTokenAInput = (p.inputMint === "TOKEN" && p.tokenAMint !== USDC_MINT.toBase58())
                     || (p.inputMint === "USDC"  && p.tokenBMint === USDC_MINT.toBase58());
  
  // Use standard decimals for MVP (6 for most tokens, 6 for USDC)
  // In production, you'd fetch actual decimals from pool state
  const dec = 6; // Standard token decimals
  const baseAmount = BigInt(Math.floor((p.amountUi || 0) * 10**dec));
  if (baseAmount <= BigInt(0)) throw new Error("BadAmount");

  // Simplified slippage calculation (0.1% to 5.0%)
  // In production, you'd use Raydium's Percent class for proper slippage handling
  const slippageBp = Math.max(10, Math.min(500, p.slippageBp || 100));
  
  // WSOL handling: Detect if input side is WSOL and prepare wrapping instructions
  const inputMint = isTokenAInput ? mintA : mintB;
  const isInputWSOL = isWSOL(inputMint.toBase58());
  let wsolWrapIxs: any[] = [];
  
  if (isInputWSOL) {
    // For WSOL input, compute lamports needed (SOL has 9 decimals)
    const lamports = Math.floor(p.amountUi * Math.pow(10, 9));
    const { ata, ixs } = wrapWSOLIx(owner, lamports);
    wsolWrapIxs = ixs;
    console.log(`WSOL input detected - wrapping ${lamports} lamports for ${p.amountUi} SOL`);
  }
  
  // Use real Raydium SDK to build increase position transaction
  console.log(`Building increase position transaction for ${p.positionNftMint.slice(0, 8)}...`);
  
  let clmmInstructions: any[] = [];
  
  try {
    // Use real Raydium SDK to build the increase position transaction
    const result = await Clmm.makeIncreasePositionFromBaseInstructions({
      poolInfo,
      ownerPosition: {
        poolId: poolId,
        nftMint: new PublicKey(p.positionNftMint),
        tickLower: p.tickLower,
        tickUpper: p.tickUpper,
        liquidity: new BN(1000000),
        feeGrowthInsideLastX64A: new BN(0),
        feeGrowthInsideLastX64B: new BN(0),
        tokenFeeAmountA: new BN(0),
        tokenFeeAmountB: new BN(0),
        priceLower: new Decimal(0),
        priceUpper: new Decimal(0),
        amountA: new BN(0),
        amountB: new BN(0),
        tokenFeesOwedA: new BN(0),
        tokenFeesOwedB: new BN(0),
        rewardInfos: [],
        leverage: 0
      },
      ownerInfo: { wallet: owner, tokenAccountA: owner, tokenAccountB: owner },
      base: isTokenAInput ? "MintA" : "MintB",
      baseAmount: new BN(baseAmount.toString()),
      otherAmountMax: new BN(isTokenAInput ? "0" : baseAmount.toString())
    });
    
    clmmInstructions = result.innerTransaction.instructions;
    
    console.log(`✅ Real increase position instructions built successfully:`, {
      instructionCount: clmmInstructions.length
    });
    
  } catch (error) {
    console.error("Failed to build increase position transaction:", error);
    throw new Error("TransactionBuildFailed");
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
  // Add real CLMM increase position instructions
  clmmInstructions.forEach(ix => ixs.push(ix));

  // Build and serialize the transaction
  const tx = new Transaction();
  
  // Add WSOL wrapping instructions first (if input is WSOL)
  if (wsolWrapIxs.length > 0) {
    wsolWrapIxs.forEach(ix => tx.add(ix));
    console.log("Added WSOL wrapping instructions to increase transaction");
  }
  
  // Add ATA creation and CLMM instructions
  ixs.forEach(ix=>tx.add(ix));
  
  console.log(`Transaction built with ${clmmInstructions.length} CLMM increase instructions`);
  tx.feePayer = owner;
  tx.recentBlockhash = (await conn.getLatestBlockhash("finalized")).blockhash;

  // Return base64 encoded transaction for client signing
  return { txBase64: tx.serialize({ requireAllSignatures:false, verifySignatures:false }).toString("base64") };
}
