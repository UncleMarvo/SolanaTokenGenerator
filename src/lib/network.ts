/**
 * Network configuration utilities
 * Provides network detection and environment-based configuration
 */

// Network type definition
export type NetworkType = "devnet" | "mainnet";

// Get network from environment variable, defaulting to mainnet
export const NETWORK = (process.env.NETWORK || "mainnet") as NetworkType;

// Boolean flag for devnet detection
export const IS_DEVNET = NETWORK === "devnet";

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
