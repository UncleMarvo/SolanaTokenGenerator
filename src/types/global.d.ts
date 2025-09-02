import { PublicKey } from "@solana/web3.js";

interface PhantomProvider {
  isPhantom?: boolean;
  isConnected?: boolean;
  publicKey?: PublicKey;
  connect(): Promise<void>;
  signTransaction(transaction: any): Promise<any>;
  signAllTransactions(transactions: any[]): Promise<any[]>;
}

declare global {
  interface Window {
    solana?: PhantomProvider;
  }
}
