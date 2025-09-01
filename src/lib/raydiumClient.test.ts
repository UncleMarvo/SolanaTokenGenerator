// Simple test for Raydium client functionality
import { getRaydiumQuote } from './raydiumClient';

async function testRaydiumQuote() {
  try {
    // Test with a valid token mint (SOL)
    const testRequest = {
      tokenMint: 'So11111111111111111111111111111111111111112', // SOL
      baseAmount: '1000000000', // 1 SOL (9 decimals)
      quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
    };

    console.log('Testing Raydium quote...');
    const quote = await getRaydiumQuote(testRequest);
    console.log('Quote result:', quote);

    // Verify the response structure
    const requiredFields = ['pool', 'priceImpact', 'lpFee', 'expectedLpTokens', 'minOut'];
    const hasAllFields = requiredFields.every(field => field in quote);
    
    if (hasAllFields) {
      console.log('✅ Raydium client test passed!');
    } else {
      console.log('❌ Raydium client test failed - missing fields');
    }

  } catch (error) {
    console.error('❌ Raydium client test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testRaydiumQuote();
}

export { testRaydiumQuote };

