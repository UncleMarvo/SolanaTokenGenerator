import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Spinner } from "./ui/Spinner";

// Props interface for the UpgradePro component
interface UpgradeProProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
}

// Payment verification response type
interface PaymentVerificationResponse {
  ok: boolean;
  pro?: boolean;
  error?: string;
  message?: string;
}

export const UpgradePro: React.FC<UpgradeProProps> = ({
  isOpen,
  onClose,
  onUpgraded
}) => {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  
  // Local state management
  const [isLoading, setIsLoading] = useState(false);
  const [txSignature, setTxSignature] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "verifying" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  // Payment configuration from environment variables
  const feeWallet = process.env.NEXT_PUBLIC_FEE_WALLET || "";
  const feeAmountSOL = Number(process.env.NEXT_PUBLIC_PRO_FEE_SOL || 0);
  const feeAmountUSDC = Number(process.env.NEXT_PUBLIC_PRO_FEE_USDC || 0);

  // Handle copying fee wallet address to clipboard
  const handleCopyFeeAddress = async () => {
    try {
      await navigator.clipboard.writeText(feeWallet);
      // You could add a toast notification here
      console.log("Fee wallet address copied to clipboard");
    } catch (error) {
      console.error("Failed to copy address:", error);
    }
  };

  // Handle opening wallet for SOL transfer
  const handleOpenInWallet = async () => {
    if (!publicKey || !connection) {
      setErrorMessage("Wallet not connected");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");

      // Create a simple SOL transfer transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(feeWallet),
          lamports: feeAmountSOL * LAMPORTS_PER_SOL,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // Send transaction to wallet for signing
      const signature = await sendTransaction(transaction, connection);
      
      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      
      if (confirmation.value.err) {
        throw new Error("Transaction failed");
      }

      // Auto-fill the transaction signature
      setTxSignature(signature);
      setVerificationStatus("idle");
      
    } catch (error: any) {
      console.error("Transaction error:", error);
      setErrorMessage(error.message || "Failed to create transaction");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle payment verification
  const handleVerifyPayment = async () => {
    if (!txSignature.trim() || !publicKey) {
      setErrorMessage("Please enter a transaction signature");
      return;
    }

    try {
      setVerificationStatus("verifying");
      setErrorMessage("");

      const response = await fetch("/api/paywall/notify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          txSig: txSignature.trim()
        }),
      });

      const result: PaymentVerificationResponse = await response.json();

      if (result.ok && result.pro) {
        setVerificationStatus("success");
        // Call the upgrade callback
        if (onUpgraded) {
          onUpgraded();
        }
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setVerificationStatus("error");
        setErrorMessage(result.message || result.error || "Verification failed");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      setVerificationStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upgrade to Pro</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Payment Information */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Details</h3>
          
          {/* Fee Wallet Address */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fee Wallet Address
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={feeWallet}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyFeeAddress}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Payment Amounts */}
          <div className="grid grid-cols-2 gap-4">
            {feeAmountSOL > 0 && (
              <div className="text-center p-3 bg-green-50 rounded-md">
                <div className="text-lg font-bold text-green-800">{feeAmountSOL} SOL</div>
                <div className="text-sm text-green-600">Required</div>
              </div>
            )}
            {feeAmountUSDC > 0 && (
              <div className="text-center p-3 bg-blue-50 rounded-md">
                <div className="text-lg font-bold text-blue-800">{feeAmountUSDC} USDC</div>
                <div className="text-sm text-blue-600">Required</div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          {/* Open in Wallet Button */}
          <button
            onClick={handleOpenInWallet}
            disabled={isLoading || !publicKey}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <Spinner size={16} className="mr-2" />
                Creating Transaction...
              </>
            ) : (
              "Open in Wallet"
            )}
          </button>

          {/* Transaction Signature Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Signature
            </label>
            <input
              type="text"
              value={txSignature}
              onChange={(e) => setTxSignature(e.target.value)}
              placeholder="Enter transaction signature after payment"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Verify Payment Button */}
          <button
            onClick={handleVerifyPayment}
            disabled={verificationStatus === "verifying" || !txSignature.trim()}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {verificationStatus === "verifying" ? (
              <>
                <Spinner size={16} className="mr-2" />
                Verifying Payment...
              </>
            ) : (
              "I Paid – Verify"
            )}
          </button>
        </div>

        {/* Status Messages */}
        {verificationStatus === "success" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="text-green-800 font-medium">✅ Pro Access Granted!</div>
            <div className="text-green-600 text-sm">Your account has been upgraded successfully.</div>
          </div>
        )}

        {verificationStatus === "error" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-red-800 font-medium">❌ Verification Failed</div>
            <div className="text-red-600 text-sm">{errorMessage}</div>
          </div>
        )}

        {errorMessage && verificationStatus !== "success" && verificationStatus !== "error" && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-yellow-800 text-sm">{errorMessage}</div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <p className="font-medium mb-2">How to upgrade:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy the fee wallet address above</li>
            <li>Send {feeAmountSOL > 0 ? `${feeAmountSOL} SOL` : ""}{feeAmountSOL > 0 && feeAmountUSDC > 0 ? " or " : ""}{feeAmountUSDC > 0 ? `${feeAmountUSDC} USDC` : ""} to the fee wallet</li>
            <li>Copy the transaction signature from your wallet</li>
            <li>Paste it above and click "Verify"</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
