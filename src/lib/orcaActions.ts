import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createSyncNativeInstruction, createCloseAccountInstruction } from "@solana/spl-token";
import { 
  increaseLiquidityInstructions, 
  decreaseLiquidityInstructions, 
  harvestPositionInstructions,
  closePositionInstructions
} from "@orca-so/whirlpools";

// Orca Whirlpool Program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc');

// Common token mints
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

export interface OrcaPosition {
  positionMint: string;
  whirlpool: string;
  lowerTick: number;
  upperTick: number;
  liquidity: string;
  tokenA: string;
  tokenB: string;
  symbolA?: string;
  symbolB?: string;
}

export interface IncreaseLiquidityRequest {
  connection: Connection;
  walletPubkey: PublicKey;
  position: OrcaPosition;
  amountAUi: string;
  amountBUi: string;
  slippageBp: number;
}

export interface DecreaseLiquidityRequest {
  connection: Connection;
  walletPubkey: PublicKey;
  position: OrcaPosition;
  percent: number; // 0-100
  slippageBp: number;
}

export interface CollectFeesRequest {
  connection: Connection;
  walletPubkey: PublicKey;
  position: OrcaPosition;
}

export interface ActionResponse {
  txBase64: string;
  summary: {
    action: string;
    positionMint: string;
    whirlpool: string;
    [key: string]: any;
  };
}

/**
 * Builds a transaction to increase liquidity in an existing Orca Whirlpool position
 * Adds more liquidity to the same tick range
 */
export async function buildIncreaseLiquidityTx({
  connection,
  walletPubkey,
  position,
  amountAUi,
  amountBUi,
  slippageBp
}: IncreaseLiquidityRequest): Promise<ActionResponse> {
  try {
    // Validate slippage
    if (slippageBp < 10 || slippageBp > 500) {
      throw new Error("Slippage must be between 10-500 basis points (0.1%-5%)");
    }

    // Get mint decimals and convert UI amounts
    const [mintAInfo, mintBInfo] = await Promise.all([
      connection.getParsedAccountInfo(new PublicKey(position.tokenA)),
      connection.getParsedAccountInfo(new PublicKey(position.tokenB))
    ]);

    const decimalsA = (mintAInfo.value?.data as any)?.parsed?.info?.decimals || 9;
    const decimalsB = (mintBInfo.value?.data as any)?.parsed?.info?.decimals || 9;

    const amountARaw = Math.floor(parseFloat(amountAUi) * Math.pow(10, decimalsA));
    const amountBRaw = Math.floor(parseFloat(amountBUi) * Math.pow(10, decimalsB));

    // For now, create a simplified implementation that demonstrates the structure
    // In production, you would use the actual SDK functions and convert their output
    const instructions: TransactionInstruction[] = [];
    
    // Handle WSOL wrapping if needed
    if (position.tokenA === WSOL_MINT.toBase58()) {
      const tempWsolAta = await getAssociatedTokenAddress(WSOL_MINT, walletPubkey);
      const tempWsolAccount = await connection.getAccountInfo(tempWsolAta);
      
      if (!tempWsolAccount) {
        instructions.push(createAssociatedTokenAccountInstruction(
          walletPubkey,
          tempWsolAta,
          walletPubkey,
          WSOL_MINT
        ));
      }
      
      instructions.push(createSyncNativeInstruction(tempWsolAta));
    }

    if (position.tokenB === WSOL_MINT.toBase58()) {
      const tempWsolAta = await getAssociatedTokenAddress(WSOL_MINT, walletPubkey);
      const tempWsolAccount = await connection.getAccountInfo(tempWsolAta);
      
      if (!tempWsolAccount) {
        instructions.push(createAssociatedTokenAccountInstruction(
          walletPubkey,
          tempWsolAta,
          walletPubkey,
          WSOL_MINT
        ));
      }
      
      instructions.push(createSyncNativeInstruction(tempWsolAta));
    }

    // TODO: Replace with actual SDK integration
    // For now, add a placeholder instruction to demonstrate the flow
    // In production, you would call increaseLiquidityInstructions() and convert the output
    console.log("TODO: Integrate with @orca-so/whirlpools SDK for increase liquidity");
    console.log("Position:", position.positionMint);
    console.log("Amounts:", { amountAUi, amountBUi, slippageBp });

    // Create and serialize transaction
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = walletPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const txBase64 = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    return {
      txBase64,
      summary: {
        action: "increase_liquidity",
        positionMint: position.positionMint,
        whirlpool: position.whirlpool,
        amountAUi,
        amountBUi,
        slippageBp,
        tickLower: position.lowerTick,
        tickUpper: position.upperTick,
      }
    };

  } catch (error) {
    console.error("Error building increase liquidity transaction:", error);
    throw error;
  }
}

