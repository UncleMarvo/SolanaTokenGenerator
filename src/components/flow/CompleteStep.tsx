import { FC } from "react";
import { useRouter } from "next/router";
import ProgressiveFlowLayout from "../ProgressiveFlowLayout";
import { useFlowCompletion } from "../../hooks/useFlowCompletion";

interface CompleteStepProps {
  tokenMintAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

/**
 * Step 4: Launch Complete
 * Shows completion summary and next steps
 */
export const CompleteStep: FC<CompleteStepProps> = ({
  tokenMintAddress,
  tokenName,
  tokenSymbol,
}) => {
  const router = useRouter();
  const { completion } = useFlowCompletion(tokenMintAddress);

  const handleViewDashboard = () => {
    router.push(`/token/${tokenMintAddress}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${tokenName} ($${tokenSymbol})`,
        text: `Check out my new Solana token: ${tokenName}`,
        url: `${window.location.origin}/token/${tokenMintAddress}`,
      });
    } else {
      // Fallback to copying URL
      navigator.clipboard.writeText(`${window.location.origin}/token/${tokenMintAddress}`);
    }
  };

  const completedCount = Object.values(completion).filter(Boolean).length;

  return (
    <ProgressiveFlowLayout
      currentStep={4}
      totalSteps={3}
      title="Launch Complete!"
      subtitle="Your token is ready to go"
      tokenMintAddress={tokenMintAddress}
    >
      <div className="space-y-6">
        {/* Success Animation */}
        <div className="text-center">
          <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-fg mb-2">Congratulations!</h2>
          <p className="text-muted">
            Your token <span className="font-semibold text-fg">{tokenName}</span> is live and ready!
          </p>
        </div>

        {/* Completion Summary */}
        <div className="bg-muted/10 rounded-lg p-6">
          <h3 className="font-semibold text-fg mb-4">Launch Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-fg">Token Created</span>
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-success text-sm font-medium">Complete</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-fg">Honest Launch</span>
              <div className="flex items-center space-x-2">
                {completion.honestLaunch ? (
                  <>
                    <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-success text-sm font-medium">Complete</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-muted" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-muted text-sm">Skipped</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-fg">Marketing Kit</span>
              <div className="flex items-center space-x-2">
                {completion.marketingKit ? (
                  <>
                    <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-success text-sm font-medium">Complete</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-muted" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-muted text-sm">Skipped</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-fg">Liquidity Setup</span>
              <div className="flex items-center space-x-2">
                {completion.liquidity ? (
                  <>
                    <svg className="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-success text-sm font-medium">Complete</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 text-muted" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    <span className="text-muted text-sm">Skipped</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          <h3 className="font-semibold text-fg">What's next?</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/10 rounded-lg p-4">
              <h4 className="font-medium text-fg mb-2">Share Your Token</h4>
              <p className="text-sm text-muted mb-3">
                Share your token page with the community to start building momentum.
              </p>
              <button
                onClick={handleShare}
                className="btn btn-secondary w-full"
              >
                Share Token Page
              </button>
            </div>

            <div className="bg-muted/10 rounded-lg p-4">
              <h4 className="font-medium text-fg mb-2">Monitor Performance</h4>
              <p className="text-sm text-muted mb-3">
                Track your token's performance and trading activity.
              </p>
              <button
                onClick={handleViewDashboard}
                className="btn btn-primary w-full"
              >
                View Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleViewDashboard}
            className="btn btn-primary flex-1"
          >
            View My Token Dashboard
          </button>
          
          <button
            onClick={() => router.push('/my-tokens')}
            className="btn btn-secondary flex-1"
          >
            View All My Tokens
          </button>
        </div>
      </div>
    </ProgressiveFlowLayout>
  );
};

export default CompleteStep;
