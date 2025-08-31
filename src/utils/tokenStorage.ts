export interface StoredToken {
  mintAddress: string;
  name: string;
  symbol: string;
  decimals: string;
  amount: string;
  image: string;
  description: string;
  preset: "honest" | "degen";
  vibe: "funny" | "serious" | "degen";
  createdAt: number;
  links?: {
    tg?: string;
    x?: string;
    site?: string;
  };
}

const STORAGE_KEY = "solana_token_creator_tokens";

export const tokenStorage = {
  // Store a new token
  storeToken: (token: StoredToken): void => {
    try {
      const existingTokens = tokenStorage.getTokens();
      const updatedTokens = [token, ...existingTokens].slice(0, 50); // Keep last 50 tokens
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTokens));
    } catch (error) {
      console.error("Error storing token:", error);
    }
  },

  // Get all stored tokens
  getTokens: (): StoredToken[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Error retrieving tokens:", error);
      return [];
    }
  },

  // Get a specific token by mint address
  getToken: (mintAddress: string): StoredToken | null => {
    try {
      const tokens = tokenStorage.getTokens();
      return tokens.find(token => token.mintAddress === mintAddress) || null;
    } catch (error) {
      console.error("Error retrieving token:", error);
      return null;
    }
  },

  // Clear all stored tokens
  clearTokens: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing tokens:", error);
    }
  }
};
