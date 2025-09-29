import React from "react";
import { useRouter } from "next/router";

// Props interface for the UpgradePro component
interface UpgradeProProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgraded?: () => void;
}

export const UpgradePro: React.FC<UpgradeProProps> = ({
  isOpen,
  onClose,
  onUpgraded
}) => {
  const router = useRouter();

  // Handle redirect to Pro token creation
  const handleCreateProToken = () => {
    onClose();
    router.push('/create-token/pro');
  };

  // Handle redirect to payment page
  const handleGoToPayment = () => {
    onClose();
    router.push('/payment/pro');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg/95 backdrop-blur-xl border border-muted/20 rounded-2xl p-8 max-w-md w-full">
        <div className="text-center space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl">🚀</span>
            </div>
            <h2 className="text-2xl font-bold text-fg">Upgrade to Pro</h2>
            <p className="text-muted">
              Create a Pro token to unlock advanced features like AI Meme Kit generation
            </p>
          </div>

          {/* Pro Features List */}
          <div className="space-y-3 text-left">
            <div className="flex items-center space-x-3">
              <span className="text-success">✨</span>
              <span className="text-sm">AI-powered Meme Kit generation</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-success">✨</span>
              <span className="text-sm">Advanced marketing tools</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-success">✨</span>
              <span className="text-sm">Professional templates</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-success">✨</span>
              <span className="text-sm">Enhanced analytics</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">0.1 SOL</div>
              <div className="text-sm text-muted">Per Pro token creation</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleCreateProToken}
              className="w-full bg-primary hover:bg-primary/80 text-bg font-bold py-3 px-6 rounded-lg transition-all duration-300"
            >
              Create Pro Token
            </button>
            
            <button
              onClick={handleGoToPayment}
              className="w-full bg-muted/20 hover:bg-muted/30 text-fg font-medium py-2 px-6 rounded-lg transition-all duration-300"
            >
              Go to Payment Page
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="text-muted hover:text-fg transition-colors duration-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};