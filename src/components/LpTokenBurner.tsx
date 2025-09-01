import React, { FC, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { burnLpTokens } from "../lib/solanaToken";
import { notify } from "../utils/notifications";
import { ClipLoader } from "react-spinners";

interface LpTokenBurnerProps {
  lpMint: string;
  ownerTokenAccount: string;
  className?: string;
}

export const LpTokenBurner: FC<LpTokenBurnerProps> = ({ 
  lpMint, 
  ownerTokenAccount, 
  className = "" 
}) => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  
  const [isBurning, setIsBurning] = useState(false);
  const [showDangerModal, setShowDangerModal] = useState(false);
  const [burnAmount, setBurnAmount] = useState("");
  const [lastTxid, setLastTxid] = useState<string | null>(null);

  // Show danger confirmation modal
  const showBurnConfirmation = () => {
    if (!publicKey) {
      notify({
        type: "error",
        message: "Please connect your wallet first",
      });
      return;
    }
    setShowDangerModal(true);
  };

  // Execute LP token burn
  const executeBurn = async () => {
    if (!publicKey || !connection || !burnAmount) {
      notify({
        type: "error",
        message: "Invalid burn parameters",
      });
      return;
    }

    try {
      setIsBurning(true);
      setShowDangerModal(false);
      
      const lpMintPubkey = new PublicKey(lpMint);
      const ownerTokenAccountPubkey = new PublicKey(ownerTokenAccount);
      const amount = BigInt(burnAmount);

      // Create wallet adapter object
      const walletAdapter = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };

      // Burn LP tokens
      const { txid } = await burnLpTokens({
        connection,
        wallet: walletAdapter,
        lpMint: lpMint,
        ownerTokenAccount: ownerTokenAccount,
        amount,
      });

      setLastTxid(txid);
      
      notify({
        type: "success",
        message: "LP tokens burned successfully! 🔥",
        description: `${burnAmount} LP tokens have been permanently burned. This action is irreversible.`,
        txid,
      });
      
      // Reset form
      setBurnAmount("");
      
    } catch (error) {
      console.error("Error burning LP tokens:", error);
      notify({
        type: "error",
        message: "Failed to burn LP tokens",
        description: error.message,
      });
    } finally {
      setIsBurning(false);
    }
  };

  // Cancel burn operation
  const cancelBurn = () => {
    setShowDangerModal(false);
    setBurnAmount("");
  };

  return (
    <>
      {/* Main LP Burner Component */}
      <div className={`bg-error/10 border border-error/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-error rounded-full flex items-center justify-center">
              <span className="text-error text-lg">🔥</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-error font-semibold">Burn LP Tokens (Advanced)</h3>
            <p className="text-error/80 text-sm mb-3">
              <strong>⚠️ DANGER ZONE:</strong> This will permanently burn your LP tokens. 
              You will NEVER be able to remove liquidity from this pair.
            </p>
            
            <button
              onClick={showBurnConfirmation}
              disabled={!publicKey || isBurning}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                !publicKey || isBurning
                  ? "bg-muted/30 text-muted cursor-not-allowed"
                  : "bg-error hover:bg-error/80 text-error-content"
              }`}
            >
              {isBurning ? (
                <div className="flex items-center space-x-2">
                  <ClipLoader size={16} color="currentColor" />
                  <span>Burning...</span>
                </div>
              ) : !publicKey ? (
                "Connect Wallet"
              ) : (
                "Burn LP Tokens"
              )}
            </button>
            
            {/* Show last burn transaction */}
            {lastTxid && (
              <div className="mt-3 pt-3 border-t border-error/20">
                <div className="text-success/80 text-sm">
                  <div className="font-medium mb-1">Last Burn Transaction:</div>
                  <a
                    href={`https://solscan.io/tx/${lastTxid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-success/80 hover:text-success break-all"
                  >
                    {lastTxid.slice(0, 8)}...{lastTxid.slice(-8)}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Confirmation Modal */}
      {showDangerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg border border-error/30 rounded-lg p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-error text-3xl">🔥</span>
              </div>
              <h3 className="text-error text-xl font-bold mb-2">Confirm LP Token Burn</h3>
              <p className="text-muted text-sm">
                This action is <strong>IRREVERSIBLE</strong> and will permanently destroy your LP tokens.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-fg mb-2">
                  Amount to Burn
                </label>
                <input
                  type="number"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-3 py-2 border border-muted/30 rounded-lg bg-bg text-fg focus:outline-none focus:ring-2 focus:ring-error/50"
                  min="0"
                  step="0.000001"
                />
              </div>
              
              <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                <div className="text-error text-sm font-medium mb-1">⚠️ Final Warning</div>
                <ul className="text-error/80 text-xs space-y-1">
                  <li>• Your LP tokens will be permanently destroyed</li>
                  <li>• You will lose all liquidity in this trading pair</li>
                  <li>• This action cannot be undone</li>
                  <li>• Only proceed if you are absolutely certain</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={cancelBurn}
                className="flex-1 px-4 py-2 border border-muted/30 rounded-lg text-fg hover:bg-muted/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={executeBurn}
                disabled={!burnAmount || isBurning}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !burnAmount || isBurning
                    ? "bg-muted/30 text-muted cursor-not-allowed"
                    : "bg-error hover:bg-error/80 text-error-content"
                }`}
              >
                {isBurning ? (
                  <div className="flex items-center justify-center space-x-2">
                    <ClipLoader size={16} color="currentColor" />
                    <span>Burning...</span>
                  </div>
                ) : (
                  "Burn Forever 🔥"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
