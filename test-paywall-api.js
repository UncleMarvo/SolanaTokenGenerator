// Test script for the paywall notification API
// Usage: node test-paywall-api.js

const testPaywallAPI = async () => {
  const testData = {
    wallet: "test_wallet_address_here",
    txSig: "test_transaction_signature_here"
  };

  try {
    const response = await fetch('http://localhost:3000/api/paywall/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testPaywallAPI();
}

module.exports = { testPaywallAPI };
