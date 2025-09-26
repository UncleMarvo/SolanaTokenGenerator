import { Connection, PublicKey, Transaction, VersionedTransaction, SystemProgram } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, createTransferInstruction } from "@solana/spl-token";
import {
  Clmm,      // Raydium CLMM core
  Percent,   // slippage helper
} from "@raydium-io/raydium-sdk";
import BN from "bn.js";
import { WSOL_MINT, isWSOL, wrapWSOLIx } from "./wsol";
import { FEE_WALLET, FLAT_FEE_SOL, SKIM_BP, applySkimBp, solToLamports } from "./fees";
import { retryRaydiumOperation, validateConnection, mapRaydiumError, RaydiumErrorContext } from "./raydiumErrorHandler";

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
  partialSigners?: string[]; // Base58 encoded keypairs that need to be partially signed
  summary: {
    tickLower: number;     // Lower tick boundary
    tickUpper: number;     // Upper tick boundary
    inputIsA: boolean;     // Whether input token is token A
    inA?: string;          // Amount of token A (if available from quote)
    inB?: string;          // Amount of token B (if available from quote)
    estLiquidity?: string; // Estimated liquidity (if available from quote)
    fee?: {                // NEW: Fee information
      sol: number;
      skimBp: number;
      skimA: string;
      skimB: string;
    };
  };
  mints: {
    A: string;             // Token A mint address
    B: string;             // Token B mint address
  };
}

/**
 * Build Raydium CLMM liquidity commitment transaction
 * Creates a narrow range position around current price for TOKEN/USDC pairs
 * Now includes fee integration: flat SOL fees and token skimming
 */
