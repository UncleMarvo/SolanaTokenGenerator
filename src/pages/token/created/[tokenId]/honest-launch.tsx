import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import HonestLaunchStep from "../../../../components/flow/HonestLaunchStep";

/**
 * Step 1: Honest Launch Verification Page
 * Allows users to enforce honest launch by revoking authorities
 */
const HonestLaunchPage: FC = () => {
  const router = useRouter();
  const { tokenId } = router.query;
  const { publicKey } = useWallet();
  const [tokenData, setTokenData] = useState<{
    name: string;
    symbol: string;
    preset: "honest" | "degen";
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (router.isReady && tokenId) {
      // Fetch token data from the database or API
      fetchTokenData(tokenId as string);
    }
  }, [router.isReady, tokenId]);

  const fetchTokenData = async (mintAddress: string) => {
    try {
      // Fetch token data from the database via API
      const response = await fetch(`/api/token/metadata?mint=${mintAddress}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.ok && result.token) {
          setTokenData({
            name: result.token.name,
            symbol: result.token.symbol,
            preset: result.token.preset || "honest", // Use preset from database or default to honest
          });
        } else {
          console.error("Token not found in database:", result.error);
          // Fallback to placeholder data if token not found
          setTokenData({
            name: "Unknown Token",
            symbol: "UNKNOWN",
            preset: "honest",
          });
        }
      } else {
        console.error("Failed to fetch token metadata:", response.statusText);
        // Fallback to placeholder data if API fails
        setTokenData({
          name: "Unknown Token",
          symbol: "UNKNOWN",
          preset: "honest",
        });
      }
    } catch (error) {
      console.error("Failed to fetch token data:", error);
      // Fallback to placeholder data if request fails
      setTokenData({
        name: "Unknown Token",
        symbol: "UNKNOWN",
        preset: "honest",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !tokenData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading token data...</p>
        </div>
      </div>
    );
  }

  if (!publicKey) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fg mb-4">Wallet Connection Required</h1>
          <p className="text-muted mb-4">
            Your wallet connection was lost during navigation. Please reconnect to continue with the launch process.
          </p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary mr-3"
            >
              Refresh Page
            </button>
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-secondary"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <HonestLaunchStep
      tokenMintAddress={tokenId as string}
      tokenName={tokenData.name}
      tokenSymbol={tokenData.symbol}
      preset={tokenData.preset}
    />
  );
};

export default HonestLaunchPage;
