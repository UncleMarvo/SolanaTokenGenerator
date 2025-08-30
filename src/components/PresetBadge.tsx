import { FC } from "react";

interface PresetBadgeProps {
  preset: "honest" | "degen";
  className?: string;
}

export const PresetBadge: FC<PresetBadgeProps> = ({ preset, className = "" }) => {
  const isHonest = preset === "honest";
  
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
