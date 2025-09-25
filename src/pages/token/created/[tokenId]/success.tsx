import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useWallet } from "@solana/wallet-adapter-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useNetworkConfiguration } from "../../../../contexts/NetworkConfigurationProvider";

/**
 * Token Creation Success Page
 * Redirects to the progressive flow starting with honest launch
 */
const TokenSuccessPage: FC = () => {
  const router = useRouter();
  const { tokenId } = router.query;
  const { publicKey } = useWallet();
  const { connection } = useConnection();
  const { networkConfiguration } = useNetworkConfiguration();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (router.isReady && tokenId) {
      // Use router.push instead of router.replace to preserve wallet state
      // and add a small delay to ensure wallet state is stable
      setTimeout(() => {
        router.push(`/token/created/${tokenId}/honest-launch`);
      }, 100);
    }
  }, [router.isReady, tokenId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted">Loading...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default TokenSuccessPage;
