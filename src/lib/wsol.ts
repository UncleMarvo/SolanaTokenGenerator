import { Connection, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createSyncNativeInstruction, NATIVE_MINT, createCloseAccountInstruction } from "@solana/spl-token";

export const WSOL_MINT = NATIVE_MINT; // So111...

export function isWSOL(mint: string) {
  return mint === WSOL_MINT.toBase58();
}

export function wrapWSOLIx(owner: PublicKey, lamports: number) {
  const ata = getAssociatedTokenAddressSync(WSOL_MINT, owner);
  const ixs = [
    SystemProgram.transfer({ fromPubkey: owner, toPubkey: ata, lamports }),
    createSyncNativeInstruction(ata),
  ];
  return { ata, ixs };
}

export function unwrapWSOLIx(owner: PublicKey) {
  const ata = getAssociatedTokenAddressSync(WSOL_MINT, owner);
  return createCloseAccountInstruction(ata, owner, owner);
}
