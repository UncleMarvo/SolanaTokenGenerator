/**
 * Per-Token Pricing System
 * Defines pricing tiers for token creation (Free vs Pro)
 * Payment is per-token, not persistent user access
 */

// Token creation pricing tiers
export const TOKEN_CREATION_TYPES = {
  free: {
    name: 'Free',
    price: 0, // SOL per token
    features: [
      'basicCreation',
      'metadata', 
      'explorerLink',
      'preset'
    ]
  },
  pro: {
    name: 'Pro',
    price: 0.1, // SOL per token
    features: [
      'basicCreation',
      'metadata',
      'explorerLink',
      'honestLaunch',
      'memeKit',
      'liquidityTools',
      'sharePage'
    ]
  }
} as const;

// Type definitions for token creation pricing
export type TokenCreationType = keyof typeof TOKEN_CREATION_TYPES;
export type TokenCreationFeature = 
  | 'basicCreation'
  | 'metadata'
  | 'explorerLink'
  | 'preset'
  | 'honestLaunch'
  | 'memeKit'
  | 'liquidityTools'
  | 'sharePage';

// Pricing configuration interface
export interface TokenPricingConfig {
  type: TokenCreationType;
  price: number; // SOL amount
  features: TokenCreationFeature[];
}

// Get pricing configuration for a token creation type
export function getTokenPricing(type: TokenCreationType): TokenPricingConfig {
  return {
    type,
    price: TOKEN_CREATION_TYPES[type].price,
    features: [...TOKEN_CREATION_TYPES[type].features] // Convert readonly array to mutable array
  };
}

// Check if a feature is available for a given token creation type
export function hasFeature(type: TokenCreationType, feature: TokenCreationFeature): boolean {
  return (TOKEN_CREATION_TYPES[type].features as readonly TokenCreationFeature[]).includes(feature);
}

// Get all available features for a token creation type
export function getAvailableFeatures(type: TokenCreationType): TokenCreationFeature[] {
  return [...TOKEN_CREATION_TYPES[type].features]; // Convert readonly array to mutable array
}

// Validate if a token creation type is valid
export function isValidTokenCreationType(type: string): type is TokenCreationType {
  return type in TOKEN_CREATION_TYPES;
}

// Get the price in lamports for a token creation type
export function getPriceInLamports(type: TokenCreationType): number {
  return Math.floor(TOKEN_CREATION_TYPES[type].price * 1e9); // Convert SOL to lamports
}

// Check if a token creation type requires payment
export function requiresPayment(type: TokenCreationType): boolean {
  return TOKEN_CREATION_TYPES[type].price > 0;
}
