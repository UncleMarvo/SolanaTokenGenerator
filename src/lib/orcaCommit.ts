import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  Keypair,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import { DEV_RELAX_CONFIRM_MS, RUN_ORCA_REAL } from "./env";
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction,
  NATIVE_MINT
} from "@solana/spl-token";
import { increaseLiquidityInstructions } from "@orca-so/whirlpools";
import { FEE_WALLET, FLAT_FEE_SOL, SKIM_BP, applySkimBp, solToLamports } from "./fees";
import { IS_DEVNET } from "./network";
import { buildOrcaRealCommit } from "./orcaReal";

// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

// Common token mints
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Helper functions for native SOL detection and lamports conversion
/**
 * Checks if a mint is the native SOL mint (So111...)
 * @param mint - The mint public key to check
 * @returns true if the mint is native SOL
 */
function isNativeSolMint(mint: PublicKey): boolean {
  return mint.toBase58() === NATIVE_MINT.toBase58();
}

/**
 * Converts a number or bigint to lamports (base units)
 * @param amount - Amount to convert (number in SOL or bigint in base units)
 * @returns Amount in lamports as number
 */
function lamports(amount: number | bigint): number {
  return typeof amount === "bigint" ? Number(amount) : Math.floor(amount * 1e9);
}

export interface OrcaCommitRequest {
  connection: Connection;
  walletPubkey: PublicKey;
  whirlpool: string;
  tokenMintA: string;
  tokenMintB: string;
  inputMint: "A" | "B";
  inputAmountUi: string;
  slippageBp: number; // basis points (100 = 1%)
}

export interface OrcaCommitResponse {
  txBase64: string;
  partialSigners?: string[]; // Base58 encoded keypairs that need to be partially signed
  summary: {
    whirlpool: string;
    tokenMintA: string;
    tokenMintB: string;
    inputMint: "A" | "B";
    inputAmountUi: string;
    expectedOutputAmountUi: string;
    slippageBp: number;
    tickLower: number;
    tickUpper: number;
    currentTick: number;
    tickSpacing: number;
    fee?: {
      sol: number;
      skimBp: number;
      skimA: string;
      skimB: string;
    };
  };
}

/**
 * Builds a transaction to commit liquidity in an Orca Whirlpool
 * Creates a new position NFT and increases liquidity
 * Now includes fee integration: flat SOL fees and token skimming
 */
