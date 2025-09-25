import { FC, useState } from "react";
import { useRouter } from "next/router";
import ProgressiveFlowLayout from "../ProgressiveFlowLayout";
import { useToast } from "../../hooks/useToast";
import { useFlowCompletion } from "../../hooks/useFlowCompletion";

interface MarketingKitStepProps {
  tokenMintAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

/**
 * Step 2: Marketing Kit Generation
 * Allows users to generate professional marketing assets
 */
export const MarketingKitStep: FC<MarketingKitStepProps> = ({
  tokenMintAddress,
  tokenName,
  tokenSymbol,
}) => {
  const router = useRouter();
  const { showToast } = useToast();
  const { updateStep } = useFlowCompletion(tokenMintAddress);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateKit = async () => {
    setIsGenerating(true);
    try {
      // Mark marketing kit as completed
      await updateStep("marketingKit", true);
      // Navigate to meme kit page with pre-filled data and tokenMintAddress for flow navigation
      router.push(`/meme-kit?name=${encodeURIComponent(tokenName)}&ticker=${encodeURIComponent(tokenSymbol)}&tokenMintAddress=${tokenMintAddress}`);
    } catch (error) {
      showToast("Failed to generate marketing kit", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSkip = () => {
    router.push(`/token/created/${tokenMintAddress}/liquidity`);
  };

  const handleBack = () => {
    router.push(`/token/created/${tokenMintAddress}/honest-launch`);
  };

  return (
    <ProgressiveFlowLayout
      currentStep={2}
      totalSteps={3}
      title="Step 2 of 3: Get Professional Marketing"
      subtitle="AI-generated social assets ready in seconds"
      tokenMintAddress={tokenMintAddress}
      onBack={handleBack}
    >
      <div className="space-y-6">
        {/* Value Proposition */}
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-9 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 8h6m-6 4h6m-6 4h6" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-fg mb-2">Professional Marketing Kit</h2>
          <p className="text-muted">
            Get AI-generated social media assets, threads, and marketing materials 
            tailored specifically for your token.
          </p>
        </div>

        {/* Preview Assets */}
        <div className="space-y-4">
          <h3 className="font-semibold text-fg">What you'll get:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-muted/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                </div>
                <h4 className="font-medium text-fg">Twitter Threads</h4>
              </div>
              <p className="text-sm text-muted">Engaging thread content for launch announcements</p>
            </div>

            <div className="bg-muted/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="font-medium text-fg">Visual Assets</h4>
              </div>
              <p className="text-sm text-muted">Headers, logos, and social media graphics</p>
            </div>

            <div className="bg-muted/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                </div>
                <h4 className="font-medium text-fg">Hashtags & Copy</h4>
              </div>
              <p className="text-sm text-muted">Ready-to-use hashtags and marketing copy</p>
            </div>

            <div className="bg-muted/10 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-primary/20 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="font-medium text-fg">Download Package</h4>
              </div>
              <p className="text-sm text-muted">Complete ZIP file with all assets</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={handleGenerateKit}
            disabled={isGenerating}
            className="btn btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
                <span>Generating Kit...</span>
              </div>
            ) : (
              "Generate My Meme Kit"
            )}
          </button>
          
          <button
            onClick={handleSkip}
            className="btn btn-secondary flex-1"
          >
            Skip this step
          </button>
        </div>
      </div>
    </ProgressiveFlowLayout>
  );
};

export default MarketingKitStep;
