import { 
  Connection, 
  PublicKey, 
  Transaction, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { 
  getMint, 
  createSetAuthorityInstruction,
  createBurnInstruction,
  AuthorityType 
} from "@solana/spl-token";
import { WalletAdapter } from "@solana/wallet-adapter-base";
import { retryWithBackoff } from "@/lib/confirmRetry";

export interface MintAuthorities {
  mintAuthority: string | null;
  freezeAuthority: string | null;
}

export interface RevokeResult {
  txid: string;
}

/**
 * Revokes mint and freeze authorities from a token mint
 * This enforces the "Honest Launch" preset by making the token immutable
 */
export async function revokeAuthorities({
  connection,
  wallet,
  mint,
}: {
  connection: Connection;
  wallet: { publicKey: PublicKey; signTransaction: (transaction: Transaction) => Promise<Transaction> };
  mint: string;
}): Promise<RevokeResult> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected or cannot sign transactions");
  }

  const mintPk = new PublicKey(mint);
  const walletPk = wallet.publicKey;

  // Read current mint state
  const mintInfo = await getMint(connection, mintPk);
  
  const instructions = [];

  // Check if mint authority exists and needs to be revoked
  if (mintInfo.mintAuthority) {
    instructions.push(
      createSetAuthorityInstruction(
        mintPk,
        walletPk,
        AuthorityType.MintTokens,
        null
      )
    );
  }

  // Check if freeze authority exists and needs to be revoked
  if (mintInfo.freezeAuthority) {
    instructions.push(
      createSetAuthorityInstruction(
        mintPk,
        walletPk,
        AuthorityType.FreezeAccount,
        null
      )
    );
  }

  // If no instructions, authorities are already revoked
  if (instructions.length === 0) {
    throw new Error("Mint and freeze authorities are already revoked");
  }

  // Create and send transaction
  const transaction = new Transaction().add(...instructions);
  
  try {
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPk;

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txid, "confirmed");

    return { txid };
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Transaction failed"
    );
  }
}

/**
 * Reads the current mint and freeze authorities for a token
 */
export async function readMintAuthorities({
  connection,
  mint,
}: {
  connection: Connection;
  mint: string;
}): Promise<MintAuthorities> {
  try {
    // Validate mint address format
    if (!mint || mint.trim() === "") {
      throw new Error("Mint address is required");
    }

    // Validate that mint address is a valid PublicKey
    let mintPk: PublicKey;
    try {
      mintPk = new PublicKey(mint);
    } catch (keyError) {
      throw new Error(`Invalid mint address format: ${mint}`);
    }

    const mintInfo = await retryWithBackoff(() => getMint(connection, mintPk));

    return {
      mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
      freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
    };
  } catch (error) {
    console.error("Failed to read mint authorities:", error);
    // Preserve the original error type and message for better error handling
    if (error instanceof Error) {
      throw error; // Re-throw the original error to preserve its type
    } else {
      throw new Error("Failed to read mint authorities from blockchain");
    }
  }
}

/**
 * Verifies if a mint has honest launch (no mint or freeze authorities)
 */
export async function verifyHonestMint({
  connection,
  mint,
}: {
  connection: Connection;
  mint: string;
}): Promise<boolean> {
  try {
    const authorities = await readMintAuthorities({ connection, mint });
    return !authorities.mintAuthority && !authorities.freezeAuthority;
  } catch (error) {
    console.error("Failed to verify honest mint:", error);
    return false;
  }
}

/**
 * Burns LP tokens from a specified account
 * This is an irreversible action - use with extreme caution
 */
export async function burnLpTokens({
  connection,
  wallet,
  lpMint,
  ownerTokenAccount,
  amount,
}: {
  connection: Connection;
  wallet: { publicKey: PublicKey; signTransaction: (transaction: Transaction) => Promise<Transaction> };
  lpMint: string;
  ownerTokenAccount: string;
  amount: bigint;
}): Promise<{ txid: string }> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error("Wallet not connected or cannot sign transactions");
  }

  const lpMintPk = new PublicKey(lpMint);
  const ownerTokenAccountPk = new PublicKey(ownerTokenAccount);
  const walletPk = wallet.publicKey;

  try {
    // Create burn instruction
    const burnInstruction = createBurnInstruction(
      ownerTokenAccountPk,
      lpMintPk,
      walletPk,
      amount
    );

    // Create and send transaction
    const transaction = new Transaction().add(burnInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = walletPk;

    // Sign and send transaction
    const signedTx = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txid, "confirmed");

    return { txid };
  } catch (error) {
    console.error("Transaction failed:", error);
    throw new Error(
      error instanceof Error ? error.message : "Transaction failed"
    );
  }
}
