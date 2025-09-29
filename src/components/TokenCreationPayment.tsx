import React, { useState, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { TOKEN_CREATION_TYPES, getPriceInLamports } from "../lib/tokenPricing";
import { notify } from "../utils/notifications";
import { ClipLoader } from "react-spinners";

interface TokenCreationPaymentProps {
  tokenType: 'free' | 'pro';
  onPaymentComplete: (txSig: string) => void;
  onPaymentError: (error: string) => void;
  disabled?: boolean;
}

export const TokenCreationPayment: React.FC<TokenCreationPaymentProps> = ({
  tokenType,
  onPaymentComplete,
  onPaymentError,
  disabled = false
}) => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle payment for Pro tokens
  const handleProPayment = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      onPaymentError("Wallet not connected");
      return;
    }

    if (tokenType !== 'pro') {
      onPaymentError("Invalid token type for payment");
      return;
    }

    setIsProcessing(true);

    try {
      const requiredAmount = TOKEN_CREATION_TYPES.pro.price;
      const requiredLamports = getPriceInLamports('pro');
      
      // Get fee wallet from environment
      const feeWallet = new PublicKey(process.env.NEXT_PUBLIC_FEE_WALLET!);
      
      // Create payment transaction
      const paymentTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: feeWallet,
          lamports: requiredLamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      paymentTransaction.recentBlockhash = blockhash;
      paymentTransaction.feePayer = publicKey;

      // Send transaction
      const signature = await sendTransaction(paymentTransaction, connection);
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
      
      notify({
        type: "success",
        message: `Payment of ${requiredAmount} SOL completed successfully`,
        txid: signature,
      });

      onPaymentComplete(signature);
    } catch (error: any) {
      console.error("Payment error:", error);
      onPaymentError(error.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection, tokenType, onPaymentComplete, onPaymentError]);

  // Handle free token creation (no payment needed)
  const handleFreeCreation = useCallback(() => {
    onPaymentComplete("FREE_TOKEN_CREATION");
  }, [onPaymentComplete]);

  if (tokenType === 'free') {
    return (
      <div className="text-center">
        <button
          onClick={handleFreeCreation}
          disabled={disabled || isProcessing}
          className="btn btn-outline w-full py-3"
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <ClipLoader size={16} color="currentColor" />
              <span>Processing...</span>
            </div>
          ) : (
            "Create Free Token"
          )}
        </button>
        <p className="text-xs text-muted mt-2">
          No payment required for free token creation
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-fg">Pro Token Payment</h4>
            <p className="text-sm text-muted">
              Pay {TOKEN_CREATION_TYPES.pro.price} SOL to unlock Pro features
            </p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">
              {TOKEN_CREATION_TYPES.pro.price} SOL
            </div>
            <p className="text-xs text-muted">Per token</p>
          </div>
        </div>
      </div>

      <button
        onClick={handleProPayment}
        disabled={disabled || isProcessing}
        className="btn btn-primary w-full py-3"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center space-x-2">
            <ClipLoader size={16} color="currentColor" />
            <span>Processing Payment...</span>
          </div>
        ) : (
          `Pay ${TOKEN_CREATION_TYPES.pro.price} SOL & Create Pro Token`
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-muted">
          Payment will be processed securely on-chain
        </p>
      </div>
    </div>
  );
};
