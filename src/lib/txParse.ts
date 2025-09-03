import { Connection, PublicKey } from "@solana/web3.js";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");

// Raydium CLMM program ID (mainnet)
// This is the main Raydium CLMM program - adjust if using a different version
export const RAYDIUM_CLMM_PROGRAM_ID = new PublicKey("675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8");

/**
 * Attempts to find a Raydium CLMM position NFT mint from a confirmed transaction
 * @param conn Solana connection
 * @param txSig Transaction signature
 * @param opts Optional parameters for fallback scanning
 * @returns Position NFT mint address if found, null otherwise
 */
export async function findClmmPositionMintFromTx(
  conn: Connection, 
  txSig: string, 
  opts?: { wallet?: string; poolId?: string }
): Promise<string | null> {
  try {
    // Fetch the confirmed transaction
    const tx = await conn.getTransaction(txSig, { 
      maxSupportedTransactionVersion: 0, 
      commitment: "confirmed" 
    });
    
    if (!tx) {
      console.log(`Transaction ${txSig} not found`);
      return null;
    }

    // Extract account keys from the transaction message
    const msg = tx.transaction.message;
    let keys: string[];
    let instructions: any[];
    
    // Handle both legacy and versioned transactions
    if ('accountKeys' in msg) {
      // Legacy transaction
      keys = msg.accountKeys.map(k => k.toBase58());
      instructions = msg.instructions;
    } else {
      // Versioned transaction (V0) - use static account keys
      keys = msg.staticAccountKeys.map(k => k.toBase58());
      instructions = msg.compiledInstructions;
    }
    
    // Look for instructions invoking the CLMM program
    const clmmIxs = tx.meta?.innerInstructions?.flatMap(x => x.instructions) ?? [];
    const candidateMints = new Set<string>();

    // Scan through all instructions to find CLMM program invocations
    for (const ix of clmmIxs) {
      const prog = keys[ix.programIdIndex];
      if (prog === RAYDIUM_CLMM_PROGRAM_ID.toBase58()) {
        // Heuristic: the position mint is often one of the first few accounts in the open-position ix
        // Look at the first 8 account indices as potential position mints
        for (const ai of ix.accounts.slice(0, 8)) {
          if (ai < keys.length) {
            candidateMints.add(keys[ai]);
          }
        }
      }
    }

    // Also check the main transaction instructions
    for (const ix of instructions) {
      const prog = keys[ix.programIdIndex];
      if (prog === RAYDIUM_CLMM_PROGRAM_ID.toBase58()) {
        // Check main transaction accounts for position mints
        for (const ai of ix.accounts.slice(0, 8)) {
          if (ai < keys.length) {
            candidateMints.add(keys[ai]);
          }
        }
      }
    }

    console.log(`Found ${candidateMints.size} candidate mints from CLMM instructions`);

    // Cross-check candidates: must be a mint account owned by token program with decimals==0 (NFT)
    for (const mint of candidateMints) {
      try {
        const acc = await conn.getAccountInfo(new PublicKey(mint));
        if (!acc) continue;
        
        // Must be owned by token program
        if (!acc.owner.equals(TOKEN_PROGRAM_ID)) continue;
        
        // Quick check: token mint layout byte 44 is decimals (SPL)
        // Fetch parsed account info to be safe
        const parsed = await conn.getParsedAccountInfo(new PublicKey(mint));
        const parsedValue = parsed.value as any;
        
        if (parsedValue?.data?.parsed?.type === 'mint') {
          const decimals = parsedValue.data.parsed.info.decimals;
          if (decimals === 0) {
            console.log(`Found valid position NFT mint: ${mint}`);
            return mint;
          }
        }
      } catch (error) {
        console.warn(`Error checking candidate mint ${mint}:`, error);
        continue;
      }
    }

    console.log("No valid position NFT mint found in transaction instructions");

    // Fallback: scan owner's CLMM positions in the given pool, pick the newest not in DB
    if (opts?.wallet && opts?.poolId) {
      console.log(`Attempting fallback scan for wallet ${opts.wallet} in pool ${opts.poolId}`);
      try {
        // TODO: If Raydium SDK exposes an owner-positions-in-pool helper, call it here
        // For now, return null; client should send positionMint in context
        console.log("Fallback scanning not implemented - SDK helper needed");
      } catch (error) {
        console.warn("Fallback scanning failed:", error);
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing transaction for CLMM position mint:", error);
    return null;
  }
}

/**
 * Alternative method: scan for position mints by looking at token account changes
 * This can be useful when the instruction parsing approach doesn't work
 */
export async function findClmmPositionMintFromTokenChanges(
  conn: Connection, 
  txSig: string
): Promise<string | null> {
  try {
    const tx = await conn.getTransaction(txSig, { 
      maxSupportedTransactionVersion: 0, 
      commitment: "confirmed" 
    });
    
    if (!tx || !tx.meta) return null;

    // Look for token account changes that might indicate a new position NFT
    const preTokenBalances = tx.meta.preTokenBalances || [];
    const postTokenBalances = tx.meta.postTokenBalances || [];

    // Find new token accounts (present in post but not in pre)
    const preMints = new Set(preTokenBalances.map(b => b.mint));
    const newMints = postTokenBalances
      .filter(b => !preMints.has(b.mint))
      .map(b => b.mint);

    console.log(`Found ${newMints.length} new token mints in transaction`);

    // Check if any of the new mints are NFTs (decimals === 0)
    for (const mint of newMints) {
      try {
        const parsed = await conn.getParsedAccountInfo(new PublicKey(mint));
        const parsedValue = parsed.value as any;
        
        if (parsedValue?.data?.parsed?.type === 'mint') {
          const decimals = parsedValue.data.parsed.info.decimals;
          if (decimals === 0) {
            console.log(`Found new position NFT mint from token changes: ${mint}`);
            return mint;
          }
        }
      } catch (error) {
        console.warn(`Error checking new mint ${mint}:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error("Error parsing token changes for CLMM position mint:", error);
    return null;
  }
}

/**
 * Comprehensive method that tries multiple approaches to find the position mint
 */
export async function findClmmPositionMint(
  conn: Connection, 
  txSig: string, 
  opts?: { wallet?: string; poolId?: string }
): Promise<string | null> {
  console.log(`Searching for CLMM position mint in transaction: ${txSig}`);
  
  // Try instruction parsing first (most reliable)
  let positionMint = await findClmmPositionMintFromTx(conn, txSig, opts);
  if (positionMint) return positionMint;
  
  // Fallback to token account changes
  positionMint = await findClmmPositionMintFromTokenChanges(conn, txSig);
  if (positionMint) return positionMint;
  
  console.log("No position mint found using any method");
  return null;
}
