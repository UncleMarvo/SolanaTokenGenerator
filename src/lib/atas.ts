import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

export async function ensureAtaIx(conn: Connection, owner: PublicKey, mint: PublicKey) {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try { 
    await getAccount(conn, ata); 
    return { ata, ix: null }; 
  }
  catch { 
    return { ata, ix: createAssociatedTokenAccountInstruction(owner, ata, owner, mint) }; 
  }
}
