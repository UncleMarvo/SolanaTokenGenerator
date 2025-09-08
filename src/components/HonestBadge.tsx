import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

/**
 * Status type for honest launch verification
 * Contains information about mint and freeze authorities
 */
type Status = { 
  isHonest: boolean; 
  mintNull: boolean; 
  freezeNull: boolean; 
};

/**
 * Props for the HonestBadge component
 */
interface HonestBadgeProps {
  /** The mint address of the token to check */
  mint: string;
  /** The creator's wallet address (base58) from CreatedToken.creatorWallet */
  creator: string;
  /** Optional callback when enforce button is clicked */
  onEnforce?: () => void;
}

/**
 * HonestBadge component displays the honest launch status of a token
 * Shows "Pending Honest Launch" until both authorities are null
 * Only the creator sees the Enforce button
 */
export default function HonestBadge({
  mint,
  creator,
  onEnforce,
}: HonestBadgeProps) {
  const { publicKey } = useWallet();
  
  // Check if current wallet is the creator (can enforce honest launch)
  const canEnforce = publicKey && publicKey.toBase58() === creator;

  const [loading, setLoading] = useState(true);
  const [st, setSt] = useState<Status | null>(null);

  // Fetch honest status from API endpoint
  useEffect(() => {
    let alive = true;
    
    (async () => {
      try {
        // Call the existing honest-status API endpoint
        const r = await fetch(`/api/honest-status?mint=${mint}`, { 
          cache: "no-store" 
        });
        const j = await r.json();
        
        // Only update state if component is still mounted
        if (!alive) return;
        
        // Set status if API call was successful
        setSt(j?.ok ? j.status : null);
      } catch (error) {
        // Handle fetch errors gracefully
        console.warn("Failed to fetch honest status:", error);
        setSt(null);
      } finally {
        setLoading(false);
      }
    })();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => { 
      alive = false; 
    };
  }, [mint]);

  // Show loading state while fetching status
  if (loading) {
    return (
      <span className="chip" title="Checking honest launch status...">
        Checking…
      </span>
    );
  }

  // Show success state when token is honest (both authorities revoked)
  if (st?.isHonest) {
    return (
      <span 
        className="chip" 
        title="Mint & freeze authorities are revoked on-chain. This token is community-controlled."
      >
        Honest Launch ✅
      </span>
    );
  }

  // Generate helpful tooltip for pending state
  const tip = !st
    ? "Unable to verify on-chain status right now. Please try again later."
    : `Pending: ${st.mintNull ? "" : "Mint authority active"}${!st.mintNull && !st.freezeNull ? " & " : ""}${st.freezeNull ? "" : "Freeze authority active"}`;

  return (
    <div className="flex items-center gap-2">
      {/* Pending status badge */}
      <span className="chip" title={tip}>
        Pending Honest Launch
      </span>
      
      {/* Enforce button - only shown to creator */}
      {onEnforce && canEnforce && (
        <button 
          className="btn btn-primary" 
          onClick={onEnforce} 
          title="Revoke mint & freeze authorities to earn the Honest badge and make this token community-controlled."
        >
          Enforce Honest Launch
        </button>
      )}
    </div>
  );
}
