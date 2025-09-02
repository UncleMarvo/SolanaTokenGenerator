import { FC, useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { PublicKey } from "@solana/web3.js";
import { Spinner } from "../components/ui/Spinner";

interface OrcaPosition {
  positionMint: string;
  whirlpool: string;
  lowerTick: number;
  upperTick: number;
  liquidity: string;
  tokenA: string;
  tokenB: string;
  tokenABalance: string;
  tokenBBalance: string;
  feeGrowthCheckpointA: string;
  feeGrowthCheckpointB: string;
  owner: string;
}

interface PositionsData {
  orcaPositions: OrcaPosition[];
  timestamp: number;
}

const PositionsPage: FC = () => {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [positions, setPositions] = useState<PositionsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for wallet connection on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      const wallet = window.solana;
      if (wallet.isConnected && wallet.publicKey) {
        setWalletAddress(wallet.publicKey.toString());
      }
    }
  }, []);

  // Fetch positions when wallet is connected
  useEffect(() => {
    if (walletAddress) {
      fetchPositions();
    }
  }, [walletAddress]);

  const connectWallet = async () => {
    try {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        const wallet = window.solana;
        await wallet.connect();
        if (wallet.publicKey) {
          setWalletAddress(wallet.publicKey.toString());
        }
      } else {
        setError("Phantom wallet not found. Please install Phantom wallet.");
      }
    } catch (error) {
      setError("Failed to connect wallet");
    }
  };

  const fetchPositions = async () => {
    if (!walletAddress) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/positions?owner=${walletAddress}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch positions");
      }

      const data = await response.json();
      setPositions(data);
    } catch (error) {
      console.error("Error fetching positions:", error);
      setError("Failed to fetch positions");
    } finally {
      setIsLoading(false);
    }
  };

  const formatLiquidity = (liquidity: string): string => {
    const num = parseFloat(liquidity);
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const getTokenSymbol = (mint: string): string => {
    // Common token symbols
    const commonTokens: { [key: string]: string } = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      '7dHbWXmci3dT8UFYWYZQBL7CyDq92rNwCB4STcP1LC8k': 'stSOL'
    };
    
    return commonTokens[mint] || mint.slice(0, 4) + '...';
  };

  const renderConnectWallet = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-12 h-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted">Connect your Phantom wallet to view your LP positions</p>
      </div>
      
      <button
        onClick={connectWallet}
        className="bg-primary hover:bg-primary-600 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300"
      >
        Connect Phantom Wallet
      </button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="text-center space-y-6">
      <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-12 h-12 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-2">No Positions Found</h2>
        <p className="text-muted">You don't have any LP positions yet. Start by adding liquidity to a pool!</p>
      </div>
      
      <button
        onClick={() => router.push('/liquidity')}
        className="bg-primary hover:bg-primary-600 text-bg font-bold py-3 px-8 rounded-lg transition-all duration-300"
      >
        Add Liquidity
      </button>
    </div>
  );

  const renderOrcaPositions = () => {
    if (!positions?.orcaPositions.length) return null;

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-accent">Orca Whirlpool Positions</h3>
        <div className="grid gap-4">
          {positions.orcaPositions.map((position, index) => (
            <div key={index} className="bg-bg/40 backdrop-blur-2xl rounded-xl p-6 border border-muted/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-semibold text-fg">
                    {getTokenSymbol(position.tokenA)} / {getTokenSymbol(position.tokenB)}
                  </h4>
                  <p className="text-sm text-muted">Position #{index + 1}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">Liquidity</p>
                  <p className="font-semibold text-fg">{formatLiquidity(position.liquidity)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-muted">Tick Range</p>
                  <p className="text-fg font-mono">{position.lowerTick} → {position.upperTick}</p>
                </div>
                <div>
                  <p className="text-muted">Token A Balance</p>
                  <p className="text-fg">{position.tokenABalance}</p>
                </div>
                <div>
                  <p className="text-muted">Token B Balance</p>
                  <p className="text-fg">{position.tokenBBalance}</p>
                </div>
                <div>
                  <p className="text-muted">Position Mint</p>
                  <p className="text-fg font-mono text-xs">{position.positionMint.slice(0, 8)}...{position.positionMint.slice(-8)}</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <a
                  href={`https://app.orca.so/pools/${position.whirlpool}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-accent hover:bg-accent/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                >
                  View on Orca
                </a>
                <a
                  href={`https://solscan.io/account/${position.positionMint}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                >
                  View on Solscan
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };



  const renderPositions = () => {
    if (isLoading) {
      return (
        <div className="text-center space-y-4">
          <Spinner size={32} />
          <p className="text-muted">Loading your positions...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-error">{error}</p>
          <button
            onClick={fetchPositions}
            className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!positions || !positions.orcaPositions.length) {
      return renderEmptyState();
    }

    return (
      <div className="space-y-8">
        {renderOrcaPositions()}
        
        <div className="text-center">
          <button
            onClick={fetchPositions}
            className="bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-6 rounded-lg transition-all duration-300"
          >
            Refresh Positions
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>My Positions - Solana Token Creator</title>
      </Head>
      
      <div className="min-h-screen bg-bg text-fg">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
                         <div className="text-center mb-8">
               <h1 className="text-4xl font-bold mb-4">My Positions</h1>
               <p className="text-muted">View your Orca Whirlpool LP positions</p>
             </div>

            {walletAddress && (
              <div className="bg-success/20 border border-success/30 rounded-lg p-4 mb-6 text-center">
                <p className="text-success text-sm">
                  ✅ Connected: <strong>{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</strong>
                </p>
              </div>
            )}

            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
              {!walletAddress ? renderConnectWallet() : renderPositions()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PositionsPage;
