import { decreaseLiquidityInstructions, closePositionInstructions } from "@orca-so/whirlpools";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { WSOL_MINT, isWSOL, wrapWSOLIx, unwrapWSOLIx } from "./wsol";
import { ensureAtaIx } from "./atas";
import { clampSlippageBp } from "./slippage";

// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

export type DecreaseParams = {
  connection: Connection;
  walletPubkey: string;
  whirlpool: string;
  positionPda: string;
  positionMint: string;
  tickLower: number;
  tickUpper: number;
  tokenA: string;     // Token A mint address
  tokenB: string;     // Token B mint address
  percent: number;    // 0..100
  slippageBp: number; // default 100
};

export async function buildDecreaseTx(p: DecreaseParams) {
  const owner = new PublicKey(p.walletPubkey);
  const whirl = new PublicKey(p.whirlpool);
  const posPk = new PublicKey(p.positionPda);

  // Get position data to determine current liquidity
  // For now, we'll use a simplified approach since the SDK has RPC interface compatibility issues
  console.log("Building decrease liquidity transaction for position:", p.positionMint);
  console.log("Percent:", p.percent, "Slippage:", p.slippageBp);

  // Clamp percent between 0-100
  const pct = Math.max(0, Math.min(100, p.percent));
  
  // Clamp slippage between 10-500 basis points using centralized helper
  const slippageBp = clampSlippageBp(p.slippageBp);

  // Build instructions array
  const ixs: any[] = [];

  // Ensure ATAs exist (only create if missing) - using placeholder mints for now
  // In production, these would come from pool data
  const placeholderMintA = new PublicKey("11111111111111111111111111111111");
  const placeholderMintB = new PublicKey("11111111111111111111111111111111");
  
  const { ata: ownerAtaA, ix: ataAIx } = await ensureAtaIx(p.connection, owner, placeholderMintA);
  const { ata: ownerAtaB, ix: ataBIx } = await ensureAtaIx(p.connection, owner, placeholderMintB);
  const posTokenAta = getAssociatedTokenAddressSync(new PublicKey(p.positionMint), owner);
  
  // Add ATA creation instructions only if needed
  if (ataAIx) ixs.push(ataAIx);
  if (ataBIx) ixs.push(ataBIx);
  
  // WSOL handling: Check if either token is WSOL for unwrapping after decrease
  const isTokenAWSOL = isWSOL(p.tokenA);
  const isTokenBWSOL = isWSOL(p.tokenB);

  // TODO: Integrate with @orca-so/whirlpools SDK when RPC interface compatibility is resolved
  // The SDK expects a different RPC interface than @solana/web3.js Connection
  
               // For now, create placeholder instructions
             console.log("Will decrease liquidity by", pct + "%");
             if (pct >= 100) {
               console.log("Will close position completely");
             }
             
             // WSOL handling: Unwrap WSOL after decrease operation
             if (isTokenAWSOL || isTokenBWSOL) {
               console.log("Will unwrap WSOL after decrease operation");
               // Add unwrap instruction for WSOL
               if (isTokenAWSOL) {
                 ixs.push(unwrapWSOLIx(owner));
               }
               if (isTokenBWSOL) {
                 ixs.push(unwrapWSOLIx(owner));
               }
             }

             // Create and configure transaction
             const tx = new Transaction();
             ixs.forEach(ix => tx.add(ix));
             tx.feePayer = owner;
             tx.recentBlockhash = (await p.connection.getLatestBlockhash()).blockhash;

  return {
    txBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    summary: { 
      tokenMinA: "0", // Placeholder - would be calculated by SDK
      tokenMinB: "0", // Placeholder - would be calculated by SDK
      closed: pct >= 100,
      percent: pct,
      slippageBp: slippageBp
    }
  };
}
