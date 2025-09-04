"use client";

import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface AdminLoginProps {
  onLogin: (token: string, wallet: string) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
}

export default function AdminLogin({ onLogin, onLogout, isLoggedIn }: AdminLoginProps) {
  const { publicKey, signMessage } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState<string | null>(null);
  const [step, setStep] = useState<'connect' | 'sign' | 'complete'>('connect');

  // Reset state when wallet changes
  useEffect(() => {
    if (publicKey) {
      setStep('sign');
      setError(null);
      generateNonce();
    } else {
      setStep('connect');
      setNonce(null);
    }
  }, [publicKey]);

  // Generate authentication nonce
  const generateNonce = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNonce(data.nonce);
      } else {
        setError(data.error || 'Failed to generate nonce');
      }
    } catch (err) {
      setError('Network error while generating nonce');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign message and authenticate
  const signAndAuthenticate = async () => {
    if (!publicKey || !nonce || !signMessage) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create message to sign
      const message = new TextEncoder().encode(nonce);
      
      // Sign the message
      const signature = await signMessage(message);
      
      // Verify signature with backend
      const response = await fetch('/api/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          nonce,
          signature: Buffer.from(signature).toString('hex')
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStep('complete');
        onLogin(data.token, data.wallet);
        setError(null);
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('Failed to sign message or authenticate');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch (err) {
      // Ignore logout errors
    }
    onLogout();
    setStep('connect');
    setNonce(null);
    setError(null);
  };

  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex-1">
          <p className="text-sm text-green-800">
            <span className="font-medium">Admin Access Granted</span>
            <br />
            <span className="text-xs">Session active</span>
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900">Admin Authentication</h3>
        <p className="text-sm text-gray-600 mt-1">
          Connect your wallet to access admin features
        </p>
      </div>

      {step === 'connect' && (
        <div className="text-center">
          <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700" />
          <p className="text-xs text-gray-500 mt-2">
            Only whitelisted admin wallets can access this area
          </p>
        </div>
      )}

      {step === 'sign' && nonce && (
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Step 2:</span> Sign the authentication message
            </p>
            <p className="text-xs text-blue-600 mt-1 font-mono break-all">
              {nonce}
            </p>
          </div>
          
          <button
            onClick={signAndAuthenticate}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing...' : 'Sign & Authenticate'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        <p>This authentication uses your wallet signature to verify admin access.</p>
        <p>No private keys are transmitted or stored.</p>
      </div>
    </div>
  );
}
