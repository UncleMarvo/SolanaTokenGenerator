import {
  Connection,
  PublicKey,
  Signer,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getMint,
  getAccount,
  AuthorityType,
  createSetAuthorityInstruction,
  burn,
  getAssociatedTokenAddress,
  createBurnInstruction,
} from "@solana/spl-token";

// Types for wallet adapters
export interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
}

// Union type for different wallet types
export type WalletSigner = Signer | Keypair | WalletAdapter;

/**
 * Revokes mint and freeze authorities from a token mint
 * This enforces the "Honest Launch" preset by removing control over the token
 */
export async function revokeAuthorities({
  connection,
  payer,
  mintPubkey,
}: {
  connection: Connection;
  payer: WalletSigner;
  mintPubkey: PublicKey;
}): Promise<{ txids: string[] }> {
  try {
    // Load current mint info to check existing authorities
    const mintInfo = await getMint(connection, mintPubkey);
    
    const instructions: TransactionInstruction[] = [];
    const txids: string[] = [];

    // Check if mint authority exists and needs to be revoked
    if (mintInfo.mintAuthority !== null) {
      console.log("Revoking mint authority...");
      const revokeMintAuthInstruction = createSetAuthorityInstruction(
        mintPubkey,
        payer.publicKey,
        AuthorityType.MintTokens,
        null // Set to null to revoke
      );
      instructions.push(revokeMintAuthInstruction);
    }

    // Check if freeze authority exists and needs to be revoked
    if (mintInfo.freezeAuthority !== null) {
      console.log("Revoking freeze authority...");
      const revokeFreezeAuthInstruction = createSetAuthorityInstruction(
        mintPubkey,
        payer.publicKey,
        AuthorityType.FreezeAccount,
        null // Set to null to revoke
      );
      instructions.push(revokeFreezeAuthInstruction);
    }

    if (instructions.length === 0) {
      console.log("No authorities to revoke - already honest launch enforced");
      return { txids: [] };
    }

    // Create and send transaction
    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // Sign and send transaction
    if ('signTransaction' in payer) {
      // Wallet adapter case
      const signedTx = await payer.signTransaction(transaction);
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txid);
      txids.push(txid);
    } else {
      // Keypair case
      const txid = await sendAndConfirmTransaction(connection, transaction, [payer as Keypair]);
      txids.push(txid);
    }

    console.log(`Successfully revoked ${instructions.length} authorities. Transaction ID: ${txids[0]}`);
    return { txids };

  } catch (error) {
    console.error("Error revoking authorities:", error);
    throw new Error(`Failed to revoke authorities: ${error.message}`);
  }
}

/**
 * Reads the current mint and freeze authorities from a token mint
 * Returns base58 encoded public keys or null if no authority
 */
export async function readMintAuthorities({
  connection,
  mintPubkey,
}: {
  connection: Connection;
  mintPubkey: PublicKey;
}): Promise<{ mintAuthority: string | null; freezeAuthority: string | null }> {
  try {
    const mintInfo = await getMint(connection, mintPubkey);
    
    return {
      mintAuthority: mintInfo.mintAuthority?.toBase58() || null,
      freezeAuthority: mintInfo.freezeAuthority?.toBase58() || null,
    };
  } catch (error) {
    console.error("Error reading mint authorities:", error);
    throw new Error(`Failed to read mint authorities: ${error.message}`);
  }
}

/**
 * Verifies if a mint is honestly launched (both authorities are null)
 * Returns true if the mint has no mint or freeze authority
 */
export async function verifyHonestMint({
  connection,
  mintPubkey,
}: {
  connection: Connection;
  mintPubkey: PublicKey;
}): Promise<boolean> {
  try {
    const authorities = await readMintAuthorities({ connection, mintPubkey });
    const isHonest = authorities.mintAuthority === null && authorities.freezeAuthority === null;
    
    console.log(`Mint verification: mintAuthority=${authorities.mintAuthority}, freezeAuthority=${authorities.freezeAuthority}, isHonest=${isHonest}`);
    return isHonest;
  } catch (error) {
    console.error("Error verifying honest mint:", error);
    throw new Error(`Failed to verify honest mint: ${error.message}`);
  }
}

/**
 * Burns LP tokens from a specified account
 * This is an irreversible action - use with extreme caution
 */
export async function burnLpTokens({
  connection,
  payer,
  lpMint,
  ownerTokenAccount,
  amount,
}: {
  connection: Connection;
  payer: WalletSigner;
  lpMint: PublicKey;
  ownerTokenAccount: PublicKey;
  amount: bigint;
}): Promise<{ txid: string }> {
  try {
    // Verify the token account exists and has sufficient balance
    const tokenAccount = await getAccount(connection, ownerTokenAccount);
    
    if (tokenAccount.amount < amount) {
      throw new Error(`Insufficient LP token balance. Required: ${amount}, Available: ${tokenAccount.amount}`);
    }

    // Create burn instruction
    const burnInstruction = createBurnInstruction(
      ownerTokenAccount,
      lpMint,
      payer.publicKey,
      amount
    );

    // Create and send transaction
    const transaction = new Transaction();
    transaction.add(burnInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    let txid: string;

    // Sign and send transaction
    if ('signTransaction' in payer) {
      // Wallet adapter case
      const signedTx = await payer.signTransaction(transaction);
      txid = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txid);
    } else {
      // Keypair case
      txid = await sendAndConfirmTransaction(connection, transaction, [payer as Keypair]);
    }

    console.log(`Successfully burned ${amount} LP tokens. Transaction ID: ${txid}`);
    return { txid };

  } catch (error) {
    console.error("Error burning LP tokens:", error);
    throw new Error(`Failed to burn LP tokens: ${error.message}`);
  }
}
