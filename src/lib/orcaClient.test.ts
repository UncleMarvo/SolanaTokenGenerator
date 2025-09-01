// Simple test for Orca client functionality
import { getOrcaQuote } from './orcaClient';

async function testOrcaQuote() {
  try {
    // Test with a valid token mint (SOL)
    const testRequest = {
      tokenMint: 'So11111111111111111111111111111111111111112', // SOL
      baseAmount: '1000000000', // 1 SOL (9 decimals)
      quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' // USDC
    };

    console.log('Testing Orca quote...');
    const quote = await getOrcaQuote(testRequest);
    console.log('Quote result:', quote);

    // Verify the response structure
    const requiredFields = ['pool', 'priceImpact', 'lpFee', 'expectedLpTokens', 'minOut'];
    const hasAllFields = requiredFields.every(field => field in quote);
    
    if (hasAllFields) {
      console.log('✅ Orca client test passed!');
    } else {
      console.log('❌ Orca client test failed - missing fields');
    }

  } catch (error) {
    console.error('❌ Orca client test failed:', error);
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testOrcaQuote();
}

export { testOrcaQuote };
