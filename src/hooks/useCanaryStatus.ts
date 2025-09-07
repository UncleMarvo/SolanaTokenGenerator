import { useState, useEffect } from "react";

/**
 * Hook to get canary mode status for client-side display
 */
export const useCanaryStatus = () => {
  const [canaryStatus, setCanaryStatus] = useState<{
    isMainnet: boolean;
    canaryMode: boolean;
    maxSol: number;
    maxTokenUi: number;
    allowListedWallets: number;
  } | null>(null);

  useEffect(() => {
    // Fetch canary status from API
    const fetchCanaryStatus = async () => {
      try {
        const response = await fetch("/api/canary/status");
        if (response.ok) {
          const status = await response.json();
          setCanaryStatus(status);
        }
      } catch (error) {
        console.warn("Failed to fetch canary status:", error);
      }
    };

    fetchCanaryStatus();
  }, []);

  return canaryStatus;
};

/**
 * Check if a wallet is allowed for canary mode
 */
export const useWalletCanaryCheck = (walletAddress: string | null) => {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setIsAllowed(null);
      return;
    }

    const checkWallet = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/canary/check-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddress }),
        });
        
        if (response.ok) {
          const result = await response.json();
          setIsAllowed(result.allowed);
        } else {
          setIsAllowed(false);
        }
      } catch (error) {
        console.warn("Failed to check wallet canary status:", error);
        setIsAllowed(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkWallet();
  }, [walletAddress]);

  return { isAllowed, isLoading };
};
