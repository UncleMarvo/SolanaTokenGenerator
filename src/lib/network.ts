/**
 * Network configuration utilities
 * Provides network detection and environment-based configuration
 */

// Re-export from centralized env configuration
export { NETWORK, IS_DEVNET, type Cluster as NetworkType, DEV_RELAX_CONFIRM_MS, DEV_DISABLE_DEXSCR, DEV_ALLOW_MANUAL_RAY } from './env';

// Import for local use
import { NETWORK, IS_DEVNET, DEV_RELAX_CONFIRM_MS, DEV_DISABLE_DEXSCR, DEV_ALLOW_MANUAL_RAY } from './env';

// Boolean flag for mainnet detection
export const IS_MAINNET = NETWORK === "mainnet";

// Cluster string for Solana connection (used by some libraries)
export const CLUSTER = IS_DEVNET ? "devnet" : "mainnet-beta";

// Network-specific configuration
export const NETWORK_CONFIG = {
  devnet: {
    name: "Devnet",
    rpcUrl: "https://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com/?cluster=devnet",
  },
  mainnet: {
    name: "Mainnet",
    rpcUrl: "https://api.mainnet-beta.solana.com", 
    explorerUrl: "https://explorer.solana.com",
  },
} as const;

// Get current network configuration
export const getCurrentNetworkConfig = () => NETWORK_CONFIG[NETWORK];

// Helper to check if we're in development mode
export const isDevelopment = () => IS_DEVNET || process.env.NODE_ENV === "development";

// Legacy DEVNET_CONFIG object for backward compatibility
export const DEVNET_CONFIG = {
  relaxConfirmMs: DEV_RELAX_CONFIRM_MS,
  disableDexScreener: DEV_DISABLE_DEXSCR,
  allowManualRaydium: DEV_ALLOW_MANUAL_RAY,
} as const;