import { PublicKey, Transaction } from "@solana/web3.js";
import { NATIVE_MINT, getAssociatedTokenAddressSync, getAccount, createCloseAccountInstruction } from "@solana/spl-token";

/**
 * WSOL dust threshold in SOL (default: 0.01 SOL)
 * Can be overridden via WSOL_DUST_SOL environment variable
 */
export const WSOL_DUST_SOL = Number(process.env.WSOL_DUST_SOL || 0.01);

/**
 * Get the WSOL Associated Token Account address for a given owner
 * @param owner - The wallet public key
 * @returns The WSOL ATA public key
 */
export function wsolAta(owner: PublicKey) {
  return getAssociatedTokenAddressSync(NATIVE_MINT, owner, false);
}

/**
 * Read WSOL balance in SOL units
 * @param conn - Solana connection
 * @param owner - The wallet public key
 * @returns WSOL balance in SOL (or null if account doesn't exist)
 */
export async function readWsolSolBalance(
  conn: import("@solana/web3.js").Connection, 
  owner: PublicKey
): Promise<number | null> {
  try {
    const ata = wsolAta(owner);
    const acc = await getAccount(conn, ata); // throws if not exists
    // amount is in base units with 9 decimals (same as SOL)
    const amount = Number(acc.amount) / 1_000_000_000;
    return amount;
  } catch {
    return null;
  }
}

/**
 * Build a transaction that closes the WSOL ATA, refunding lamports to owner
 * @param conn - Solana connection
 * @param owner - The wallet public key
 * @returns Transaction ready to be signed and sent
 */
export async function buildCloseWsolTx(
  conn: import("@solana/web3.js").Connection,
  owner: PublicKey
) {
  const ata = wsolAta(owner);
  const ix = createCloseAccountInstruction(ata, owner, owner);
  const { blockhash } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction({ feePayer: owner, recentBlockhash: blockhash }).add(ix);
  return tx;
}
