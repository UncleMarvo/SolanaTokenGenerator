import React, { FC, useCallback, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { notify } from "../../utils/notifications";
import { normalizeError } from "../../lib/errors";
import { retryWithBackoff } from "../../lib/confirmRetry";
import { withRpc } from "../../lib/rpc";
import { ClipLoader } from "react-spinners";
import { useNetworkConfiguration } from "contexts/NetworkConfigurationProvider";
import { TOKEN_CREATION_TYPES, getPriceInLamports } from "../../lib/tokenPricing";

import { ArrowLeft, Star, Check, Zap, Shield, Sparkles } from "lucide-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/router";

interface ProPaymentPageProps {}

export const ProPaymentPage: FC<ProPaymentPageProps> = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { networkConfiguration } = useNetworkConfiguration();
  const router = useRouter();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentTxSig, setPaymentTxSig] = useState<string | null>(null);

  // Handle Pro payment
  const handleProPayment = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      notify({
        type: "error",
        message: "Wallet not connected",
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
      
      setPaymentTxSig(signature);
      
      notify({
        type: "success",
        message: `Payment of ${requiredAmount} SOL completed successfully`,
        txid: signature,
      });

      // Store payment info in session/localStorage for Pro token creation
      const paymentInfo = {
        txSig: signature,
        amount: requiredAmount,
        timestamp: Date.now(),
        tokenType: 'pro'
      };
      
      localStorage.setItem('pro_token_payment', JSON.stringify(paymentInfo));

      // Redirect to Pro token creation page
      setTimeout(() => {
        router.push('/create-token/pro');
      }, 2000);

    } catch (error: any) {
      console.error("Payment error:", error);
      notify({
        type: "error",
        message: normalizeError(error).message,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [connection, publicKey, sendTransaction, router]);

  const proFeatures = [
    {
      icon: Shield,
      title: "Honest Launch Enforcement",
      description: "Automatic mint & freeze authority revocation for transparency"
    },
    {
      icon: Sparkles,
      title: "AI Meme Kit Generation",
      description: "AI-powered logo, headers, and social media assets"
    },
    {
      icon: Zap,
      title: "Liquidity Pool Setup",
      description: "Automated liquidity pool creation on Orca and Raydium"
    },
    {
      icon: Star,
      title: "Enhanced Share Page",
      description: "Premium branding with custom themes and layouts"
    }
  ];

  if (paymentTxSig) {
    return (
      <>
        <Head>
          <title>Payment Successful | Solana Token Creator</title>
          <meta
            name="description"
            content="Pro token creation payment completed successfully"
          />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
          {/* Header */}
          <div className="border-b border-muted/10 bg-bg/40 backdrop-blur-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <div className="flex items-center space-x-4">
                <Link href="/pricing">
                  <a className="flex items-center space-x-2 text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                    <span>Back to Pricing</span>
                  </a>
                </Link>
                  <div className="h-6 w-px bg-muted/20" />
                  <h1 className="text-xl font-semibold text-fg">
                    Payment Successful
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Success Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-success/20 rounded-full flex items-center justify-center">
                <Check className="text-success" size={40} />
              </div>
              
              <h1 className="text-4xl font-bold text-fg mb-4">
                Payment Completed!
              </h1>
              
              <p className="text-xl text-muted mb-8">
                Your Pro token creation payment of {TOKEN_CREATION_TYPES.pro.price} SOL has been processed successfully.
              </p>

              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-success/20 mb-8">
                <h3 className="text-lg font-semibold text-fg mb-4">Transaction Details</h3>
                <div className="space-y-2 text-left">
                  <div className="flex justify-between">
                    <span className="text-muted">Amount:</span>
                    <span className="text-fg font-semibold">{TOKEN_CREATION_TYPES.pro.price} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Token Type:</span>
                    <span className="text-primary font-semibold">Pro</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Transaction ID:</span>
                    <span className="text-fg font-mono text-sm break-all">{paymentTxSig}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center space-x-3 text-muted">
                <ClipLoader size={16} color="currentColor" />
                <span>Redirecting to Pro token creation...</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Pro Token Creation - Payment | Solana Token Creator</title>
        <meta
          name="description"
          content="Complete your Pro token creation payment to unlock advanced features"
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Header */}
        <div className="border-b border-muted/10 bg-bg/40 backdrop-blur-2xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/pricing">
                  <a className="flex items-center space-x-2 text-muted hover:text-fg transition-colors">
                    <ArrowLeft size={20} />
                    <span>Back to Pricing</span>
                  </a>
                </Link>
                <div className="h-6 w-px bg-muted/20" />
                <h1 className="text-xl font-semibold text-fg">
                  Pro Token Creation - Payment
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <WalletMultiButton className="wallet-adapter-button" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Side - Payment Info */}
            <div className="space-y-8">
              {/* Payment Summary */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-primary/30">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/20 rounded-full flex items-center justify-center">
                    <Star className="text-primary" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-fg mb-2">Pro Token Creation</h2>
                  <p className="text-muted">Unlock advanced features for your token launch</p>
                </div>

                <div className="text-center mb-6">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {TOKEN_CREATION_TYPES.pro.price} SOL
                  </div>
                  <p className="text-muted">One-time payment per token creation</p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <span className="text-fg font-medium">Payment Amount</span>
                    <span className="text-primary font-bold">{TOKEN_CREATION_TYPES.pro.price} SOL</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                    <span className="text-fg font-medium">Network Fee</span>
                    <span className="text-muted">~0.001 SOL</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border-t border-primary/20">
                    <span className="text-fg font-semibold">Total</span>
                    <span className="text-primary font-bold">~{TOKEN_CREATION_TYPES.pro.price + 0.001} SOL</span>
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                {!publicKey ? (
                  <div className="text-center">
                    <p className="text-muted mb-4">Connect your wallet to proceed with payment</p>
                    <WalletMultiButton className="wallet-adapter-button mx-auto" />
                  </div>
                ) : (
                  <button
                    onClick={handleProPayment}
                    disabled={isProcessing}
                    className="w-full btn btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center space-x-3">
                        <ClipLoader size={20} color="currentColor" />
                        <span>Processing Payment...</span>
                      </div>
                    ) : (
                      `Pay ${TOKEN_CREATION_TYPES.pro.price} SOL for Pro Features`
                    )}
                  </button>
                )}
                
                <p className="text-center text-sm text-muted mt-4">
                  Secure payment processed on Solana blockchain
                </p>
              </div>

              {/* Security Notice */}
              <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-info text-xs">i</span>
                  </div>
                  <div>
                    <h5 className="font-medium text-fg text-sm mb-1">Secure Payment</h5>
                    <p className="text-xs text-muted leading-relaxed">
                      Your payment is processed directly on the Solana blockchain. 
                      No sensitive information is stored on our servers. 
                      Transaction is verified on-chain for complete transparency.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Pro Features */}
            <div className="space-y-6">
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                <h3 className="text-xl font-semibold text-fg mb-6">Pro Features Included</h3>
                
                <div className="space-y-6">
                  {proFeatures.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="text-primary" size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-fg mb-1">{feature.title}</h4>
                          <p className="text-sm text-muted leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg">
                  <h4 className="font-semibold text-fg mb-2">What happens next?</h4>
                  <ol className="text-sm text-muted space-y-1">
                    <li>1. Complete payment to unlock Pro features</li>
                    <li>2. Create your token with advanced options</li>
                    <li>3. Access liquidity tools and enhanced branding</li>
                    <li>4. Launch with confidence using Pro features</li>
                  </ol>
                </div>
              </div>

              {/* Comparison */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
                <h3 className="text-lg font-semibold text-fg mb-4">Free vs Pro Comparison</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Basic Token Creation</span>
                    <div className="flex space-x-2">
                      <Check className="text-success" size={16} />
                      <Check className="text-success" size={16} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Honest Launch Enforcement</span>
                    <div className="flex space-x-2">
                      <span className="text-muted">✗</span>
                      <Check className="text-success" size={16} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">AI Meme Kit Generation</span>
                    <div className="flex space-x-2">
                      <span className="text-muted">✗</span>
                      <Check className="text-success" size={16} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Liquidity Pool Setup</span>
                    <div className="flex space-x-2">
                      <span className="text-muted">✗</span>
                      <Check className="text-success" size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProPaymentPage;