export async function buildCommitTx({
  connection,
  walletPubkey,
  whirlpool,
  tokenMintA,
  tokenMintB,
  inputMint,
  inputAmountUi,
  slippageBp
}: OrcaCommitRequest): Promise<OrcaCommitResponse> {
  
  try {
    // Validate and parse public keys with proper error handling
    let whirlpoolPk: PublicKey;
    let mintAPk: PublicKey;
    let mintBPk: PublicKey;
    
    if (IS_DEVNET && whirlpool.startsWith('orca_devnet_')) {
      // On devnet, use a placeholder public key for test pool addresses
      // This allows the transaction building to proceed for testing
      whirlpoolPk = new PublicKey("11111111111111111111111111111111"); // System program as placeholder
      console.log(`[DEVNET] Using placeholder whirlpool for test address: ${whirlpool}`);
    } else {
      try {
        whirlpoolPk = new PublicKey(whirlpool);
      } catch (error) {
        throw new Error(`Invalid whirlpool address: ${whirlpool}. Must be a valid base58-encoded public key.`);
      }
    }
    
    try {
      mintAPk = new PublicKey(tokenMintA);
    } catch (error) {
      throw new Error(`Invalid token mint A address: ${tokenMintA}. Must be a valid base58-encoded public key.`);
    }
    
    try {
      mintBPk = new PublicKey(tokenMintB);
    } catch (error) {
      throw new Error(`Invalid token mint B address: ${tokenMintB}. Must be a valid base58-encoded public key.`);
    }
    
    // Validate slippage
    if (slippageBp < 10 || slippageBp > 500) {
      throw new Error("Slippage must be between 10-500 basis points (0.1%-5%)");
    }

    // Check if we should use real Orca flow
    if (RUN_ORCA_REAL) {
      console.log("Using real Orca production flow");
      return await buildRealOrcaCommit({
        connection,
        walletPubkey,
        whirlpool: whirlpoolPk,
        tokenMintA: mintAPk,
        tokenMintB: mintBPk,
        inputMint,
        inputAmountUi,
        slippageBp
      });
    }

    console.log("Using mock/dev Orca flow for testing");

    // For now, use default values for tick spacing and current tick
    // In the future, this could be enhanced to fetch real pool data
    const tickSpacing = 64; // Default for most pools
    const currentTick = 0; // Would be fetched from pool data
    
    // Compute tick range around current (±2*spacing)
    const tickLower = currentTick - (2 * tickSpacing);
    const tickUpper = currentTick + (2 * tickSpacing);

    // Simplified version without SPL token functions for now
    const inputAmountRaw = Math.floor(parseFloat(inputAmountUi) * Math.pow(10, 9)); // Assume 9 decimals

    // Build instructions array
    const instructions: TransactionInstruction[] = [];

    // 1) Flat SOL fee transfer (prepend to transaction)
    if (FLAT_FEE_SOL > 0) {
      console.log(`Adding flat SOL fee: ${FLAT_FEE_SOL} SOL to ${FEE_WALLET.toString()}`);
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: walletPubkey,
          toPubkey: FEE_WALLET,
          lamports: solToLamports(FLAT_FEE_SOL),
        })
      );
    }

    // 2) Compute quote to get tokenMaxA and tokenMaxB
    const quote = await getSimplifiedQuote(inputAmountRaw, inputMint, mintAPk, mintBPk);
    
    // Defensive parse - convert quote amounts to BigInt for fee calculations
    const qA = BigInt((quote?.tokenMaxA ?? 0).toString());
    const qB = BigInt((quote?.tokenMaxB ?? 0).toString());
    
    // Apply skim basis points to both sides
    const { net: netA, skim: skimA } = applySkimBp(qA);
    const { net: netB, skim: skimB } = applySkimBp(qB);
    
    console.log(`Quote amounts - A: ${qA.toString()}, B: ${qB.toString()}`);
    console.log(`After skim (${SKIM_BP} bps) - Net A: ${netA.toString()}, Net B: ${netB.toString()}`);
    console.log(`Skim amounts - A: ${skimA.toString()}, B: ${skimB.toString()}`);

    // 3) Skim handling with proper SOL vs SPL token distinction
    // For SPL mints → SPL transfer owner → fee wallet ATA (payer = owner, owner of ATA = FEE_WALLET)
    // For SOL side (NATIVE_MINT) → use lamports transfer, NOT SPL (no ATA)
    // devnet audit: SOL skim lamports; ATA payer=user, owner=FEE_WALLET
    
    // Handle token A skimming
    if (!isNativeSolMint(mintAPk)) {
      // Token A is SPL - create fee ATA and transfer
      const feeAtaA = getAssociatedTokenAddressSync(mintAPk, FEE_WALLET);
      // payer=walletPubkey, ataOwner=FEE_WALLET
      instructions.push(
        createAssociatedTokenAccountInstruction(walletPubkey, feeAtaA, FEE_WALLET, mintAPk)
      );
      if (skimA > 0n) {
        const ownerAtaA = getAssociatedTokenAddressSync(mintAPk, walletPubkey);
        instructions.push(
          createTransferInstruction(ownerAtaA, feeAtaA, walletPubkey, skimA)
        );
      }
    } else {
      // A-side is SOL → skim as lamports transfer
      if (skimA > 0n) {
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: walletPubkey,
            toPubkey: FEE_WALLET,
            lamports: Number(skimA), // skimA is in "base units" same as quote lamports when SOL side
          })
        );
      }
    }

    // Handle token B skimming
    if (!isNativeSolMint(mintBPk)) {
      // Token B is SPL - create fee ATA and transfer
      const feeAtaB = getAssociatedTokenAddressSync(mintBPk, FEE_WALLET);
      instructions.push(
        createAssociatedTokenAccountInstruction(walletPubkey, feeAtaB, FEE_WALLET, mintBPk)
      );
      if (skimB > 0n) {
        const ownerAtaB = getAssociatedTokenAddressSync(mintBPk, walletPubkey);
        instructions.push(
          createTransferInstruction(ownerAtaB, feeAtaB, walletPubkey, skimB)
        );
      }
    } else {
      // B-side is SOL → skim as lamports transfer
      if (skimB > 0n) {
        instructions.push(
          SystemProgram.transfer({
            fromPubkey: walletPubkey,
            toPubkey: FEE_WALLET,
            lamports: Number(skimB),
          })
        );
      }
    }

    // 4) Add Orca liquidity instruction using NET amounts (after skim)
    // Note: For production, this would need to:
    // 1. Create a new position NFT first
    // 2. Then increase liquidity on that position
    // For now, we use a placeholder that works for testing
    const increaseLiquidityIx = createPlaceholderIncreaseLiquidityIx({
      whirlpool: whirlpoolPk,
      owner: walletPubkey,
      mintA: mintAPk,
      mintB: mintBPk,
      tokenMaxA: netA, // Use NET amount (after skim)
      tokenMaxB: netB, // Use NET amount (after skim)
      tickLower,
      tickUpper,
      slippageBp
    });
    
    instructions.push(increaseLiquidityIx);

    // Create Transaction and add instructions
    const transaction = new Transaction();
    transaction.add(...instructions);
    
    // Note: Do NOT set blockhash and feePayer here
    // These will be set in the client-side sending flow to prevent message changes after signing

    // Serialize to base64 (requireAllSignatures=false)
    const txBase64 = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    // Calculate expected output amount (simplified for now)
    const expectedOutputAmountUi = (inputAmountRaw * 0.99) / Math.pow(10, 9); // Rough estimate with 1% slippage

    // 5) Add fee information to response summary
    const feeSummary = {
      sol: FLAT_FEE_SOL,
      skimBp: SKIM_BP,
      skimA: skimA.toString(),
      skimB: skimB.toString()
    };

    return {
      txBase64,
      summary: {
        whirlpool,
        tokenMintA,
        tokenMintB,
        inputMint,
        inputAmountUi,
        expectedOutputAmountUi: expectedOutputAmountUi.toFixed(6),
        slippageBp,
        tickLower,
        tickUpper,
        currentTick,
        tickSpacing,
        fee: feeSummary
      }
    };

  } catch (error) {
    console.error("Error building commit transaction:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to build commit transaction"
    );
  }
}

