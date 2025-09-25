import { FC, useState } from "react";
import { useRouter } from "next/router";
import ProgressiveFlowLayout from "../ProgressiveFlowLayout";
import HonestLaunchEnforcer from "../HonestLaunchEnforcer";
import { useToast } from "../../hooks/useToast";
import { useFlowCompletion } from "../../hooks/useFlowCompletion";

interface HonestLaunchStepProps {
  tokenMintAddress: string;
  tokenName: string;
  tokenSymbol: string;
  preset: "honest" | "degen";
}

/**
 * Step 1: Honest Launch Verification
 * Allows users to enforce honest launch by revoking authorities
 */
export const HonestLaunchStep: FC<HonestLaunchStepProps> = ({
  tokenMintAddress,
  tokenName,
  tokenSymbol,
  preset,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const { updateStep } = useFlowCompletion(tokenMintAddress);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleVerificationChange = async (isVerified: boolean) => {
    setIsCompleted(isVerified);
    
    // Update completion status in database
    if (isVerified) {
      await updateStep("honestLaunch", true);
      showToast("Honest launch verified! Moving to next step...", "success");
      // Auto-advance to next step after a short delay
      setTimeout(() => {
        router.push(`/token/created/${tokenMintAddress}/marketing-kit`);
      }, 2000);
    }
  };

  const handleSkip = () => {
    router.push(`/token/created/${tokenMintAddress}/marketing-kit`);
  };

  const handleBack = () => {
    router.push(`/token/created/${tokenMintAddress}/success`);
  };

  return (
    <ProgressiveFlowLayout
      currentStep={1}
      totalSteps={3}
      title="Step 1 of 3: Prove It's Honest"
      subtitle="Get the trust badge buyers look for"
      tokenMintAddress={tokenMintAddress}
      onBack={handleBack}
    >
      <div className="space-y-6">
        {/* Value Proposition */}
        <div className="text-center">
          <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-fg mb-2">Build Trust with Honest Launch</h2>
          <p className="text-muted">
            Permanently revoke mint/freeze authorities to prove fairness and earn the trust badge that buyers look for.
          </p>
        </div>

        {/* Token Info */}
        <div className="bg-muted/10 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {tokenSymbol.charAt(0)}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-fg">{tokenName}</h3>
              <p className="text-sm text-muted">${tokenSymbol}</p>
            </div>
          </div>
        </div>

        {/* Honest Launch Enforcer */}
        <div className="space-y-4">
          <h3 className="font-semibold text-fg">Enforce Honest Launch</h3>
          <p className="text-sm text-muted">
            This will permanently revoke your ability to mint new tokens or freeze accounts, 
            proving to the community that your token is fair and decentralized.
          </p>
          
          {preset === "honest" ? (
            <HonestLaunchEnforcer
              mintAddress={tokenMintAddress}
              preset={preset}
              onVerificationChange={handleVerificationChange}
            />
          ) : (
            <div className="bg-muted/20 border border-muted/30 rounded-lg p-4 text-center">
              <p className="text-muted text-sm">
                This token was created with the "degen" preset and cannot be made honest.
                You can still proceed with marketing and liquidity setup.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleSkip}
            className="btn btn-secondary flex-1"
          >
            Skip this step
          </button>
          
          {preset === "honest" && !isCompleted && (
            <div className="text-center text-sm text-muted">
              Complete the honest launch enforcement above to continue
            </div>
          )}
        </div>
      </div>
    </ProgressiveFlowLayout>
  );
};

export default HonestLaunchStep;
