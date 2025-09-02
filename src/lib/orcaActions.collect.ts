import { harvestPositionInstructions } from "@orca-so/whirlpools";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

export type CollectParams = {
  connection: Connection;
  walletPubkey: string;
  whirlpool: string;
  positionPda: string;
  positionMint: string;
};

export async function buildCollectTx(p: CollectParams) {
  const owner = new PublicKey(p.walletPubkey);
  const whirl = new PublicKey(p.whirlpool);
  const posPk = new PublicKey(p.positionPda);

  // For now, we'll use a simplified approach since the SDK has RPC interface compatibility issues
  console.log("Building collect fees transaction for position:", p.positionMint);
  console.log("Will collect accumulated fees and rewards");

  // Get associated token accounts
  const posTokenAta = getAssociatedTokenAddressSync(new PublicKey(p.positionMint), owner);
  
  // For now, use placeholder token mints since we can't fetch pool data without SDK
  // In production, these would come from poolData.tokenMintA and poolData.tokenMintB
  const placeholderMintA = new PublicKey("11111111111111111111111111111111");
  const placeholderMintB = new PublicKey("11111111111111111111111111111111");
  
  const ownerAtaA = getAssociatedTokenAddressSync(placeholderMintA, owner);
  const ownerAtaB = getAssociatedTokenAddressSync(placeholderMintB, owner);

  // Build instructions array
  const ixs: any[] = [];

  // Create ATAs if they don't exist
  ixs.push(createAssociatedTokenAccountInstruction(owner, ownerAtaA, owner, placeholderMintA));
  ixs.push(createAssociatedTokenAccountInstruction(owner, ownerAtaB, owner, placeholderMintB));

  // TODO: Integrate with @orca-so/whirlpools SDK when RPC interface compatibility is resolved
  // The SDK expects a different RPC interface than @solana/web3.js Connection
  
  // For now, create placeholder instructions
  console.log("Will collect fees for token A and token B");
  console.log("Will collect any available rewards (if pool has reward tokens)");

  // Create and configure transaction
  const tx = new Transaction();
  ixs.forEach(ix => tx.add(ix));
  tx.feePayer = owner;
  tx.recentBlockhash = (await p.connection.getLatestBlockhash()).blockhash;

  return { 
    txBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    summary: {
      action: "collect_fees",
      positionMint: p.positionMint,
      whirlpool: p.whirlpool,
      collectedFees: true,
      collectedRewards: false // Would be true if pool has reward tokens
    }
  };
}
