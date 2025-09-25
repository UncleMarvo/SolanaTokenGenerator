import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

interface FlowCompletionData {
  honestLaunch: boolean;
  marketingKit: boolean;
  liquidity: boolean;
  completedAt?: string;
}

interface UseFlowCompletionReturn {
  completion: FlowCompletionData;
  isLoading: boolean;
  error: string | null;
  updateStep: (step: keyof Omit<FlowCompletionData, 'completedAt'>, completed: boolean) => Promise<void>;
  refreshCompletion: () => Promise<void>;
}

/**
 * Hook for managing progressive flow completion tracking
 * Provides methods to update and retrieve completion status
 */
export const useFlowCompletion = (tokenMint: string): UseFlowCompletionReturn => {
  const { publicKey } = useWallet();
  const [completion, setCompletion] = useState<FlowCompletionData>({
    honestLaunch: false,
    marketingKit: false,
    liquidity: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletion = async () => {
    if (!publicKey || !tokenMint) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/flow/completion?tokenMint=${tokenMint}&creatorWallet=${publicKey.toBase58()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch completion status");
      }

      const data = await response.json();
      setCompletion(data.completion);
    } catch (err) {
      console.error("Error fetching flow completion:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStep = async (step: keyof Omit<FlowCompletionData, 'completedAt'>, completed: boolean) => {
    if (!publicKey || !tokenMint) return;

    try {
      setError(null);

      const response = await fetch("/api/flow/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokenMint,
          creatorWallet: publicKey.toBase58(),
          [step]: completed,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update completion status");
      }

      const data = await response.json();
      setCompletion(data.completion);
    } catch (err) {
      console.error("Error updating flow completion:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const refreshCompletion = async () => {
    await fetchCompletion();
  };

  useEffect(() => {
    fetchCompletion();
  }, [publicKey, tokenMint]);

  return {
    completion,
    isLoading,
    error,
    updateStep,
    refreshCompletion,
  };
};

export default useFlowCompletion;
