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
import { 
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction
} from "@solana/spl-token";
import { FEE_WALLET, FLAT_FEE_SOL, SKIM_BP, applySkimBp, solToLamports } from "./fees";

// Common token mints
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

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
    // Parse public keys
    const whirlpoolPk = new PublicKey(whirlpool);
    const mintAPk = new PublicKey(tokenMintA);
    const mintBPk = new PublicKey(tokenMintB);
    
    // Validate slippage
    if (slippageBp < 10 || slippageBp > 500) {
      throw new Error("Slippage must be between 10-500 basis points (0.1%-5%)");
    }

    // For now, we'll use default values since the new Orca API has type incompatibilities
    // In a production environment, you would fetch these from the actual whirlpool
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
    // Note: This is a simplified quote - in production you'd get this from Orca SDK
    const quote = await getSimplifiedQuote(inputAmountRaw, inputMint, mintAPk, mintBPk);
    
    // Convert quote amounts to BigInt for fee calculations
    const qA = BigInt(quote.tokenMaxA.toString());
    const qB = BigInt(quote.tokenMaxB.toString());
    
    // Apply skim basis points to both sides
    const { net: netA, skim: skimA } = applySkimBp(qA);
    const { net: netB, skim: skimB } = applySkimBp(qB);
    
    console.log(`Quote amounts - A: ${qA.toString()}, B: ${qB.toString()}`);
    console.log(`After skim (${SKIM_BP} bps) - Net A: ${netA.toString()}, Net B: ${netB.toString()}`);
    console.log(`Skim amounts - A: ${skimA.toString()}, B: ${skimB.toString()}`);

    // 3) Ensure ATAs exist for both owner and fee wallet
    const feeAtaA = getAssociatedTokenAddressSync(mintAPk, FEE_WALLET);
    const feeAtaB = getAssociatedTokenAddressSync(mintBPk, FEE_WALLET);
    const ownerAtaA = getAssociatedTokenAddressSync(mintAPk, walletPubkey);
    const ownerAtaB = getAssociatedTokenAddressSync(mintBPk, walletPubkey);
    
    // Create fee wallet ATAs if they don't exist (owner pays for creation)
    instructions.push(
      createAssociatedTokenAccountInstruction(ownerAtaA, feeAtaA, FEE_WALLET, mintAPk)
    );
    instructions.push(
      createAssociatedTokenAccountInstruction(ownerAtaB, feeAtaB, FEE_WALLET, mintBPk)
    );

    // 4) Skim SPL transfers (from owner to fee wallet), only if skim > 0
    if (skimA > BigInt(0)) {
      console.log(`Adding skim transfer for token A: ${skimA.toString()} to fee wallet`);
      instructions.push(
        createTransferInstruction(ownerAtaA, feeAtaA, walletPubkey, skimA)
      );
    }
    
    if (skimB > BigInt(0)) {
      console.log(`Adding skim transfer for token B: ${skimB.toString()} to fee wallet`);
      instructions.push(
        createTransferInstruction(ownerAtaB, feeAtaB, walletPubkey, skimB)
      );
    }

    // 5) Add Orca increaseLiquidity instruction using NET amounts (after skim)
    // Note: This is a placeholder - in production you'd use actual Orca SDK
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

    // Create Transaction, add instructions, set feePayer and recentBlockhash
    const transaction = new Transaction();
    transaction.add(...instructions);
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPubkey;

    // Serialize to base64 (requireAllSignatures=false)
    const txBase64 = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false
    }).toString('base64');

    // Calculate expected output amount (simplified for now)
    const expectedOutputAmountUi = (inputAmountRaw * 0.99) / Math.pow(10, 9); // Rough estimate with 1% slippage

    // 6) Add fee information to response summary
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
 * In production, this would come from the actual Orca SDK quote
 */
async function getSimplifiedQuote(
  inputAmount: number, 
  inputMint: "A" | "B", 
  mintA: PublicKey, 
  mintB: PublicKey
) {
  // Simulate Orca quote response
  // In production, you'd call: const quote = await orcaSdk.getQuote(...)
  
  // For demonstration, assume 1:1 ratio with some slippage
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
  
  // This is a placeholder instruction
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
  
  // For now, return a dummy instruction that will be replaced
  return new TransactionInstruction({
    keys: [
      { pubkey: whirlpool, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: mintA, isSigner: false, isWritable: false },
      { pubkey: mintB, isSigner: false, isWritable: false },
    ],
    programId: ORCA_WHIRLPOOL_PROGRAM_ID,
    data: Buffer.from([0x01, ...new Array(32).fill(0)]) // Dummy data
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
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = wallet.publicKey;

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(tx);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    
    // Wait for confirmation
    await connection.confirmTransaction(txid, "confirmed");

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
