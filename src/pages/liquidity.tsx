import { FC } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useLiquidityWizard } from "../hooks/useLiquidityWizard";
import { AiOutlineClose } from "react-icons/ai";

const LiquidityPage: FC = () => {
  const router = useRouter();
  const {
    currentStep,
    form,
    quote,
    isLoading,
    showConfirmModal,
    commitResult,
    updateForm,
    nextStep,
    prevStep,
    getQuote,
    commitLiquidity,
    setShowConfirmModal,
    resetWizard
  } = useLiquidityWizard();

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-4">Step 1: Choose DEX</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="dex"
              value="Raydium"
              checked={form.dex === "Raydium"}
              onChange={(e) => updateForm("dex", e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-fg">Raydium</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="dex"
              value="Orca"
              checked={form.dex === "Orca"}
              onChange={(e) => updateForm("dex", e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-fg">Orca</span>
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
          className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
          placeholder="Enter token mint address"
          required
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={nextStep}
          disabled={!form.tokenMint}
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
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="pair"
              value="SOL/TOKEN"
              checked={form.pair === "SOL/TOKEN"}
              onChange={(e) => updateForm("pair", e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-fg">SOL/TOKEN</span>
          </label>
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="pair"
              value="USDC/TOKEN"
              checked={form.pair === "USDC/TOKEN"}
              onChange={(e) => updateForm("pair", e.target.value)}
              className="text-primary focus:ring-primary"
            />
            <span className="text-fg">USDC/TOKEN</span>
          </label>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300"
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
              className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
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
              className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
              placeholder="0.0"
              step="0.01"
              min="0"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300"
        >
          Back
        </button>
        <button
          onClick={getQuote}
          disabled={!form.baseAmount || !form.quoteAmount || isLoading}
          className="bg-secondary hover:bg-secondary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 disabled:opacity-50"
        >
          {isLoading ? "Getting Quote..." : "Get Quote"}
        </button>
      </div>
    </div>
  );

  const renderQuote = () => (
    <div className="space-y-6">
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
          onClick={() => {
            setQuote(null);
            setCurrentStep(3);
          }}
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
      <div className="bg-success/20 border border-success/30 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-2 text-success">Liquidity Added Successfully!</h3>
        <p className="text-muted mb-4">Your liquidity has been added to the pool.</p>
        <div className="bg-bg/40 rounded-lg p-4">
          <p className="text-fg font-mono text-sm">Transaction ID: {commitResult?.txid}</p>
        </div>
      </div>

      <div className="space-y-3">
        <a
          href="#"
          className="bg-secondary hover:bg-secondary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300 inline-block"
        >
          View on DEX
        </a>
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
                  disabled={isLoading}
                  className="flex-1 bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                >
                  {isLoading ? "Confirming..." : "Confirm"}
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