/**
 * Simplified quote function that returns tokenMaxA and tokenMaxB
 * Uses basic calculations for now - can be enhanced with real pool data later
 */
async function getSimplifiedQuote(
  inputAmount: number, 
  inputMint: "A" | "B", 
  mintA: PublicKey, 
  mintB: PublicKey
) {
  // For now, use simplified calculations
  // In the future, this could be enhanced to fetch real pool data
  
  const baseAmount = inputAmount;
  const quoteAmount = Math.floor(baseAmount * 0.98); // 2% slippage
  
  return {
    tokenMaxA: inputMint === "A" ? baseAmount : quoteAmount,
    tokenMaxB: inputMint === "B" ? baseAmount : quoteAmount,
    priceImpact: 0.02, // 2%
    lpFee: 0.003, // 0.3%
    expectedLpTokens: (baseAmount * 0.1).toString()
  };
}

/**
 * Creates a placeholder increaseLiquidity instruction
 * In production, this would use: WhirlpoolIx.increaseLiquidityIx(...)
 */
function createPlaceholderIncreaseLiquidityIx({
  whirlpool,
  owner,
  mintA,
  mintB,
  tokenMaxA,
  tokenMaxB,
  tickLower,
  tickUpper,
  slippageBp
}: {
  whirlpool: PublicKey;
  owner: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
  tokenMaxA: bigint;
  tokenMaxB: bigint;
  tickLower: number;
  tickUpper: number;
  slippageBp: number;
}): TransactionInstruction {
  
  // This is a placeholder instruction for testing purposes
  // In production, you'd use the actual Orca SDK:
  // return WhirlpoolIx.increaseLiquidityIx(ctx.program, {
  //   whirlpool,
  //   owner,
  //   positionMint: positionMint,
  //   positionTokenAccount: positionTokenAccount,
  //   tokenOwnerAccountA: ownerAtaA,
  //   tokenOwnerAccountB: ownerAtaB,
  //   tokenVaultA: poolTokenVaultA,
  //   tokenVaultB: poolTokenVaultB,
  //   tickArrayLower: tickArrayLower,
  //   tickArrayUpper: tickArrayUpper,
  //   tokenMaxA: netA, // Use NET amount (after skim)
  //   tokenMaxB: netB, // Use NET amount (after skim)
  //   tickLower,
  //   tickUpper,
  //   slippageBp
  // });
  
  // For testing purposes, create a valid mock transaction using SystemProgram
  // This creates a simple transfer instruction that can be signed by the wallet
  // In production, this would be replaced with actual Orca SDK integration
  return SystemProgram.transfer({
    fromPubkey: owner,
    toPubkey: owner, // Transfer to self (no-op for testing)
    lamports: 0 // Zero amount transfer for testing
  });
}

/**
 * Sends and confirms a transaction
 * Returns the transaction ID
 */
