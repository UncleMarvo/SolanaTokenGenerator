import { decreaseLiquidityInstructions, closePositionInstructions } from "@orca-so/whirlpools";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

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
  
  // Clamp slippage between 10-500 basis points
  const slippageBp = Math.max(10, Math.min(500, p.slippageBp || 100));

  // Get associated token accounts
  const ownerAtaA = getAssociatedTokenAddressSync(new PublicKey("11111111111111111111111111111111"), owner); // Placeholder
  const ownerAtaB = getAssociatedTokenAddressSync(new PublicKey("11111111111111111111111111111111"), owner); // Placeholder
  const posTokenAta = getAssociatedTokenAddressSync(new PublicKey(p.positionMint), owner);

  // Build instructions array
  const ixs: any[] = [];

  // Create ATAs if they don't exist (using placeholder mints for now)
  ixs.push(createAssociatedTokenAccountInstruction(owner, ownerAtaA, owner, new PublicKey("11111111111111111111111111111111")));
  ixs.push(createAssociatedTokenAccountInstruction(owner, ownerAtaB, owner, new PublicKey("11111111111111111111111111111111")));

  // TODO: Integrate with @orca-so/whirlpools SDK when RPC interface compatibility is resolved
  // The SDK expects a different RPC interface than @solana/web3.js Connection
  
  // For now, create placeholder instructions
  console.log("Will decrease liquidity by", pct + "%");
  if (pct >= 100) {
    console.log("Will close position completely");
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
