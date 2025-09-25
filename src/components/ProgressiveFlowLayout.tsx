import { FC, ReactNode } from "react";
import { useRouter } from "next/router";
import ProgressIndicator from "./ProgressIndicator";

interface ProgressiveFlowLayoutProps {
  children: ReactNode;
  currentStep: number;
  totalSteps: number;
  title: string;
  subtitle: string;
  tokenMintAddress: string;
  onBack?: () => void;
  onSkip?: () => void;
  onExit?: () => void;
}

/**
 * ProgressiveFlowLayout provides consistent layout for all flow steps
 * Includes progress indicator, navigation, and consistent styling
 */
export const ProgressiveFlowLayout: FC<ProgressiveFlowLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  title,
  subtitle,
  tokenMintAddress,
  onBack,
  onSkip,
  onExit,
}) => {
  const router = useRouter();

  const handleExit = () => {
    if (onExit) {
      onExit();
    } else {
      router.push(`/token/${tokenMintAddress}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-fg mb-2">{title}</h1>
          <p className="text-muted text-lg">{subtitle}</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <ProgressIndicator 
            currentStep={currentStep} 
            totalSteps={totalSteps}
            className="mb-4"
          />
          <div className="text-center text-sm text-muted">
            Step {currentStep} of {totalSteps}
          </div>
        </div>

        {/* Content */}
        <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
          {children}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="btn btn-ghost text-muted hover:text-fg"
              >
                ← Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {onSkip && (
              <button
                onClick={onSkip}
                className="btn btn-secondary"
              >
                Skip this step
              </button>
            )}
            <button
              onClick={handleExit}
              className="btn btn-secondary"
            >
              Exit to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressiveFlowLayout;
