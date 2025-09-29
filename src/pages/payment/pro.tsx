import React, { FC, useState, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { createPaymentSession, storePaymentSession } from "../../lib/paymentSession";
import { TOKEN_CREATION_TYPES, getPriceInLamports } from "../../lib/tokenPricing";
import { ClipLoader } from "react-spinners";
import { ArrowLeft, CreditCard, Shield, Zap } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

interface ProPaymentPageProps {}

export const ProPaymentPage: FC<ProPaymentPageProps> = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // Handle Pro payment
  const handleProPayment = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      notify({
        type: "error",
        message: "Please connect your wallet first"
      });
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
      
      // Create payment session
      const paymentSession = createPaymentSession(signature, requiredAmount);
      storePaymentSession(paymentSession);
      
      notify({
        type: "success",
        message: `Payment of ${requiredAmount} SOL completed successfully`,
        txid: signature,
      });

      // Redirect to Pro token creation
      router.push('/create-token/pro');
    } catch (error: any) {
      console.error("Payment error:", error);
      notify({
        type: "error",
        message: error.message || "Payment failed"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection, router]);

  return (
    <>
      <Head>
        <title>Pro Token Payment - Solana Token Creator</title>
      </Head>
      
      <div className="min-h-screen bg-bg text-fg">
        <div className="section">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <button
                onClick={() => router.back()}
                className="inline-flex items-center text-muted hover:text-fg transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </button>
              
              <h1 className="h1 mb-4">Pro Token Payment</h1>
              <p className="text-muted text-lg">
                Pay 0.1 SOL to create a Pro token with advanced features
              </p>
            </div>

            {/* Payment Card */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
              <div className="space-y-6">
                {/* Wallet Connection */}
                {!publicKey ? (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
                      <CreditCard className="w-8 h-8 text-muted" />
                    </div>
                    <h3 className="text-xl font-semibold">Connect Wallet to Pay</h3>
                    <p className="text-muted">Connect your wallet to proceed with payment</p>
                    <WalletMultiButton className="btn btn-primary mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Payment Details */}
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Payment Details</h3>
                        <div className="flex items-center text-primary">
                          <Shield className="w-5 h-5 mr-2" />
                          <span className="text-sm font-medium">Secure</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted">Pro Token Creation</span>
                          <span className="font-semibold">0.1 SOL</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Network Fee</span>
                          <span className="font-semibold">~0.000005 SOL</span>
                        </div>
                        <div className="border-t border-muted/20 pt-3">
                          <div className="flex justify-between text-lg font-bold">
                            <span>Total</span>
                            <span className="text-primary">0.1 SOL</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pro Features */}
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center">
                        <Zap className="w-5 h-5 mr-2 text-primary" />
                        Pro Features Included
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-success">✨</span>
                          <span className="text-sm">AI Meme Kit Generation</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-success">✨</span>
                          <span className="text-sm">Advanced Marketing Tools</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-success">✨</span>
                          <span className="text-sm">Professional Templates</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-success">✨</span>
                          <span className="text-sm">Enhanced Analytics</span>
                        </div>
                      </div>
                    </div>

                    {/* Payment Button */}
                    <button
                      onClick={handleProPayment}
                      disabled={isProcessing}
                      className="w-full bg-primary hover:bg-primary/80 text-bg font-bold py-4 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <ClipLoader size={20} color="currentColor" />
                          <span>Processing Payment...</span>
                        </div>
                      ) : (
                        "Pay 0.1 SOL & Create Pro Token"
                      )}
                    </button>

                    {/* Security Notice */}
                    <div className="text-center">
                      <p className="text-xs text-muted">
                        Payment is processed securely on-chain. No personal data is stored.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProPaymentPage;