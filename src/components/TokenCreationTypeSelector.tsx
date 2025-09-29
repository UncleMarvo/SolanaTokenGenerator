import React, { useState } from "react";
import { Check, Star, Zap } from "lucide-react";
import { TokenCreationType, TOKEN_CREATION_TYPES, getAvailableFeatures } from "../lib/tokenPricing";

interface TokenCreationTypeSelectorProps {
  selectedType: TokenCreationType;
  onTypeChange: (type: TokenCreationType) => void;
  disabled?: boolean;
}

export const TokenCreationTypeSelector: React.FC<TokenCreationTypeSelectorProps> = ({
  selectedType,
  onTypeChange,
  disabled = false
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-fg mb-4">Choose Token Creation Type</h3>
      
      <div className="grid gap-4">
        {/* Free Tier */}
        <div 
          className={`bg-bg/40 backdrop-blur-2xl rounded-xl p-6 border transition-all duration-300 cursor-pointer ${
            selectedType === 'free' 
              ? 'border-accent/50 bg-accent/5' 
              : 'border-muted/10 hover:border-muted/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeChange('free')}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <Zap className="text-accent" size={16} />
              </div>
              <div>
                <h4 className="font-semibold text-fg">Free</h4>
                <p className="text-sm text-muted">Basic token creation</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-fg">Free</div>
              <p className="text-xs text-muted">No payment required</p>
            </div>
          </div>
        </div>

        {/* Pro Tier */}
        <div 
          className={`bg-bg/40 backdrop-blur-2xl rounded-xl p-6 border transition-all duration-300 cursor-pointer relative ${
            selectedType === 'pro' 
              ? 'border-primary/50 bg-primary/5' 
              : 'border-muted/10 hover:border-muted/20'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onClick={() => !disabled && onTypeChange('pro')}
        >
          {/* Most Popular Badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="text-primary" size={16} />
              </div>
              <div>
                <h4 className="font-semibold text-fg">Pro</h4>
                <p className="text-sm text-muted">Complete launch package</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {TOKEN_CREATION_TYPES.pro.price} SOL
              </div>
              <p className="text-xs text-muted">Per token creation</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Payment Info */}
      {selectedType === 'pro' && (
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 rounded-full bg-info/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-info text-xs">i</span>
            </div>
            <div>
              <h5 className="font-medium text-fg text-sm mb-1">Payment Required</h5>
              <p className="text-xs text-muted leading-relaxed">
                Pro token creation requires a {TOKEN_CREATION_TYPES.pro.price} SOL payment per token. 
                This payment will be processed during token creation and unlocks advanced features 
                like Honest Launch verification, AI-powered Meme Kit, and liquidity tools.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
