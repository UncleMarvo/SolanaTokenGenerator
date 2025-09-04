import { FC } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useLiquidityWizard } from "../hooks/useLiquidityWizard";
import { AiOutlineClose } from "react-icons/ai";
import { Spinner } from "../components/ui/Spinner";
import { ErrorDisplay } from "../components/ui/ErrorDisplay";

const LiquidityPage: FC = () => {
  const router = useRouter();
  const {
    currentStep,
    form,
    quote,
    errorMsg,
    isLoading,
    isCommitting,
    showConfirmModal,
    commitResult,
    updateForm,
    nextStep,
    prevStep,
    getQuote,
    commitLiquidity,
    setShowConfirmModal,
    resetWizard,
    goBackFromQuote
  } = useLiquidityWizard();

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-4">Step 1: Choose DEX</h3>
        <div className="space-y-3">
          <label className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
            isLoading 
              ? "opacity-50 cursor-not-allowed" 
              : "cursor-pointer"
          } ${
            form.dex === "Raydium" 
              ? "bg-primary/5 border border-primary/20" 
              : "hover:bg-muted/20"
          }`}>
            <input
              type="radio"
              name="dex"
              value="Raydium"
              checked={form.dex === "Raydium"}
              onChange={(e) => updateForm("dex", e.target.value)}
              disabled={isLoading}
              className="text-primary focus:ring-primary w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-fg font-medium">Raydium</span>
          </label>
          <label className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
            isLoading 
              ? "opacity-50 cursor-not-allowed" 
              : "cursor-pointer"
          } ${
            form.dex === "Orca" 
              ? "bg-accent/5 border border-accent/20" 
              : "hover:bg-muted/20"
          }`}>
            <input
              type="radio"
              name="dex"
              value="Orca"
              checked={form.dex === "Orca"}
              onChange={(e) => updateForm("dex", e.target.value)}
              disabled={isLoading}
              className="text-primary focus:ring-primary w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-fg font-medium">Orca</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-muted mb-2 font-semibold">
          Token Mint Address
        </label>
        <input
          type="text"
          value={form.tokenMint}
          onChange={(e) => updateForm("tokenMint", e.target.value)}
          disabled={isLoading}
          className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="Enter token mint address"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={nextStep}
          disabled={!form.tokenMint || isLoading}
          className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-4">Step 2: Select Pair</h3>
        <div className="space-y-3">
          <label className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
            isLoading 
              ? "opacity-50 cursor-not-allowed" 
              : "cursor-pointer"
          } ${
            form.pair === "SOL/TOKEN" 
              ? "bg-primary/5 border border-primary/20" 
              : "hover:bg-muted/20"
          }`}>
            <input
              type="radio"
              name="pair"
              value="SOL/TOKEN"
              checked={form.pair === "SOL/TOKEN"}
              onChange={(e) => updateForm("pair", e.target.value)}
              disabled={isLoading}
              className="text-primary focus:ring-primary w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-fg font-medium">SOL/TOKEN</span>
          </label>
          <label className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
            isLoading 
              ? "opacity-50 cursor-not-allowed" 
              : "cursor-pointer"
          } ${
            form.pair === "USDC/TOKEN" 
              ? "bg-secondary/5 border border-secondary/20" 
              : "hover:bg-muted/20"
          }`}>
            <input
              type="radio"
              name="pair"
              value="USDC/TOKEN"
              checked={form.pair === "USDC/TOKEN"}
              onChange={(e) => updateForm("pair", e.target.value)}
              disabled={isLoading}
              className="text-primary focus:ring-primary w-5 h-5 border-2 border-primary/30 checked:bg-primary checked:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span className="text-fg font-medium">USDC/TOKEN</span>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={isLoading}
          className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={isLoading}
          className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-4">Step 3: Amounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-muted mb-2 font-semibold">
              {form.pair === "SOL/TOKEN" ? "SOL Amount" : "USDC Amount"}
            </label>
            <input
              type="number"
              value={form.baseAmount}
              onChange={(e) => updateForm("baseAmount", e.target.value)}
              disabled={isLoading}
              className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.01"
              min="0"
              required
            />
          </div>
          <div>
            <label className="block text-muted mb-2 font-semibold">
              Token Amount
            </label>
            <input
              type="number"
              value={form.quoteAmount}
              onChange={(e) => updateForm("quoteAmount", e.target.value)}
              disabled={isLoading}
              className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
        
        {/* Slippage input for Orca */}
        {form.dex === "Orca" && (
          <div className="mt-4">
            <label className="block text-muted mb-2 font-semibold">
              Slippage Tolerance
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={form.slippageBp || 100}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 100;
                  updateForm("slippageBp", value);
                }}
                className="w-24 p-3 rounded-lg border border-muted/10 bg-transparent text-fg text-center focus:border-muted/25 focus:ring-transparent"
                placeholder="100"
                min="10"
                max="500"
                step="10"
              />
              <span className="text-muted">basis points (1.0%)</span>
              <span className="text-xs text-muted bg-muted/20 px-2 py-1 rounded">
                Default: 100 bps = 1.0%
              </span>
            </div>
            <p className="text-xs text-muted mt-1">
              Slippage 0.10%–5.00% (default 1.00%)
            </p>
            {form.slippageBp && (form.slippageBp < 10 || form.slippageBp > 500) && (
              <p className="text-xs text-error mt-1">
                ⚠️ Slippage must be between 10-500 basis points
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          disabled={isLoading}
          className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back
        </button>
        <button
          onClick={getQuote}
          disabled={!form.baseAmount || !form.quoteAmount || isLoading || (form.slippageBp && (form.slippageBp < 10 || form.slippageBp > 500))}
          className="bg-secondary hover:bg-secondary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2" />
              <span>Getting quote…</span>
            </>
          ) : (
            "Get Quote"
          )}
        </button>
      </div>
    </div>
  );

  const renderQuote = () => (
    <div className="space-y-6">
      {/* Visual Feedback Area */}
      <div className="bg-success/20 border border-success/30 rounded-lg p-4 text-center">
        <p className="text-success text-sm font-medium">
          ✅ Quote from {form.dex} fetched.
        </p>
        {/* Show source information and DexScreener note */}
        {quote?.source && (
          <div className="mt-2 space-y-1">
            <p className="text-success/70 text-xs">
              Source: {quote.source}
            </p>
            {quote.source === "DexScreener" && (
              <p className="text-warning/80 text-xs font-medium">
                ⚠️ Estimated via DexScreener
              </p>
            )}
          </div>
        )}
      </div>
      
      <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-6 border border-muted/10">
        <h3 className="text-xl font-bold mb-4">Quote Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted">Pool Address:</span>
            <span className="text-fg font-mono text-sm">{quote?.poolAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Price Impact:</span>
            <span className="text-fg">{quote?.priceImpactBp} bps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">LP Fee:</span>
            <span className="text-fg">{quote?.lpFeeBp} bps</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Expected LP Tokens:</span>
            <span className="text-fg">{quote?.expectedLpTokens}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Min Output:</span>
            <span className="text-fg">{quote?.minOut}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={goBackFromQuote}
          className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300"
        >
          Back
        </button>
        <button
          onClick={() => setShowConfirmModal(true)}
          className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300"
        >
          Confirm
        </button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-2xl font-bold mb-2">
            {form.dex === "Raydium" ? "Liquidity Added Successfully!" : "Transaction Built Successfully!"}
          </h3>
          <p className="text-muted">
            {form.dex === "Raydium" 
              ? "Your liquidity has been added to the Raydium pool."
              : "Your Orca transaction has been built and is ready for signing."
            }
          </p>
        </div>
      </div>

      <div className="bg-muted/10 rounded-lg p-6 space-y-4">
        {form.dex === "Raydium" && commitResult?.txid && (
          <div className="text-center">
            <p className="text-muted text-sm mb-2">Transaction ID</p>
            <p className="text-xs text-muted font-mono bg-muted/20 p-2 rounded">
              {commitResult.txid}
            </p>
          </div>
        )}
        
        {form.dex === "Orca" && commitResult?.txBase64 && (
          <div className="text-center">
            <p className="text-muted text-sm mb-2">Orca Transaction Built</p>
            <p className="text-xs text-muted font-mono bg-muted/20 p-2 rounded">
              Transaction ready for wallet signing
            </p>
          </div>
        )}
        
        {commitResult?.summary && (
          <div className="text-left space-y-3">
            <p className="text-muted text-sm font-medium">Transaction Summary:</p>
            <div className="text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted">Whirlpool:</span>
                <span className="text-fg font-mono">{commitResult.summary.whirlpool.slice(0, 8)}...{commitResult.summary.whirlpool.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Input Token:</span>
                <span className="text-fg">{commitResult.summary.inputMint === "A" ? "Token A" : "Token B"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Input Amount:</span>
                <span className="text-fg">{commitResult.summary.inputAmountUi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Expected Output:</span>
                <span className="text-fg">{commitResult.summary.expectedOutputAmountUi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Slippage:</span>
                <span className="text-fg">{(commitResult.summary.slippageBp / 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tick Range:</span>
                <span className="text-fg">{commitResult.summary.tickLower} to {commitResult.summary.tickUpper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Current Tick:</span>
                <span className="text-fg">{commitResult.summary.currentTick}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tick Spacing:</span>
                <span className="text-fg">{commitResult.summary.tickSpacing}</span>
              </div>
              {commitResult.summary.signature && (
                <div className="flex justify-between">
                  <span className="text-muted">Signature:</span>
                  <span className="text-fg font-mono">{commitResult.summary.signature.slice(0, 8)}...{commitResult.summary.signature.slice(-8)}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {form.dex === "Orca" && (
          <a
            href={`https://app.orca.so/pools/${commitResult?.summary?.whirlpool || ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent hover:bg-accent/80 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 inline-block"
          >
            View on Orca
          </a>
        )}
        {form.dex === "Raydium" && (
          <a
            href="#"
            className="bg-secondary hover:bg-secondary/600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 inline-block"
          >
            View on DEX
          </a>
        )}
        {commitResult?.summary?.signature && (
          <a
            href={`https://solscan.io/tx/${commitResult.summary.signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 inline-block"
          >
            View on Solscan
          </a>
        )}
        <button
          onClick={() => router.push('/positions')}
          className="bg-accent hover:bg-accent/80 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 inline-block"
        >
          View My Positions
        </button>
        <button
          onClick={resetWizard}
          className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300 block w-full"
        >
          Add More Liquidity
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    if (commitResult) return renderSuccess();
    if (quote) return renderQuote();
    
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      default: return renderStep1();
    }
  };

  return (
    <>
      <Head>
        <title>Liquidity Wizard - Solana Token Creator</title>
      </Head>
      
      <div className="min-h-screen bg-bg text-fg">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-center mb-8">Liquidity Wizard</h1>
            
            {/* Pre-filled indicator */}
            {router.query.tokenMint && (
              <div className="bg-success/20 border border-success/30 rounded-lg p-4 mb-6 text-center">
                <p className="text-success text-sm">
                  ✅ Pre-filled with token: <strong>{router.query.tokenMint}</strong>
                </p>
              </div>
            )}

            {/* Progress Steps */}
            {!commitResult && !quote && (
              <div className="flex justify-center mb-8">
                <div className="flex space-x-4">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        step <= currentStep 
                          ? 'bg-primary text-bg' 
                          : 'bg-muted/20 text-muted'
                      }`}>
                        {step}
                      </div>
                      {step < 3 && (
                        <div className={`w-8 h-1 mx-2 ${
                          step < currentStep ? 'bg-primary' : 'bg-muted/20'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {errorMsg && (
              <div className="mb-6">
                {errorMsg.includes(':') ? (
                  // Structured error with code
                  <ErrorDisplay
                    errorCode={errorMsg.split(':')[0]}
                    errorMessage={errorMsg.split(':').slice(1).join(':').trim()}
                    onRetry={() => {
                      // Clear error and retry the current action
                      if (currentStep === 3 && quote) {
                        commitLiquidity();
                      }
                    }}
                  />
                ) : (
                  // Fallback for non-structured errors
                  <div className="bg-error/20 border border-error/30 rounded-lg p-4 text-center">
                    <p className="text-error text-sm font-medium">
                      ❌ {errorMsg}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Loading Status Feedback */}
            {isLoading && currentStep === 3 && (
              <div className="bg-info/20 border border-info/30 rounded-lg p-4 mb-6 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Spinner size={16} />
                  <p className="text-info text-sm font-medium">
                    Fetching from {form.dex}… this can take a few seconds.
                  </p>
                </div>
              </div>
            )}
            
            {/* Transaction Building Status */}
            {isCommitting && (
              <div className="bg-accent/20 border border-accent/30 rounded-lg p-4 mb-6 text-center">
                <div className="flex items-center justify-center space-x-2">
                  <Spinner size={16} />
                  <p className="text-accent text-sm font-medium">
                    Building {form.dex} transaction… please wait.
                  </p>
                </div>
              </div>
            )}
            
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
              {renderCurrentStep()}
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/[.3] backdrop-blur-[10px]">
            <div className="bg-bg/90 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 max-w-md w-full mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Confirm Liquidity Addition</h3>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="text-muted hover:text-fg"
                >
                  <AiOutlineClose size={24} />
                </button>
              </div>
              
              <div className="space-y-4 mb-6">
                <p className="text-muted">Are you sure you want to add liquidity?</p>
                <div className="bg-muted/10 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">DEX:</span>
                    <span className="text-fg">{form.dex}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Pair:</span>
                    <span className="text-fg">{form.pair}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Base Amount:</span>
                    <span className="text-fg">{form.baseAmount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Quote Amount:</span>
                    <span className="text-fg">{form.quoteAmount}</span>
                  </div>
                  {form.dex === "Orca" && (
                    <div className="flex justify-between">
                      <span className="text-muted">Slippage:</span>
                      <span className="text-fg">1.0% (default)</span>
                    </div>
                  )}
                </div>
                
                {/* Platform Fee Notice */}
                <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <div className="text-info text-sm">
                      <p className="font-medium">Platform Fee:</p>
                      <p className="text-xs opacity-80">
                        {process.env.NEXT_PUBLIC_LAUNCH_FLAT_FEE_SOL || "0.02"} SOL + {process.env.NEXT_PUBLIC_LAUNCH_SKIM_BP || "200"} bps (2%) skim on both sides
                      </p>
                    </div>
                    <a 
                      href="/pricing" 
                      className="text-info hover:text-info/80 text-xs underline flex-shrink-0"
                    >
                      Learn more
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-4 rounded-lg transition-all duration-300"
                >
                  Cancel
                </button>
                <button
                  onClick={commitLiquidity}
                  disabled={isCommitting}
                  className="flex-1 bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isCommitting ? "Building Transaction..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default LiquidityPage;
