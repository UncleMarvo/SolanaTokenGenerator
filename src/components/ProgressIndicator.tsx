import { FC } from "react";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

/**
 * ProgressIndicator component displays the current step progress
 * Shows step numbers and completion status with visual indicators
 */
export const ProgressIndicator: FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  className = "",
}) => {
  return (
    <div className={`flex items-center justify-center space-x-4 ${className}`}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        
        return (
          <div key={stepNumber} className="flex items-center">
            {/* Step Circle */}
            <div
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                transition-all duration-300
                ${
                  isCompleted
                    ? "bg-success text-bg"
                    : isCurrent
                    ? "bg-primary text-bg ring-2 ring-primary/30"
                    : "bg-muted/20 text-muted border border-muted/30"
                }
              `}
            >
              {isCompleted ? "✓" : stepNumber}
            </div>
            
            {/* Connector Line */}
            {stepNumber < totalSteps && (
              <div
                className={`
                  w-8 h-0.5 mx-2 transition-all duration-300
                  ${
                    isCompleted
                      ? "bg-success"
                      : "bg-muted/20"
                  }
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
