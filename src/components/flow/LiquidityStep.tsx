import { FC, useState } from "react";
import { useRouter } from "next/router";
import ProgressiveFlowLayout from "../ProgressiveFlowLayout";
import { useToast } from "../../hooks/useToast";
import { useFlowCompletion } from "../../hooks/useFlowCompletion";

interface LiquidityStepProps {
  tokenMintAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

/**
 * Step 3: Liquidity Setup
 * Allows users to add liquidity to enable trading
 */
export const LiquidityStep: FC<LiquidityStepProps> = ({
  tokenMintAddress,
  tokenName,
  tokenSymbol,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const { updateStep } = useFlowCompletion(tokenMintAddress);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleAddLiquidity = async () => {
    setIsSettingUp(true);
    try {
      // Mark liquidity as completed
      await updateStep("liquidity", true);
      // Navigate to liquidity page with pre-filled data
      router.push(`/liquidity?tokenMint=${encodeURIComponent(tokenMintAddress)}&dex=Raydium&pair=SOL/TOKEN`);
    } catch (error) {
      showToast("Failed to open liquidity setup", "error");
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleComplete = () => {
    router.push(`/token/created/${tokenMintAddress}/complete`);
  };

  const handleBack = () => {
    router.push(`/token/created/${tokenMintAddress}/marketing-kit`);
  };

  return (
    <ProgressiveFlowLayout
      currentStep={3}
      totalSteps={3}
      title="Step 3 of 3: Enable Trading"
      subtitle="Set up liquidity pools on Orca/Raydium"
      tokenMintAddress={tokenMintAddress}
      onBack={handleBack}
    >
      <div className="space-y-6">
        {/* Value Proposition */}
        <div className="text-center">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-fg mb-2">Enable Token Trading</h2>
          <p className="text-muted">
            Let people buy and sell your token by adding liquidity to decentralized exchanges.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4">
          <h3 className="font-semibold text-fg">Why add liquidity?</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-fg">Enable Trading</h4>
                <p className="text-sm text-muted">Users can buy and sell your token on DEXs</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-fg">Price Discovery</h4>
                <p className="text-sm text-muted">Market determines the fair price of your token</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-success/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-fg">Liquidity Rewards</h4>
                <p className="text-sm text-muted">Earn fees from trading activity in your pool</p>
              </div>
            </div>
          </div>
        </div>

        {/* Supported DEXs */}
        <div className="bg-muted/10 rounded-lg p-4">
          <h4 className="font-medium text-fg mb-3">Supported Exchanges</h4>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                <span className="text-blue-500 font-bold text-xs">R</span>
              </div>
              <span className="text-sm text-fg">Raydium</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500/20 rounded flex items-center justify-center">
                <span className="text-orange-500 font-bold text-xs">O</span>
              </div>
              <span className="text-sm text-fg">Orca</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleAddLiquidity}
            disabled={isSettingUp}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSettingUp ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                <span>Opening Setup...</span>
              </div>
            ) : (
              "Add Liquidity"
            )}
          </button>
          
          <button
            onClick={handleComplete}
            className="btn btn-secondary flex-1"
          >
            I'll do this later
          </button>
        </div>
      </div>
    </ProgressiveFlowLayout>
  );
};

export default LiquidityStep;
