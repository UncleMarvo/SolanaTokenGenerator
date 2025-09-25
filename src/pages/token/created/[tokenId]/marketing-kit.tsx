import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import MarketingKitStep from "../../../../components/flow/MarketingKitStep";

/**
 * Step 2: Marketing Kit Generation Page
 * Allows users to generate professional marketing assets
 */
const MarketingKitPage: FC = () => {
  const router = useRouter();
  const { tokenId } = router.query;
  const { publicKey } = useWallet();
  const [tokenData, setTokenData] = useState<{
    name: string;
    symbol: string;
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
          });
        } else {
          console.error("Token not found in database:", result.error);
          // Fallback to placeholder data if token not found
          setTokenData({
            name: "Unknown Token",
            symbol: "UNKNOWN",
          });
        }
      } else {
        console.error("Failed to fetch token metadata:", response.statusText);
        // Fallback to placeholder data if API fails
        setTokenData({
          name: "Unknown Token",
          symbol: "UNKNOWN",
        });
      }
    } catch (error) {
      console.error("Failed to fetch token data:", error);
      // Fallback to placeholder data if request fails
      setTokenData({
        name: "Unknown Token",
        symbol: "UNKNOWN",
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
          <h1 className="text-2xl font-bold text-fg mb-4">Wallet Required</h1>
          <p className="text-muted">Please connect your wallet to continue.</p>
        </div>
      </div>
    );
  }

  return (
    <MarketingKitStep
      tokenMintAddress={tokenId as string}
      tokenName={tokenData.name}
      tokenSymbol={tokenData.symbol}
    />
  );
};

export default MarketingKitPage;