export async function sendAndConfirm({
  connection,
  wallet,
  tx
}: {
  connection: Connection;
  wallet: { publicKey: PublicKey; signTransaction: (transaction: Transaction) => Promise<Transaction> };
  tx: Transaction;
}): Promise<string> {
  
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected or cannot sign transactions");
  }

  try {
    // Get fresh blockhash and lastValidBlockHeight BEFORE any signing
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    
    // Set transaction properties - MUST be done before signing
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;

    // DO NOT modify transaction after this point to avoid signature invalidation
    const signedTx = await wallet.signTransaction(tx);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation with devnet timeout if applicable
    const confirmPromise = connection.confirmTransaction(txid, "confirmed");
    
    await (DEV_RELAX_CONFIRM_MS > 0 
      ? Promise.race([
          confirmPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Confirmation timeout")), DEV_RELAX_CONFIRM_MS)
          )
        ])
      : confirmPromise);

    return txid;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Transaction failed"
    );
  }
}

/**
 * Validates that a wallet has sufficient balance for the transaction
 * Simplified version without SPL token functions for now
 */
export async function validateBalances({
  connection,
  walletPubkey,
  tokenMintA,
  tokenMintB,
  amountA,
  amountB
}: {
  connection: Connection;
  walletPubkey: PublicKey;
  tokenMintA: string;
  tokenMintB: string;
  amountA: string;
  amountB: string;
}): Promise<{ valid: boolean; error?: string }> {
  
  try {
    // Simplified validation - just check SOL balance for now
    const solBalance = await connection.getBalance(walletPubkey);
    const requiredSol = 1000000; // 0.001 SOL minimum
    
    if (solBalance < requiredSol) {
      return { 
        valid: false, 
        error: `Insufficient SOL balance. Required: ${requiredSol / 1e9} SOL, Available: ${solBalance / 1e9} SOL` 
      };
    }

    return { valid: true };
  } catch (error) {
    console.error("Error validating balances:", error);
    return { 
      valid: false, 
      error: "Failed to validate balances" 
    };
  }
}

/**
 * Builds a real Orca commit transaction using the production flow
 * This function bridges the real Orca implementation with the existing interface
 */
async function buildRealOrcaCommit({
  connection,
  walletPubkey,
  whirlpool,
  tokenMintA,
  tokenMintB,
  inputMint,
  inputAmountUi,
  slippageBp
}: {
  connection: Connection;
  walletPubkey: PublicKey;
  whirlpool: PublicKey;
  tokenMintA: PublicKey;
  tokenMintB: PublicKey;
  inputMint: "A" | "B";
  inputAmountUi: string;
  slippageBp: number;
}): Promise<OrcaCommitResponse> {
  
  // Get quote to determine token amounts
  const quote = await getSimplifiedQuote(
    Math.floor(parseFloat(inputAmountUi) * Math.pow(10, 9)), 
    inputMint, 
    tokenMintA, 
    tokenMintB
  );
  
  // Build real Orca commit transaction
  const { tx, signers, positionMint, positionPda } = await buildOrcaRealCommit({
    owner: walletPubkey,
    whirlpool,
    mintA: tokenMintA,
    mintB: tokenMintB,
    tokenMaxA: BigInt(quote.tokenMaxA.toString()),
    tokenMaxB: BigInt(quote.tokenMaxB.toString()),
    slippageBps: slippageBp
  });

  // Note: Do NOT set blockhash and feePayer here
  // These will be set in the client-side sending flow to prevent message changes after signing

  // Serialize transaction
  const txBase64 = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false
  }).toString('base64');

  // Calculate expected output amount
  const expectedOutputAmountUi = (parseFloat(inputAmountUi) * 0.99).toFixed(6);

  // Apply fee calculations for summary
  const qA = BigInt(quote.tokenMaxA.toString());
  const qB = BigInt(quote.tokenMaxB.toString());
  const { skim: skimA } = applySkimBp(qA);
  const { skim: skimB } = applySkimBp(qB);

  return {
    txBase64,
    partialSigners: signers.map(signer => Buffer.from(signer.secretKey).toString('base64')), // Include partial signers
    summary: {
      whirlpool: whirlpool.toString(),
      tokenMintA: tokenMintA.toString(),
      tokenMintB: tokenMintB.toString(),
      inputMint,
      inputAmountUi,
      expectedOutputAmountUi,
      slippageBp,
      tickLower: 0, // Will be set by real implementation
      tickUpper: 0, // Will be set by real implementation
      currentTick: 0, // Will be fetched from pool
      tickSpacing: 64, // Will be fetched from pool
      fee: {
        sol: FLAT_FEE_SOL,
        skimBp: SKIM_BP,
        skimA: skimA.toString(),
        skimB: skimB.toString()
      }
    }
  };
}
