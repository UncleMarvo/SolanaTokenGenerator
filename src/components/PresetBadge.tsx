import { FC } from "react";

interface PresetBadgeProps {
  preset: "honest" | "degen";
  className?: string;
  isOnChainVerified?: boolean; // New prop for on-chain verification status
}

export const PresetBadge: FC<PresetBadgeProps> = ({ preset, className = "", isOnChainVerified = false }) => {
  const isHonest = preset === "honest";
  
  // If honest preset and on-chain verified, show verified badge
  if (isHonest && isOnChainVerified) {
    return (
      <div 
        className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${className} bg-success/20 text-success border border-success/30`}
        title="On-chain Verified: Mint and freeze authorities are revoked, token is community-controlled"
      >
        <span>✅ On-chain Verified</span>
      </div>
    );
  }
  
  // Default preset badges
  return (
    <div 
      className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${className} ${
        isHonest 
          ? "bg-success/20 text-success border border-success/30" 
          : "bg-accent/20 text-accent border border-accent/30"
      }`}
      title={
        isHonest 
          ? "Honest Launch: Mint and freeze authorities will be revoked for community trust" 
          : "Degen Mode: No authority changes, maximum flexibility for rapid deployment"
      }
    >
      <span>
        {isHonest ? "✅ Honest Launch" : "⚡ Degen Mode"}
      </span>
    </div>
  );
};
