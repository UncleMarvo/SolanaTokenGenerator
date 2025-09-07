import React, { useState } from 'react';
import { Connection, Transaction, PublicKey } from '@solana/web3.js';
import { useSendSolanaTx } from '../hooks/useSendSolanaTx';

/**
 * Test component to demonstrate the useSendSolanaTx hook functionality
 * This component shows how the hook prevents double-invokes and manages transaction phases
 */
export const TransactionTest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Initialize connection and hook
  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
  );
  const { sendTx, phase, isInFlight } = useSendSolanaTx(connection);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testDoubleInvoke = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    addResult("Starting double-invoke test...");

    // Create mock transaction and wallet
    const mockTx = new Transaction();
    const mockPublicKey = new PublicKey("11111111111111111111111111111111");
    const mockWallet = {
      publicKey: mockPublicKey,
      signTransaction: async (tx: Transaction) => {
        addResult("Wallet signing transaction...");
        // Simulate signing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return tx;
      }
    };

    try {
      // Start first transaction
      addResult("Starting first transaction...");
      const firstTxPromise = sendTx({
        tx: mockTx,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet
      });

      // Immediately try to start second transaction (should be blocked)
      addResult("Attempting second transaction (should be blocked)...");
      const secondTxResult = await sendTx({
        tx: mockTx,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet
      });

      if (!secondTxResult.ok && secondTxResult.error === 'Busy') {
        addResult("✅ Second transaction correctly blocked - double-invoke prevention working!");
      } else {
        addResult("❌ Second transaction was not blocked - double-invoke prevention failed!");
      }

      // Wait for first transaction to complete
      const firstTxResult = await firstTxPromise;
      if (firstTxResult.ok) {
        addResult("✅ First transaction completed successfully");
      } else {
        addResult(`❌ First transaction failed: ${firstTxResult.error}`);
      }

    } catch (error) {
      addResult(`❌ Test error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testPhaseTracking = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setTestResults([]);
    addResult("Starting phase tracking test...");

    const mockTx = new Transaction();
    const mockPublicKey = new PublicKey("11111111111111111111111111111111");
    const mockWallet = {
      publicKey: mockPublicKey,
      signTransaction: async (tx: Transaction) => {
        addResult(`Phase: ${phase} - Wallet signing...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        return tx;
      }
    };

    try {
      addResult(`Initial phase: ${phase}`);
      
      const txPromise = sendTx({
        tx: mockTx,
        walletPublicKey: mockPublicKey,
        wallet: mockWallet
      });

      // Monitor phases during execution
      const phaseMonitor = setInterval(() => {
        addResult(`Current phase: ${phase}, InFlight: ${isInFlight}`);
      }, 200);

      const result = await txPromise;
      
      clearInterval(phaseMonitor);
      
      if (result.ok) {
        addResult("✅ Transaction completed successfully");
      } else {
        addResult(`❌ Transaction failed: ${result.error}`);
      }
      
      addResult(`Final phase: ${phase}`);

    } catch (error) {
      addResult(`❌ Test error: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Transaction Hook Test</h2>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Current Phase: <span className="font-mono">{phase}</span> | 
          In Flight: <span className="font-mono">{isInFlight ? 'Yes' : 'No'}</span>
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <button
          onClick={testDoubleInvoke}
          disabled={isRunning || isInFlight}
          className="btn btn-primary disabled:opacity-50"
        >
          Test Double-Invoke Prevention
        </button>
        
        <button
          onClick={testPhaseTracking}
          disabled={isRunning || isInFlight}
          className="btn btn-secondary disabled:opacity-50"
        >
          Test Phase Tracking
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="font-bold mb-2">Test Results:</h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500">No tests run yet</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-bold text-blue-800 mb-2">Expected Behavior:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Double-invoke test should block the second transaction</li>
          <li>• Phase tracking should show: idle → signing → sending → confirming → idle</li>
          <li>• Buttons should be disabled during transaction processing</li>
          <li>• No "Oe" errors should occur when double-clicking</li>
        </ul>
      </div>
    </div>
  );
};
