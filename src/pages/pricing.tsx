import { FC } from "react";
import Head from "next/head";
import Link from "next/link";
import { ArrowLeft, Info, DollarSign, Percent } from "lucide-react";

const PricingPage: FC = () => {
  // Get fee values from environment (with fallbacks)
  const flatFeeSol = process.env.NEXT_PUBLIC_LAUNCH_FLAT_FEE_SOL || "0.02";
  const skimBp = process.env.NEXT_PUBLIC_LAUNCH_SKIM_BP || "200";
  const skimPercent = (Number(skimBp) / 100).toFixed(1);

  return (
    <>
      <Head>
        <title>Platform Fees - Solana Token Creator</title>
        <meta name="description" content="Transparent platform fees for liquidity provision" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-bg via-bg/95 to-bg/90">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/liquidity">
              <a className="inline-flex items-center space-x-2 text-muted hover:text-fg transition-colors mb-4">
                <ArrowLeft size={20} />
                <span>Back to Liquidity</span>
              </a>
            </Link>
            <h1 className="text-4xl font-bold text-fg mb-2">Platform Fees</h1>
            <p className="text-muted text-lg">
              Transparent pricing for liquidity provision services
            </p>
          </div>

          {/* Fee Structure */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Flat Fee Card */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-primary/20 p-3 rounded-lg">
                  <DollarSign className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-fg">Flat Fee</h3>
                  <p className="text-muted text-sm">One-time charge per transaction</p>
                </div>
              </div>
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-primary mb-2">
                  {flatFeeSol} SOL
                </div>
                <p className="text-muted text-sm">
                  Charged upfront when building liquidity transactions
                </p>
              </div>
              <div className="bg-muted/10 rounded-lg p-3">
                <p className="text-xs text-muted">
                  This fee covers transaction building, pool discovery, and platform infrastructure costs.
                </p>
              </div>
            </div>

            {/* Skim Fee Card */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-accent/20 p-3 rounded-lg">
                  <Percent className="text-accent" size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-fg">Liquidity Skim</h3>
                  <p className="text-muted text-sm">Percentage of provided liquidity</p>
                </div>
              </div>
              <div className="text-center py-4">
                <div className="text-3xl font-bold text-accent mb-2">
                  {skimPercent}%
                </div>
                <p className="text-muted text-sm">
                  Applied to both token sides (A & B)
                </p>
              </div>
              <div className="bg-muted/10 rounded-lg p-3">
                <p className="text-xs text-muted">
                  A small percentage is skimmed from your liquidity provision to support platform development.
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-8">
            <h2 className="text-2xl font-bold text-fg mb-6">How Platform Fees Work</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-info/20 p-2 rounded-lg flex-shrink-0 mt-1">
                  <Info className="text-info" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-2">1. Flat SOL Fee</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    When you commit to adding liquidity, a flat fee of {flatFeeSol} SOL is charged upfront. 
                    This covers the cost of building your transaction, discovering the best pools, and 
                    maintaining the platform infrastructure.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-info/20 p-2 rounded-lg flex-shrink-0 mt-1">
                  <Info className="text-info" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-2">2. Liquidity Skim</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    A {skimPercent}% skim is applied to both sides of your liquidity provision. 
                    For example, if you provide 1000 TOKEN and 100 USDC, {skimPercent} TOKEN and 
                    {skimPercent} USDC will be skimmed. The remaining {100 - Number(skimPercent)}% 
                    goes into the actual liquidity position.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="bg-info/20 p-2 rounded-lg flex-shrink-0 mt-1">
                  <Info className="text-info" size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-fg mb-2">3. Transparent Tracking</h3>
                  <p className="text-muted text-sm leading-relaxed">
                    All fees are clearly displayed before you confirm your transaction. After completion, 
                    fee details are recorded in our system for transparency and admin tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-8">
            <h2 className="text-2xl font-bold text-fg mb-6">Fee Example</h2>
            <div className="bg-muted/10 rounded-lg p-6">
              <p className="text-muted mb-4">Let's say you want to add liquidity with:</p>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted">Token A (Your Token):</span>
                  <span className="text-fg font-mono">1,000 TOKEN</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Token B (USDC):</span>
                  <span className="text-fg font-mono">100 USDC</span>
                </div>
              </div>

              <div className="border-t border-muted/20 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Flat Fee:</span>
                  <span className="text-fg">{flatFeeSol} SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Token A Skim ({skimPercent}%):</span>
                  <span className="text-fg">{Number(skimBp) / 100} TOKEN</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Token B Skim ({skimPercent}%):</span>
                  <span className="text-fg">{Number(skimBp) / 100} USDC</span>
                </div>
                <div className="border-t border-muted/20 pt-2">
                  <div className="flex justify-between font-semibold">
                    <span className="text-muted">Actual Liquidity Added:</span>
                    <span className="text-fg">{1000 - Number(skimBp) / 100} TOKEN + {100 - Number(skimBp) / 100} USDC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <Link href="/liquidity">
              <a className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-600 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300">
                <span>Start Adding Liquidity</span>
              </a>
            </Link>
            <p className="text-muted text-sm mt-3">
              All fees are clearly displayed before you confirm your transaction
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default PricingPage;
