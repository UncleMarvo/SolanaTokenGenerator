import { FC } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Info, DollarSign, Percent, Check, Star } from "lucide-react";

const PricingPage: FC = () => {
  const router = useRouter();
  
  // Get fee values from environment (with fallbacks)
  const flatFeeSol = process.env.NEXT_PUBLIC_LAUNCH_FLAT_FEE_SOL || "0.1";
  const skimBp = process.env.NEXT_PUBLIC_LAUNCH_SKIM_BP || "200";
  const skimPercent = (Number(skimBp) / 100).toFixed(1);

  return (
    <>
      <Head>
        <title>Pricing - Solana Token Creator</title>
        <meta
          name="description"
          content="Choose between Free and Pro tiers for your token creation needs"
        />
      </Head>

      <main className="section">
        <div className="container">
          <div>
            {/* Header */}
            <div className="mb-8 text-center">
              <h1 className="h1 text-fg mb-2">Choose Your Plan</h1>
              <p className="text-muted text-lg">
                Start free or go Pro for the complete launch experience
              </p>
            </div>

            {/* Pricing Tiers */}
            <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
              {/* Free Tier Card */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 hover:border-muted/20 transition-all duration-300 flex flex-col h-full">
                <div className="text-center mb-6">
                  <h3 className="h2 text-fg mb-2">Free</h3>
                  <p className="text-muted text-lg mb-4">Basic Token Creation</p>
                  <div className="text-4xl font-bold text-fg mb-2">Free</div>
                  <p className="text-muted text-sm">Perfect for getting started</p>
                </div>
                
                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Token minting on Solana</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Basic token metadata</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Token explorer link</span>
                  </div>
                </div>

                <button 
                  onClick={() => router.push('/create-token/free')}
                  className="btn btn-outline w-full py-3 text-center block"
                >
                  Get Started
                </button>
              </div>

              {/* Pro Tier Card */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-primary/30 hover:border-primary/50 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                {/* Most Popular Badge */}
                <div className="absolute top-4 right-4">
                  <div className="bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center space-x-1">
                    <Star size={12} />
                    <span>Most Popular</span>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h3 className="h2 text-fg mb-2">Pro</h3>
                  <p className="text-muted text-lg mb-4">Complete Launch Package</p>
                  <div className="text-4xl font-bold text-primary mb-2">{flatFeeSol} SOL</div>
                  <p className="text-muted text-sm">One-time payment, no subscriptions</p>
                </div>
                
                <div className="space-y-4 mb-8 flex-grow">
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Everything in Free</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Honest Launch verification</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">AI-powered Meme Kit</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Liquidity pool setup tools</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Professional share page</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="text-accent flex-shrink-0" size={20} />
                    <span className="text-fg">Token management dashboard</span>
                  </div>
                </div>

                <button 
                  onClick={() => router.push('/payment/pro')}
                  className="btn btn-primary w-full py-3 text-center block"
                >
                  Choose Pro
                </button>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-8">
              <h2 className="h2 text-fg mb-6 text-center">How It Works</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-info/20 p-2 rounded-lg flex-shrink-0 mt-1">
                    <Info className="text-info" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg mb-2">
                      1. Choose Your Token Type
                    </h3>
                    <p className="text-muted text-sm leading-relaxed">
                      Select Free for basic token creation, or Pro for enhanced features. Payment is per-token, not a subscription.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-info/20 p-2 rounded-lg flex-shrink-0 mt-1">
                    <Info className="text-info" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg mb-2">
                      2. Create Your Token
                    </h3>
                    <p className="text-muted text-sm leading-relaxed">
                      Free tokens: Create instantly with no payment. Pro tokens: Pay {flatFeeSol} SOL per token to unlock advanced features like Honest Launch verification, AI-powered Meme Kit, and liquidity tools.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-info/20 p-2 rounded-lg flex-shrink-0 mt-1">
                    <Info className="text-info" size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg mb-2">
                      3. Optional Liquidity
                    </h3>
                    <p className="text-muted text-sm leading-relaxed">
                      When you're ready to add liquidity, a small {skimPercent}% skim applies to support the platform. This is separate from the token creation fee and only charged if you use liquidity features.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Calculation */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-8">
              <h2 className="h2 text-fg mb-6 text-center">Example</h2>
              <div className="bg-muted/10 rounded-lg p-6">
                <p className="text-muted mb-4 text-center">
                  Create "DogeCoin 2.0" token:
                </p>
                <div className="pt-4 space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-fg">Free Token:</span>
                    <span className="text-fg font-mono">0 SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Basic token creation only</span>
                    <span className="text-fg font-mono"></span>
                  </div>
                </div>

                <div className="border-t border-muted/20 pt-4 space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-fg">Pro Token:</span>
                    <span className="text-fg font-mono">{flatFeeSol} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Token + Honest Launch + Meme Kit + Liquidity Tools</span>
                    <span className="text-fg font-mono"></span>
                  </div>
                </div>

                <div className="border-t border-muted/20 pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-fg">Optional Liquidity:</span>
                    <span className="text-fg">Later, if you add 1000 tokens + 100 USDC liquidity</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">
                      Token A Skim ({skimPercent}%):
                    </span>
                    <span className="text-fg">
                      {(((Number(skimBp) / 100) / 100) * 1000)} TOKEN
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">
                      Token B Skim ({skimPercent}%):
                    </span>
                    <span className="text-fg">{(((Number(skimBp) / 100) / 100) * 100)} USDC</span>
                  </div>
                  <div className="pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted">
                        Actual Liquidity Added:
                      </span>
                      <span className="text-fg">
                        {1000 - (((Number(skimBp) / 100) / 100) * 1000)} TOKEN +{" "}
                        {100 - (((Number(skimBp) / 100) / 100) * 100)} USDC
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="text-center">
              <div className="flex justify-center space-x-4">
                <button 
                  onClick={() => router.push('/create-token/free')}
                  className="btn btn-outline py-3 px-8"
                >
                  Start Free
                </button>
                <button 
                  onClick={() => router.push('/payment/pro')}
                  className="btn btn-primary py-3 px-8"
                >
                  Go Pro
                </button>
              </div>
              <p className="text-muted text-sm mt-3">
                Choose your tier and start building your token today
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

export default PricingPage;
