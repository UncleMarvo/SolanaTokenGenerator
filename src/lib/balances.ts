import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, getAccount } from "@solana/spl-token";

export async function getTokenBalanceUi(conn: Connection, owner: PublicKey, mint: PublicKey, decimals: number) {
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try { 
    const acc = await getAccount(conn, ata); 
    return Number(acc.amount) / 10 ** decimals; 
  }
  catch { 
    return 0; 
  }
}
