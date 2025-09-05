import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";

/**
 * Custom hook to check if the currently connected wallet is an admin
 * Compares the connected wallet address against the ADMIN_WALLETS environment variable
 * 
 * @returns {boolean} true if the connected wallet is in the admin list
 */
export const useAdminStatus = (): boolean => {
  const { publicKey } = useWallet();

  // Check if connected wallet is an admin
  const isAdmin = useMemo(() => {
    // If no wallet is connected, not an admin
    if (!publicKey) {
      return false;
    }

    // Get admin wallets from environment variable
    const adminWallets = process.env.NEXT_PUBLIC_ADMIN_WALLETS;
    
    // If no admin wallets configured, no one is admin
    if (!adminWallets) {
      return false;
    }

    // Split by comma and trim whitespace
    const adminWalletList = adminWallets
      .split(',')
      .map(wallet => wallet.trim())
      .filter(wallet => wallet.length > 0);

    // Check if current wallet is in the admin list
    const currentWalletAddress = publicKey.toString();
    return adminWalletList.includes(currentWalletAddress);
  }, [publicKey]);

  return isAdmin;
};
