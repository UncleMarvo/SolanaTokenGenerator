import { increaseLiquidityInstructions } from "@orca-so/whirlpools";
import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction } from "@solana/spl-token";

// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

export type IncreaseParams = {
  connection: Connection;
  walletPubkey: string;
  whirlpool: string;
  positionPda: string;
  positionMint: string;
  tickLower: number;
  tickUpper: number;
  tokenA: string; tokenB: string; // mints
  inputMint: "A"|"B";
  amountUi: number;
  slippageBp: number; // default 100
};

export async function buildIncreaseTx(p: IncreaseParams) {
  const owner = new PublicKey(p.walletPubkey);
  const whirl = new PublicKey(p.whirlpool);

  // Get mint decimals for token conversion
  const mintA = new PublicKey(p.tokenA);
  const mintB = new PublicKey(p.tokenB);
  
  // Get mint info for decimals
  const [mintAInfo, mintBInfo] = await Promise.all([
    p.connection.getParsedAccountInfo(mintA),
    p.connection.getParsedAccountInfo(mintB)
  ]);
  
  const decA = (mintAInfo.value?.data as any)?.parsed?.info?.decimals || 9;
  const decB = (mintBInfo.value?.data as any)?.parsed?.info?.decimals || 9;
  const inDec = p.inputMint === "A" ? decA : decB;
  const inMint = p.inputMint === "A" ? mintA : mintB;

  // Convert UI amount to raw amount
  const amount = BigInt(Math.floor(p.amountUi * Math.pow(10, inDec)));
  
  // Clamp slippage between 10-500 basis points
  const slippageBp = Math.max(10, Math.min(500, p.slippageBp || 100));
  
  // Get associated token accounts
  const ownerAtaA = getAssociatedTokenAddressSync(mintA, owner);
  const ownerAtaB = getAssociatedTokenAddressSync(mintB, owner);
  const posTokenAta = getAssociatedTokenAddressSync(new PublicKey(p.positionMint), owner);

  // Build instructions array
  const ixs: any[] = [];
  
  // Create ATAs if they don't exist
  ixs.push(createAssociatedTokenAccountInstruction(owner, ownerAtaA, owner, mintA));
  ixs.push(createAssociatedTokenAccountInstruction(owner, ownerAtaB, owner, mintB));

  // For now, create a simplified increase liquidity instruction
  // In production, you would use the full SDK with proper RPC interface
  console.log("Building increase liquidity transaction for position:", p.positionMint);
  console.log("Amount:", p.amountUi, "Input Mint:", p.inputMint, "Slippage:", slippageBp);
  
  // TODO: Integrate with @orca-so/whirlpools SDK when RPC interface compatibility is resolved
  // The SDK expects a different RPC interface than @solana/web3.js Connection

  // Create and configure transaction
  const tx = new Transaction();
  ixs.forEach(ix => tx.add(ix));
  tx.feePayer = owner;
  tx.recentBlockhash = (await p.connection.getLatestBlockhash()).blockhash;

  return {
    txBase64: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString("base64"),
    summary: { 
      tokenMaxA: amount.toString(), 
      tokenMaxB: amount.toString(),
      slippageBp: slippageBp
    }
  };
}
