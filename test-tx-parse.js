#!/usr/bin/env node

/**
 * Test script for transaction parsing functionality
 * Usage: node test-tx-parse.js <transaction_signature>
 */

const { Connection, PublicKey } = require("@solana/web3.js");
const { findClmmPositionMint } = require("./src/lib/txParse");

async function testTransactionParsing() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log("Usage: node test-tx-parse.js <transaction_signature>");
    console.log("Example: node test-tx-parse.js 5J7X8K2nH1...");
    process.exit(1);
  }
  
  const txSig = args[0];
  console.log(`Testing transaction parsing for: ${txSig}`);
  
  try {
    // Create connection to mainnet
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
    );
    
    console.log("🔍 Searching for CLMM position mint...");
    
    // Test the transaction parsing
    const positionMint = await findClmmPositionMint(connection, txSig, {
      wallet: "test-wallet", // Optional for testing
      poolId: "test-pool"    // Optional for testing
    });
    
    if (positionMint) {
      console.log(`✅ Found position mint: ${positionMint}`);
      console.log(`🔗 Solscan: https://solscan.io/account/${positionMint}`);
    } else {
      console.log("❌ No position mint found");
      console.log("This could mean:");
      console.log("- The transaction is not a CLMM operation");
      console.log("- The position mint couldn't be extracted");
      console.log("- The transaction format is not supported");
    }
    
  } catch (error) {
    console.error("❌ Error testing transaction parsing:", error);
    process.exit(1);
  }
}

// Run the test
testTransactionParsing().catch(console.error);