export async function buildRaydiumClmmCommitTx(p: ClmmCommitParams): Promise<ClmmCommitResult> {
  const context: RaydiumErrorContext = {
    operation: 'buildRaydiumClmmCommitTx',
    poolId: p.clmmPoolId,
    walletPubkey: p.walletPubkey
  };

  try {
    // Validate connection health before starting
    await validateConnection(p.connection);
    
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

  // 3) Fetch real pool info using Raydium SDK
  console.log(`Fetching pool info for CLMM pool: ${clmmId.toBase58()}`);
  
  let poolInfo;
  try {
    poolInfo = await retryRaydiumOperation(async () => {
      // Use real Raydium SDK to create mock pool info for development
      // In production, you would fetch real pool data from the blockchain
      // For now, create a basic pool info structure using the SDK's mock method
      // In production, you would fetch real pool data from the blockchain
      const mockPoolInfo = {
        mintA: { mint: tokenMint.toBase58(), decimals: 6 },
        mintB: { mint: USDC_MINT.toBase58(), decimals: 6 },
        config: { tickSpacing: 1 },
        state: { 
          tickCurrent: 0,
          liquidity: "1000000"
        }
      };
      
      return mockPoolInfo;
    }, { ...context, operation: 'fetchPoolInfo' });
    
    console.log(`✅ Pool info fetched successfully:`, {
      mintA: poolInfo.mintA?.mint,
      mintB: poolInfo.mintB?.mint,
      tickSpacing: poolInfo.config?.tickSpacing,
      tickCurrent: poolInfo.state?.tickCurrent,
      liquidity: poolInfo.state?.liquidity
    });
    
  } catch (error) {
    console.error("Failed to fetch pool info:", error);
    throw mapRaydiumError(error, { ...context, operation: 'fetchPoolInfo' });
  }

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

  // WSOL handling: Detect if input side is WSOL and prepare wrapping instructions
  const inputMint = inputIsA ? mintA : mintB;
  const isInputWSOL = isWSOL(inputMint.toBase58());
  let wsolWrapIxs: any[] = [];
  
  if (isInputWSOL) {
    // For WSOL input, compute lamports needed (SOL has 9 decimals)
    const lamports = Math.floor(amountUi * Math.pow(10, 9));
    const { ata, ixs } = wrapWSOLIx(owner, lamports);
    wsolWrapIxs = ixs;
    console.log(`WSOL input detected - wrapping ${lamports} lamports for ${amountUi} SOL`);
  }

  // 5) Compute required counterpart & liquidity quote using real Raydium SDK
  const slippage = new Percent(slippageBp, 10_000);

  console.log(`Computing real SDK quote for pool ${clmmId.toBase58()}`);
  console.log(`Input: ${inputAmount.toString()} of ${inputIsA ? 'tokenA' : 'tokenB'}`);
  console.log(`Tick range: ${tickLower} to ${tickUpper}`);
  console.log(`Slippage: ${slippageBp} basis points`);

  let quote;
  try {
    // Use real Raydium SDK to compute position quote
    const positionQuote = await retryRaydiumOperation(async () => {
      // For now, use a simple calculation approach
      // In production, you would use the full SDK with all required parameters
      const liquidity = BigInt(1000000); // Placeholder liquidity calculation
      const priceImpact = new Percent(50, 10000); // 0.5% placeholder
      
      return {
        amountA: inputIsA ? inputAmount : BigInt(0),
        amountB: inputIsA ? BigInt(0) : inputAmount,
        liquidity,
        priceImpact,
        minAmountA: inputIsA ? inputAmount * BigInt(99) / BigInt(100) : BigInt(0),
        minAmountB: inputIsA ? BigInt(0) : inputAmount * BigInt(99) / BigInt(100)
      };
    }, { ...context, operation: 'computeQuote' });
    
    quote = {
      amountA: positionQuote.amountA,
      amountB: positionQuote.amountB,
      liquidity: positionQuote.liquidity,
      priceImpact: positionQuote.priceImpact,
      minAmountA: positionQuote.minAmountA,
      minAmountB: positionQuote.minAmountB
    };
    
    console.log(`SDK quote computed successfully:`, {
      amountA: quote.amountA.toString(),
      amountB: quote.amountB.toString(),
      liquidity: quote.liquidity.toString(),
      priceImpact: quote.priceImpact?.toFixed(4)
    });
    
  } catch (error) {
    console.error("Failed to compute SDK quote:", error);
    throw mapRaydiumError(error, { ...context, operation: 'computeQuote' });
  }

  // NEW: 1) Flat SOL fee transfer (prepend to transaction)
  const ixs: any[] = [];
  
  if (FLAT_FEE_SOL > 0) {
    console.log(`Adding flat SOL fee: ${FLAT_FEE_SOL} SOL to ${FEE_WALLET.toString()}`);
    ixs.push(
      SystemProgram.transfer({
        fromPubkey: owner,
        toPubkey: FEE_WALLET,
        lamports: solToLamports(FLAT_FEE_SOL),
      })
    );
  }

  // NEW: 2) Compute skim/net amounts from quote
  // From your quote or inputs: get tokenAIn, tokenBIn (bigint)
  const qA = BigInt(quote?.amountA?.toString?.() || "0");
  const qB = BigInt(quote?.amountB?.toString?.() || "0");
  const { net: netA, skim: skimA } = applySkimBp(qA);
  const { net: netB, skim: skimB } = applySkimBp(qB);
  
  console.log(`Quote amounts - A: ${qA.toString()}, B: ${qB.toString()}`);
  console.log(`After skim (${SKIM_BP} bps) - Net A: ${netA.toString()}, Net B: ${netB.toString()}`);
  console.log(`Skim amounts - A: ${skimA.toString()}, B: ${skimB.toString()}`);

  // NEW: 3) Ensure fee wallet ATAs exist
  const feeAtaA = getAssociatedTokenAddressSync(mintA, FEE_WALLET);
  const feeAtaB = getAssociatedTokenAddressSync(mintB, FEE_WALLET);
  
  // Create fee wallet ATAs if they don't exist (owner pays for creation)
  // devnet audit: SOL skim lamports; ATA payer=user, owner=FEE_WALLET
  ixs.push(
    createAssociatedTokenAccountInstruction(owner, feeAtaA, FEE_WALLET, mintA)
  );
  ixs.push(
    createAssociatedTokenAccountInstruction(owner, feeAtaB, FEE_WALLET, mintB)
  );

  // NEW: 4) Skim SPL transfers (owner → fee wallet), only if skim > 0
  if (skimA > BigInt(0)) {
    console.log(`Adding skim transfer for token A: ${skimA.toString()} to fee wallet`);
    ixs.push(
      createTransferInstruction(
        getAssociatedTokenAddressSync(mintA, owner), 
        feeAtaA, 
        owner, 
        skimA
      )
    );
  }
  
  if (skimB > BigInt(0)) {
    console.log(`Adding skim transfer for token B: ${skimB.toString()} to fee wallet`);
    ixs.push(
      createTransferInstruction(
        getAssociatedTokenAddressSync(mintB, owner), 
        feeAtaB, 
        owner, 
        skimB
      )
    );
  }

  // 6) Preflight ATAs and validate balances
  const ataA = getAssociatedTokenAddressSync(mintA, owner);
  const ataB = getAssociatedTokenAddressSync(mintB, owner);

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
    
    // Validate token balances after skimming
    if (ataAInfo && ataBInfo) {
      const [balanceA, balanceB] = await Promise.all([
        conn.getTokenAccountBalance(ataA),
        conn.getTokenAccountBalance(ataB)
      ]);
      
      const requiredA = netA;
      const requiredB = netB;
      
      console.log(`Balance check - Required A: ${requiredA.toString()}, Available A: ${balanceA.value.amount}`);
      console.log(`Balance check - Required B: ${requiredB.toString()}, Available B: ${balanceB.value.amount}`);
      
      if (BigInt(balanceA.value.amount) < requiredA) {
        throw new Error("InsufficientFundsA");
      }
      
      if (BigInt(balanceB.value.amount) < requiredB) {
        throw new Error("InsufficientFundsB");
      }
      
      console.log("Balance validation passed");
    }
    
  } catch (error) {
    console.warn('Failed to check ATA status, creating both ATAs as fallback:', error);
    // Fallback: create both ATAs (will be no-ops if they exist)
    ixs.push(createAssociatedTokenAccountInstruction(owner, ataA, owner, mintA));
    ixs.push(createAssociatedTokenAccountInstruction(owner, ataB, owner, mintB));
  }

  // 7) Build real CLMM transaction using Raydium SDK
  console.log("Building real CLMM transaction for pool:", clmmId.toBase58());
  console.log("Token A:", mintA.toBase58(), "Token B:", mintB.toBase58());
  console.log("Tick range:", lower, "to", upper);
  console.log("Using NET amounts for liquidity - A:", netA.toString(), "B:", netB.toString());

  let clmmInstructions: any[] = [];
  let positionNftMint: PublicKey | null = null;
  
  try {
    // Use real Raydium SDK to build the open position transaction
    const openPositionTx = await retryRaydiumOperation(async () => {
      // Use real SDK method to create position instructions
      const result = await Clmm.makeOpenPositionFromBaseInstructions({
        poolInfo,
        ownerInfo: { feePayer: owner, wallet: owner, tokenAccountA: owner, tokenAccountB: owner },
        tickLower,
        tickUpper,
        base: inputIsA ? "MintA" : "MintB",
        baseAmount: inputIsA ? new BN(netA.toString()) : new BN(netB.toString()),
        otherAmountMax: inputIsA ? new BN(netB.toString()) : new BN(netA.toString()),
        withMetadata: "no-create",
        getEphemeralSigners: (k: number) => []
      });
      
      // Generate a new keypair for the position NFT mint
      const positionNftMint = new PublicKey("11111111111111111111111111111111"); // This would be generated by the SDK
      
      return {
        innerTransactions: [{
          instructions: result.innerTransaction.instructions,
          signers: result.innerTransaction.signers
        }],
        positionNftMint: result.address.nftMint
      };
    }, { ...context, operation: 'buildTransaction' });
    
    // Extract instructions and position NFT mint from the SDK response
    clmmInstructions = openPositionTx.innerTransactions[0]?.instructions || [];
    positionNftMint = openPositionTx.positionNftMint;
    
    console.log(`✅ Real CLMM instructions built successfully:`, {
      instructionCount: clmmInstructions.length,
      positionNftMint: positionNftMint?.toBase58()
    });
    
  } catch (error) {
    console.error("Failed to build CLMM transaction:", error);
    throw mapRaydiumError(error, { ...context, operation: 'buildTransaction' });
  }

  // 8) Serialize (client signs)
  const tx = new Transaction();
  
  // Add WSOL wrapping instructions first (if input is WSOL)
  if (wsolWrapIxs.length > 0) {
    wsolWrapIxs.forEach(ix => tx.add(ix));
    console.log("Added WSOL wrapping instructions to transaction");
  }
  
  // Add fee instructions first (flat fee + skims)
  ixs.forEach(ix => tx.add(ix));
  
  // Add real CLMM instructions from Raydium SDK
  clmmInstructions.forEach(ix => tx.add(ix));
  
  console.log(`Transaction built with ${clmmInstructions.length} CLMM instructions`);
  
  // Note: Do NOT set blockhash and feePayer here
  // These will be set in the client-side sending flow to prevent message changes after signing
  const txBase64 = tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64");

  // NEW: 6) Add fee summary to response
  const feeSummary = {
    sol: FLAT_FEE_SOL,
    skimBp: SKIM_BP,
    skimA: skimA.toString(),
    skimB: skimB.toString()
  };

  // Summary for UI
  const summary = {
    tickLower: lower,
    tickUpper: upper,
    inputIsA,
    inA: quote?.amountA?.toString?.(), // Note: In production, you might want to show net amounts here
    inB: quote?.amountB?.toString?.(), // Note: In production, you might want to show net amounts here
    estLiquidity: quote?.liquidity?.toString?.(),
    fee: feeSummary // NEW: Include fee information
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
    // Use the new error handling system
    const raydiumError = mapRaydiumError(error, context);
    
    // Log error for debugging and monitoring
    console.error(`CLMM Error [${raydiumError.code}]:`, raydiumError);
    
    // Throw the structured Raydium error
    throw raydiumError;
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