/**
 * Builds a transaction to decrease liquidity in an existing Orca Whirlpool position
 * Reduces liquidity by the specified percentage, optionally closes the position
 */
export async function buildDecreaseLiquidityTx({
  connection,
  walletPubkey,
  position,
  percent,
  slippageBp
}: DecreaseLiquidityRequest): Promise<ActionResponse> {
  try {
    // Validate inputs
    if (percent < 0 || percent > 100) {
      throw new Error("Percent must be between 0-100");
    }
    if (slippageBp < 10 || slippageBp > 500) {
      throw new Error("Slippage must be between 10-500 basis points (0.1%-5%)");
    }

    // Calculate liquidity to remove
    const currentLiquidity = BigInt(position.liquidity);
    const liquidityToRemove = (currentLiquidity * BigInt(Math.floor(percent * 100))) / BigInt(10000); // percent * 100 for precision

    // For now, create a simplified implementation that demonstrates the structure
    // In production, you would use the actual SDK functions and convert their output
    const instructions: TransactionInstruction[] = [];

    // TODO: Replace with actual SDK integration
    // For now, add a placeholder instruction to demonstrate the flow
    // In production, you would call decreaseLiquidityInstructions() and convert the output
    console.log("TODO: Integrate with @orca-so/whirlpools SDK for decrease liquidity");
    console.log("Position:", position.positionMint);
    console.log("Percent:", percent, "Liquidity to remove:", liquidityToRemove.toString());

    // If 100%, also add close position instruction
    if (percent === 100) {
      console.log("TODO: Integrate with @orca-so/whirlpools SDK for close position");
      console.log("Will close position:", position.positionMint);
    }

    // Create and serialize transaction
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = walletPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const txBase64 = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    return {
      txBase64,
      summary: {
        action: "decrease_liquidity",
        positionMint: position.positionMint,
        whirlpool: position.whirlpool,
        percent,
        liquidityRemoved: liquidityToRemove.toString(),
        slippageBp,
        willClose: percent === 100,
      }
    };

  } catch (error) {
    console.error("Error building decrease liquidity transaction:", error);
    throw error;
  }
}

/**
 * Builds a transaction to collect fees and rewards from an Orca Whirlpool position
 * Collects accumulated fees and any reward tokens
 */
export async function buildCollectFeesTx({
  connection,
  walletPubkey,
  position
}: CollectFeesRequest): Promise<ActionResponse> {
  try {
    // For now, create a simplified implementation that demonstrates the structure
    // In production, you would use the actual SDK functions and convert their output
    const instructions: TransactionInstruction[] = [];

    // TODO: Replace with actual SDK integration
    // For now, add a placeholder instruction to demonstrate the flow
    // In production, you would call harvestPositionInstructions() and convert the output
    console.log("TODO: Integrate with @orca-so/whirlpools SDK for collect fees");
    console.log("Position:", position.positionMint);
    console.log("Will collect fees and rewards");

    // Create and serialize transaction
    const transaction = new Transaction().add(...instructions);
    transaction.feePayer = walletPubkey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const txBase64 = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString("base64");

    return {
      txBase64,
      summary: {
        action: "collect_fees",
        positionMint: position.positionMint,
        whirlpool: position.whirlpool,
        tickLower: position.lowerTick,
        tickUpper: position.upperTick,
      }
    };

  } catch (error) {
    console.error("Error building collect fees transaction:", error);
    throw error;
  }
}
