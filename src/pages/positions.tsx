import { FC, useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { PublicKey, Transaction, Connection } from "@solana/web3.js";
import { Spinner } from "../components/ui/Spinner";

interface OrcaPosition {
  positionMint: string;
  whirlpool: string;
  lowerTick: number;
  upperTick: number;
  liquidity: string;
  tokenA: string;
  tokenB: string;
  symbolA?: string;
  symbolB?: string;
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
  
  // Filter state for specific token mint
  const [filterMint, setFilterMint] = useState<string | null>(null);
  
  // Position action states
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Connection for transaction confirmation
  const [connection] = useState(() => new Connection(
    process.env.NEXT_PUBLIC_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com"
  ));

  // Check for wallet connection on mount and handle filter parameter
  useEffect(() => {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      const wallet = window.solana;
      if (wallet.isConnected && wallet.publicKey) {
        setWalletAddress(wallet.publicKey.toString());
      }
    }
    
    // Handle filter parameter from URL
    if (router.query.filter && typeof router.query.filter === "string") {
      setFilterMint(router.query.filter);
    }
  }, [router.query.filter]);

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

  // Toast notification function
  const showToast = (message: string, action?: { label: string; onClick: () => void }) => {
    // Simple toast implementation - in production you'd use a proper toast library
    setActionSuccess(message);
    if (action) {
      // Store action for later use
      console.log("Toast action:", action.label);
    }
  };

  // Helper function to handle API errors with new error codes
  const handleApiError = (error: any, defaultMessage: string) => {
    console.error("API Error:", error);
    
    // Check if it's an API error with code
    if (error?.error && error?.message) {
      const { error: errorCode, message } = error;
      
      // Map error codes to user-friendly messages with suggested fixes
      switch (errorCode) {
        case "BlockhashExpired":
          setActionError(`${message} Try refreshing and retry.`);
          break;
        case "InsufficientFunds":
          setActionError(`${message} Check your wallet balance.`);
          break;
        case "UserRejected":
          setActionError(`${message} No action needed.`);
          break;
        case "Slippage":
          setActionError(`${message} Try increasing slippage tolerance.`);
          break;
        default:
          setActionError(message);
      }
    } else {
      // Fallback to old error handling
      const errorMessage = error instanceof Error ? error.message : defaultMessage;
      
      if (errorMessage.includes("User rejected")) {
        setActionError("Transaction was rejected by user");
      } else if (errorMessage.includes("insufficient funds")) {
        setActionError("Insufficient funds for transaction");
      } else if (errorMessage.includes("no position")) {
        setActionError("Position not found or invalid");
      } else {
        setActionError(errorMessage);
      }
    }
  };

  // Position action handlers
  const onIncrease = async (position: OrcaPosition, params: { amountUi: number; inputMint: "A" | "B"; slippageBp?: number }) => {
    if (!walletAddress || !window.solana?.isPhantom) return;
    
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Call the increase API
      const r = await fetch("/api/positions/increase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...position,
          ...params,
          walletPubkey: walletAddress
        })
      });
      
      const j = await r.json();
      if (!r.ok) {
        // Handle API errors with new error codes
        handleApiError(j, "Failed to build increase transaction");
        return;
      }
      
      // Deserialize and sign transaction
      const tx = Transaction.from(Buffer.from(j.txBase64, "base64"));
      const sig = await window.solana.signAndSendTransaction(tx);
      await connection.confirmTransaction(sig, "confirmed");
      
      // Save transaction metadata for LP chips
      try {
        await fetch("/api/positions/saveTx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: position.tokenA, // Use tokenA as the primary mint
            txid: sig,
            whirlpool: position.whirlpool,
            tickLower: position.lowerTick,
            tickUpper: position.upperTick
          })
        });
      } catch (error) {
        console.warn("Failed to save transaction metadata:", error);
      }
      
      showToast("Increased ✓", { 
        label: "View", 
        onClick: () => window.open(`https://solscan.io/tx/${sig}`)
      });
      
      // Refresh positions
      fetchPositions();
      
    } catch (error) {
      // Handle transaction signing/confirmation errors
      handleApiError(error, "Failed to increase liquidity");
    } finally {
      setIsActionLoading(false);
    }
  };

  const onDecrease = async (position: OrcaPosition, params: { percent: number; slippageBp?: number }) => {
    if (!walletAddress || !window.solana?.isPhantom) return;
    
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Call the decrease API
      const r = await fetch("/api/positions/decrease", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...position,
          ...params,
          walletPubkey: walletAddress
        })
      });
      
      const j = await r.json();
      if (!r.ok) {
        // Handle API errors with new error codes
        handleApiError(j, "Failed to build decrease transaction");
        return;
      }
      
      // Deserialize and sign transaction
      const tx = Transaction.from(Buffer.from(j.txBase64, "base64"));
      const sig = await window.solana.signAndSendTransaction(tx);
      await connection.confirmTransaction(sig, "confirmed");
      
      // Save transaction metadata for LP chips
      try {
        await fetch("/api/positions/saveTx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: position.tokenA, // Use tokenA as the primary mint
            txid: sig,
            whirlpool: position.whirlpool,
            tickLower: position.lowerTick,
            tickUpper: position.upperTick
          })
        });
      } catch (error) {
        console.warn("Failed to save transaction metadata:", error);
      }
      
      const action = params.percent >= 100 ? "Closed" : "Decreased";
      showToast(`${action} ✓`, { 
        label: "View", 
        onClick: () => window.open(`https://solscan.io/tx/${sig}`)
      });
      
      // Refresh positions
      fetchPositions();
      
    } catch (error) {
      // Handle transaction signing/confirmation errors
      handleApiError(error, "Failed to decrease liquidity");
    } finally {
      setIsActionLoading(false);
    }
  };

  const onCollect = async (position: OrcaPosition) => {
    if (!walletAddress || !window.solana?.isPhantom) return;
    
    setIsActionLoading(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      // Call the collect API
      const r = await fetch("/api/positions/collect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...position,
          walletPubkey: walletAddress
        })
      });
      
      const j = await r.json();
      if (!r.ok) {
        // Handle API errors with new error codes
        handleApiError(j, "Failed to build collect transaction");
        return;
      }
      
      // Deserialize and sign transaction
      const tx = Transaction.from(Buffer.from(j.txBase64, "base64"));
      const sig = await window.solana.signAndSendTransaction(tx);
      await connection.confirmTransaction(sig, "confirmed");
      
      // Save transaction metadata for LP chips
      try {
        await fetch("/api/positions/saveTx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mint: position.tokenA, // Use tokenA as the primary mint
            txid: sig,
            whirlpool: position.whirlpool,
            tickLower: position.lowerTick,
            tickUpper: position.upperTick
          })
        });
      } catch (error) {
        console.warn("Failed to save transaction metadata:", error);
      }
      
      showToast("Fees collected ✓", { 
        label: "View", 
        onClick: () => window.open(`https://solscan.io/tx/${sig}`)
      });
      
      // Refresh positions
      fetchPositions();
      
    } catch (error) {
      // Handle transaction signing/confirmation errors
      handleApiError(error, "Failed to collect fees");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Modal state
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [showDecreaseModal, setShowDecreaseModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<OrcaPosition | null>(null);
  const [modalForm, setModalForm] = useState({
    amountUi: "",
    inputMint: "A" as "A" | "B",
    percent: "",
    slippageBp: "100"
  });
  const [preflightData, setPreflightData] = useState<any>(null);
  const [isPreflightLoading, setIsPreflightLoading] = useState(false);

  // Preflight check function
  const runPreflightCheck = async (action: "increase" | "decrease" | "collect", position: OrcaPosition, params?: any) => {
    if (!walletAddress) return;
    
    setIsPreflightLoading(true);
    try {
      const response = await fetch("/api/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletPubkey: walletAddress,
          action,
          tokenA: position.tokenA,
          tokenB: position.tokenB,
          ...params
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreflightData(data);
      } else {
        setPreflightData(null);
      }
    } catch (error) {
      console.error("Preflight check failed:", error);
      setPreflightData(null);
    } finally {
      setIsPreflightLoading(false);
    }
  };

  // Enhanced handlers with modals
  const handleIncreaseLiquidity = (position: OrcaPosition) => {
    setSelectedPosition(position);
    setModalForm({ amountUi: "", inputMint: "A", percent: "", slippageBp: "100" });
    setPreflightData(null);
    setShowIncreaseModal(true);
  };

  const handleDecreaseLiquidity = (position: OrcaPosition) => {
    setSelectedPosition(position);
    setModalForm({ amountUi: "", percent: "", inputMint: "A", slippageBp: "100" });
    setPreflightData(null);
    setShowDecreaseModal(true);
  };

  const handleCollectFees = async (position: OrcaPosition) => {
    await onCollect(position);
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

    // Filter positions if filterMint is set
    let filteredPositions = positions.orcaPositions;
    if (filterMint) {
      filteredPositions = positions.orcaPositions.filter(position => 
        position.tokenA === filterMint || position.tokenB === filterMint
      );
    }

    if (filteredPositions.length === 0) {
      return (
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-muted">No Matching Positions</h3>
            <p className="text-sm text-muted">
              {filterMint ? `No positions found for the filtered token.` : "No positions found."}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-accent">
          Orca Whirlpool Positions
          {filterMint && (
            <span className="text-sm font-normal text-muted ml-2">
              (Filtered: {filteredPositions.length} of {positions.orcaPositions.length})
            </span>
          )}
        </h3>
        <div className="grid gap-4">
          {filteredPositions.map((position, index) => (
            <div key={index} className="bg-bg/40 backdrop-blur-2xl rounded-xl p-6 border border-muted/10">
              <div className="flex justify-between items-start mb-4">
                <div>
                                   <h4 className="font-semibold text-fg">
                   {position.symbolA && position.symbolB 
                     ? `${position.symbolA} / ${position.symbolB}`
                     : `${getTokenSymbol(position.tokenA)} / ${getTokenSymbol(position.tokenB)}`
                   }
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
                   <p className="text-muted">Token A</p>
                   <p className="text-fg">{position.symbolA || getTokenSymbol(position.tokenA)}</p>
                 </div>
                 <div>
                   <p className="text-muted">Token B</p>
                   <p className="text-fg">{position.symbolB || getTokenSymbol(position.tokenB)}</p>
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
               
                               {/* Position Management Actions */}
                <div className="flex space-x-2 mt-4 pt-4 border-t border-muted/20">
                  <button
                    onClick={() => handleIncreaseLiquidity(position)}
                    disabled={isActionLoading}
                    className={`font-bold py-2 px-3 rounded-lg transition-all duration-300 text-xs ${
                      isActionLoading 
                        ? "bg-muted/50 text-muted cursor-not-allowed" 
                        : "bg-success hover:bg-success/80 text-bg"
                    }`}
                  >
                    {isActionLoading ? "Loading..." : "Increase"}
                  </button>
                  <button
                    onClick={() => handleDecreaseLiquidity(position)}
                    disabled={isActionLoading}
                    className={`font-bold py-2 px-3 rounded-lg transition-all duration-300 text-xs ${
                      isActionLoading 
                        ? "bg-muted/50 text-muted cursor-not-allowed" 
                        : "bg-warning hover:bg-warning/80 text-bg"
                    }`}
                  >
                    {isActionLoading ? "Loading..." : "Decrease"}
                  </button>
                  <button
                    onClick={() => handleCollectFees(position)}
                    disabled={isActionLoading}
                    className={`font-bold py-2 px-3 rounded-lg transition-all duration-300 text-xs ${
                      isActionLoading 
                        ? "bg-muted/50 text-muted cursor-not-allowed" 
                        : "bg-info hover:bg-info/80 text-bg"
                    }`}
                  >
                    {isActionLoading ? "Loading..." : "Collect Fees"}
                  </button>
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

             {/* Filter Display */}
             {filterMint && (
               <div className="bg-info/20 border border-info/30 rounded-lg p-4 mb-6">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center space-x-3">
                     <div className="text-info">🔍</div>
                     <div>
                       <p className="text-info text-sm font-semibold">Filtered by Token</p>
                       <p className="text-info text-xs font-mono">{filterMint.slice(0, 8)}...{filterMint.slice(-8)}</p>
                     </div>
                   </div>
                   <button
                     onClick={() => {
                       setFilterMint(null);
                       router.replace('/positions', undefined, { shallow: true });
                     }}
                     className="bg-info hover:bg-info/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                   >
                     Clear Filter
                   </button>
                 </div>
               </div>
             )}

             {/* Action Status Messages */}
             {actionError && (
               <div className="bg-error/20 border border-error/30 rounded-lg p-4 mb-6 text-center">
                 <p className="text-error text-sm">
                   ❌ {actionError}
                 </p>
               </div>
             )}

             {actionSuccess && (
               <div className="bg-success/20 border border-success/30 rounded-lg p-4 mb-6 text-center">
                 <p className="text-success text-sm">
                   ✅ {actionSuccess}
                 </p>
               </div>
             )}

             {isActionLoading && (
               <div className="bg-info/20 border border-info/30 rounded-lg p-4 mb-6 text-center">
                 <div className="flex items-center justify-center space-x-2">
                   <Spinner size={16} />
                   <p className="text-info text-sm">Processing position action...</p>
                 </div>
               </div>
             )}

                         <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
               {!walletAddress ? renderConnectWallet() : renderPositions()}
             </div>
           </div>
         </div>
       </div>

       {/* Increase Liquidity Modal */}
       {showIncreaseModal && selectedPosition && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/[.3] backdrop-blur-[10px]">
           <div className="bg-bg/90 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 max-w-md w-full mx-4">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">Increase Liquidity</h3>
               <button
                 onClick={() => setShowIncreaseModal(false)}
                 className="text-muted hover:text-fg"
               >
                 ✕
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-muted mb-2 font-semibold">Amount</label>
                 <input
                   type="number"
                   value={modalForm.amountUi}
                   onChange={(e) => {
                     const value = e.target.value;
                     setModalForm(prev => ({ ...prev, amountUi: value }));
                     if (value && modalForm.inputMint) {
                       runPreflightCheck("increase", selectedPosition, {
                         amountUi: parseFloat(value),
                         inputMint: modalForm.inputMint
                       });
                     }
                   }}
                   className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                   placeholder="0.0"
                   step="0.01"
                   min="0"
                 />
               </div>
               
               <div>
                 <label className="block text-muted mb-2 font-semibold">Input Token</label>
                 <select
                   value={modalForm.inputMint}
                   onChange={(e) => {
                     const value = e.target.value as "A" | "B";
                     setModalForm(prev => ({ ...prev, inputMint: value }));
                     if (modalForm.amountUi && value) {
                       runPreflightCheck("increase", selectedPosition, {
                         amountUi: parseFloat(modalForm.amountUi),
                         inputMint: value
                       });
                     }
                   }}
                   className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                 >
                   <option value="A">Token A ({selectedPosition.symbolA || "Unknown"})</option>
                   <option value="B">Token B ({selectedPosition.symbolB || "Unknown"})</option>
                 </select>
               </div>
               
               <div>
                 <label className="block text-muted mb-2 font-semibold">Slippage (basis points)</label>
                 <input
                   type="number"
                   value={modalForm.slippageBp}
                   onChange={(e) => setModalForm(prev => ({ ...prev, slippageBp: e.target.value }))}
                   className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                   placeholder="100"
                   min="10"
                   max="500"
                   step="10"
                 />
                 <p className="text-xs text-muted mt-1">Slippage 0.10%–5.00% (default 1.00%)</p>
               </div>

               {/* Preflight Results */}
               {isPreflightLoading && (
                 <div className="bg-info/20 border border-info/30 rounded-lg p-4 text-center">
                   <div className="flex items-center justify-center space-x-2">
                     <Spinner size={16} />
                     <p className="text-info text-sm">Checking balances...</p>
                   </div>
                 </div>
               )}

               {preflightData && (
                 <div className="space-y-3">
                   <div className="bg-muted/10 rounded-lg p-4">
                     <h4 className="font-semibold mb-2">Balance Check</h4>
                     <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span>Token A Balance:</span>
                         <span className={preflightData.balances.A < preflightData.need.A ? "text-error" : "text-success"}>
                           {preflightData.balances.A.toFixed(4)}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span>Token B Balance:</span>
                         <span className={preflightData.balances.B < preflightData.need.B ? "text-error" : "text-success"}>
                           {preflightData.balances.B.toFixed(4)}
                         </span>
                       </div>
                       {preflightData.need.A > 0 && (
                         <div className="flex justify-between">
                           <span>Need Token A:</span>
                           <span className="text-warning">{preflightData.need.A.toFixed(4)}</span>
                         </div>
                       )}
                       {preflightData.need.B > 0 && (
                         <div className="flex justify-between">
                           <span>Need Token B:</span>
                           <span className="text-warning">{preflightData.need.B.toFixed(4)}</span>
                         </div>
                       )}
                     </div>
                   </div>

                   {preflightData.warnings.length > 0 && (
                     <div className="bg-warning/20 border border-warning/30 rounded-lg p-4">
                       <h4 className="font-semibold mb-2 text-warning">Warnings</h4>
                       <ul className="space-y-1 text-sm">
                         {preflightData.warnings.map((warning: string, index: number) => (
                           <li key={index} className="text-warning">• {warning}</li>
                         ))}
                       </ul>
                     </div>
                   )}

                   {!preflightData.canProceed && (
                     <div className="bg-error/20 border border-error/30 rounded-lg p-4">
                       <p className="text-error text-sm font-medium">
                         ❌ Insufficient balance to proceed
                       </p>
                     </div>
                   )}
                 </div>
               )}
             </div>

             <div className="flex space-x-3 mt-6">
               <button
                 onClick={() => setShowIncreaseModal(false)}
                 className="flex-1 bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-4 rounded-lg transition-all duration-300"
               >
                 Cancel
               </button>
               <button
                 onClick={async () => {
                   if (selectedPosition && preflightData?.canProceed) {
                     await onIncrease(selectedPosition, {
                       amountUi: parseFloat(modalForm.amountUi),
                       inputMint: modalForm.inputMint,
                       slippageBp: parseInt(modalForm.slippageBp)
                     });
                     setShowIncreaseModal(false);
                   }
                 }}
                 disabled={!preflightData?.canProceed || isPreflightLoading}
                 className="flex-1 bg-success hover:bg-success/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isPreflightLoading ? "Checking..." : "Confirm Increase"}
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Decrease Liquidity Modal */}
       {showDecreaseModal && selectedPosition && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/[.3] backdrop-blur-[10px]">
           <div className="bg-bg/90 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 max-w-md w-full mx-4">
             <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold">Decrease Liquidity</h3>
               <button
                 onClick={() => setShowDecreaseModal(false)}
                 className="text-muted hover:text-fg"
               >
                 ✕
               </button>
             </div>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-muted mb-2 font-semibold">Percentage to Decrease</label>
                 <input
                   type="number"
                   value={modalForm.percent}
                   onChange={(e) => {
                     const value = e.target.value;
                     setModalForm(prev => ({ ...prev, percent: value }));
                     if (value) {
                       runPreflightCheck("decrease", selectedPosition, {
                         percent: parseFloat(value)
                       });
                     }
                   }}
                   className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                   placeholder="0"
                   min="0"
                   max="100"
                   step="1"
                 />
                 <p className="text-xs text-muted mt-1">Enter 0-100 (100 = close position completely)</p>
               </div>
               
               <div>
                 <label className="block text-muted mb-2 font-semibold">Slippage (basis points)</label>
                 <input
                   type="number"
                   value={modalForm.slippageBp}
                   onChange={(e) => setModalForm(prev => ({ ...prev, slippageBp: e.target.value }))}
                   className="w-full p-3 rounded-lg border border-muted/10 bg-transparent text-fg focus:border-muted/25 focus:ring-transparent"
                   placeholder="100"
                   min="10"
                   max="500"
                   step="10"
                 />
                 <p className="text-xs text-muted mt-1">Slippage 0.10%–5.00% (default 1.00%)</p>
               </div>

               {/* Preflight Results */}
               {isPreflightLoading && (
                 <div className="bg-info/20 border border-info/30 rounded-lg p-4 text-center">
                   <div className="flex items-center justify-center space-x-2">
                     <Spinner size={16} />
                     <p className="text-sm">Checking position...</p>
                   </div>
                 </div>
               )}

               {preflightData && (
                 <div className="space-y-3">
                   {preflightData.warnings.length > 0 && (
                     <div className="bg-warning/20 border border-warning/30 rounded-lg p-4">
                       <h4 className="font-semibold mb-2 text-warning">Warnings</h4>
                       <ul className="space-y-1 text-sm">
                         {preflightData.warnings.map((warning: string, index: number) => (
                           <li key={index} className="text-warning">• {warning}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               )}
             </div>

             <div className="flex space-x-3 mt-6">
               <button
                 onClick={() => setShowDecreaseModal(false)}
                 className="flex-1 bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-4 rounded-lg transition-all duration-300"
               >
                 Cancel
               </button>
               <button
                 onClick={async () => {
                   if (selectedPosition) {
                     await onDecrease(selectedPosition, {
                       percent: parseFloat(modalForm.percent),
                       slippageBp: parseInt(modalForm.slippageBp)
                     });
                     setShowDecreaseModal(false);
                   }
                 }}
                 disabled={!modalForm.percent || parseFloat(modalForm.percent) <= 0 || parseFloat(modalForm.percent) > 100}
                 className="flex-1 bg-warning hover:bg-warning/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Confirm Decrease
               </button>
             </div>
           </div>
         </div>
       )}
     </>
   );
 };

export default PositionsPage;
