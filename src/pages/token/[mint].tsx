import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { tokenStorage, StoredToken } from "../../utils/tokenStorage";
import { PresetBadge } from "../../components/PresetBadge";
import HonestBadge from "../../components/HonestBadge";
import HonestLaunchEnforcer from "../../components/HonestLaunchEnforcer";
import TokenStats from "../../components/TokenStats";
import { AiOutlineCopy, AiOutlineLink, AiOutlineReload } from "react-icons/ai";
import { FaTelegram, FaTwitter } from "react-icons/fa";
import {
  LpChips,
  formatLpUsd,
  getRangeDisplay,
  getHonestDisplay,
  getLastTxElement,
} from "../../lib/lpStats";
import { getSocialShareUrls } from "../../helpers/share";
import dynamic from "next/dynamic";

// Dynamically import WsolDustBanner to avoid SSR issues
const WsolDustBanner = dynamic(
  () => import("../../components/WsolDustBanner"),
  { ssr: false }
);

const TokenSharePage: FC = () => {
  const router = useRouter();
  const { mint } = router.query;
  const [token, setToken] = useState<StoredToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isOnChainVerified, setIsOnChainVerified] = useState(false);
  const [creatorWallet, setCreatorWallet] = useState<string | null>(null);

  // LP chips state
  const [lpChips, setLpChips] = useState<LpChips | null>(null);
  const [isLpLoading, setIsLpLoading] = useState(false);

  // Wallet LP state
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLP, setWalletLP] = useState<{
    has: boolean;
    positionsCount: number;
  } | null>(null);
  const [isWalletLPLoading, setIsWalletLPLoading] = useState(false);

  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Check for wallet connection on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.solana?.isPhantom) {
      const wallet = window.solana;
      if (wallet.isConnected && wallet.publicKey) {
        setWalletAddress(wallet.publicKey.toString());
      }
    }
  }, []);

  // Fetch wallet LP when wallet connects
  useEffect(() => {
    if (walletAddress && mint) {
      fetchWalletLP();
    }
  }, [walletAddress, mint]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const id = setInterval(() => {
        fetchLpChips();
        if (walletAddress) {
          fetchWalletLP();
        }
      }, 30000); // 30 seconds

      return () => clearInterval(id);
    }
  }, [autoRefresh, walletAddress, mint]);

  useEffect(() => {
    if (mint && typeof mint === "string") {
      fetchTokenData();
    }
  }, [mint]);

  // Function to fetch token data from database (primary) or localStorage (fallback)
  const fetchTokenData = async () => {
    try {
      // First, try to get from localStorage (fast, for recent tokens)
      let tokenData = tokenStorage.getToken(mint as string);

      // If not found in localStorage, fetch from database
      if (!tokenData) {
        const response = await fetch(`/api/token/metadata?mint=${mint}`);
        if (response.ok) {
          const result = await response.json();
          if (result.ok && result.token) {
            tokenData = result.token;
            // Store in localStorage for future use
            tokenStorage.storeToken(tokenData);
          }
        }
      }

      setToken(tokenData);
      setIsLoading(false);

      // Fetch LP chips data and creator wallet
      fetchLpChips();
      fetchCreatorWallet();
    } catch (error) {
      console.error("Error fetching token data:", error);
      setIsLoading(false);
    }
  };

  // Function to connect wallet
  const connectWallet = async () => {
    try {
      if (typeof window !== "undefined" && window.solana?.isPhantom) {
        const wallet = window.solana;
        await wallet.connect();
        if (wallet.publicKey) {
          setWalletAddress(wallet.publicKey.toString());
        }
      } else {
        console.error("Phantom wallet not found");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  // Function to fetch wallet LP data
  const fetchWalletLP = async () => {
    if (!mint || typeof mint !== "string" || !walletAddress) return;

    setIsWalletLPLoading(true);
    try {
      const response = await fetch(
        `/api/token/wallet-lp?mint=${mint}&owner=${walletAddress}&t=${Date.now()}`
      );
      if (response.ok) {
        const data = await response.json();
        setWalletLP(data);
      }
    } catch (error) {
      console.error("Failed to fetch wallet LP:", error);
    } finally {
      setIsWalletLPLoading(false);
    }
  };

  // Function to fetch LP chips data
  const fetchLpChips = async () => {
    if (!mint || typeof mint !== "string") return;

    setIsLpLoading(true);
    try {
      const response = await fetch(
        `/api/token/lp?mint=${mint}&t=${Date.now()}`
      );
      if (response.ok) {
        const data = await response.json();
        setLpChips(data);
      }
    } catch (error) {
      console.error("Failed to fetch LP chips:", error);
    } finally {
      setIsLpLoading(false);
    }
  };

  // Function to fetch creator wallet information
  const fetchCreatorWallet = async () => {
    if (!mint || typeof mint !== "string") return;

    try {
      const response = await fetch(`/api/token/creator?mint=${mint}`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok) {
          setCreatorWallet(data.creator);
        }
      }
    } catch (error) {
      console.error("Failed to fetch creator wallet:", error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy link:", error);
    }
  };

  const handleOpenDexScreener = () => {
    if (token) {
      window.open(
        `https://dexscreener.com/solana/${token.mintAddress}`,
        "_blank"
      );
    }
  };

  // Handle honest launch verification status changes
  const handleVerificationChange = (isVerified: boolean) => {
    setIsOnChainVerified(isVerified);
  };

  // Handle enforce action with cache busting
  const handleEnforce = async () => {
    if (!mint || typeof mint !== "string") return;

    try {
      // Call the honest verification function (this would be the actual enforce logic)
      const response = await fetch("/api/token/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mint: mint,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.verified) {
          // Success - now bust the cache and refresh
          await bustCacheAndRefresh();
          setIsOnChainVerified(true);
        } else {
          alert(
            "⚠️ Token verification failed: " +
              (result.reason || "Unknown reason")
          );
        }
      } else {
        alert("❌ Verification check failed");
      }
    } catch (error) {
      alert("❌ Error checking verification: " + error);
    }
  };

  // Function to bust cache and refresh honest status
  const bustCacheAndRefresh = async () => {
    if (!mint || typeof mint !== "string") return;

    try {
      // Invalidate the cache
      await fetch("/api/honest-status/invalidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mint }),
      }).catch(() => {});

      // Optionally force a fresh read
      await fetch("/api/honest-status/batch?bust=1", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mints: [mint] }),
      }).catch(() => {});

      // Trigger a local refresh by re-fetching the creator wallet
      // This will cause the HonestBadge to re-render with fresh data
      await fetchCreatorWallet();
    } catch (error) {
      console.error("Failed to bust cache:", error);
    }
  };

  // Format shill post with metrics and link
  const formatShill = () => {
    if (!token) return "";

    // Get current metrics from LP chips or use defaults
    const price = lpChips?.lpUsd ? `$${lpChips.lpUsd.toFixed(4)}` : "$0.0000";
    const chg = "0"; // Placeholder - could be enhanced with real 24h change data
    const lp = lpChips?.lpUsd ? `$${lpChips.lpUsd.toLocaleString()}` : "$0";
    const pageUrl = window.location.href;

    return `${token.name} ($${token.symbol})\nPrice: ${price}\n24h: ${chg}%\nLP: $${lp}\n${pageUrl}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted">Loading token...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Token Not Found</h1>
          <p className="text-muted mb-6">
            The token you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-6 rounded-lg transition-all duration-300"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {token.name} (${token.symbol}) - Solana Token
        </title>
        <meta
          name="description"
          content={`${token.name} ($${
            token.symbol
          }) - A Solana token created with ${
            token.preset === "honest" ? "Honest Launch" : "Degen Mode"
          } preset.`}
        />

        {/* Open Graph Tags */}
        <meta
          property="og:title"
          content={`${token.name} ($${token.symbol})`}
        />
        <meta
          property="og:description"
          content={`${token.name} ($${
            token.symbol
          }) - A Solana token created with ${
            token.preset === "honest" ? "Honest Launch" : "Degen Mode"
          } preset.`}
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:url"
          content={typeof window !== "undefined" ? window.location.href : ""}
        />
        <meta
          property="og:image"
          content={`/api/kits/${
            token.symbol
          }/og_1200x630.png?name=${encodeURIComponent(token.name)}&vibe=${
            token.vibe || "degen"
          }&preset=${token.preset}`}
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${token.name} ($${token.symbol})`}
        />
        <meta
          name="twitter:description"
          content={`${token.name} ($${
            token.symbol
          }) - A Solana token created with ${
            token.preset === "honest" ? "Honest Launch" : "Degen Mode"
          } preset.`}
        />
        <meta
          name="twitter:image"
          content={`/api/kits/${
            token.symbol
          }/og_1200x630.png?name=${encodeURIComponent(token.name)}&vibe=${
            token.vibe || "degen"
          }&preset=${token.preset}`}
        />
      </Head>

      <div className="min-h-screen bg-bg text-fg">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            {/* Premium Hero Section */}
            <div className="text-center mb-4">
              <div className="mx-auto inline-flex items-center justify-center w-28 h-28 rounded-full bg-neutral-900 relative">
                <img
                  src={token.image || "/brand/meme-placeholder.png"}
                  alt={`${token.name} logo`}
                  className="w-20 h-20 object-contain relative z-10"
                />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow:
                      "0 0 60px 10px rgba(0,229,255,0.25), 0 0 90px 20px rgba(124,77,255,0.15)",
                  }}
                />
              </div>
              <h1 className="h1 mt-4">
                {token.name}{" "}
                <span className="text-neutral-400">({token.symbol})</span>
              </h1>
              <p className="small mt-1">
                {isOnChainVerified
                  ? "✅ Honest Launch Verified"
                  : "🔒 Preset: " + token.preset}
              </p>
            </div>

            {/* Token Details Section */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-8">
              <div className="text-center mb-6">
                <p className="text-muted max-w-md mx-auto">
                  {token.description}
                </p>

                {/* Honest Badge and Preset Badge */}
                <div className="mt-4 space-y-3">
                  {/* HonestBadge - shows honest launch status and enforce button for creator */}
                  {/*                   
                  {creatorWallet && (
                    <HonestBadge
                      mint={token.mintAddress}
                      creator={creatorWallet}
                      onEnforce={handleEnforce}
                    />
                  )} 
                  */}

                  {/* Preset Badge - shows the original preset */}
                  <PresetBadge
                    preset={token.preset}
                    isOnChainVerified={isOnChainVerified}
                  />

                  {/* Honest Launch Enforcer - shows verification status or enforcement button */}
                  <HonestLaunchEnforcer
                    mintAddress={token.mintAddress}
                    preset={token.preset}
                    onVerificationChange={handleVerificationChange}
                  />
                </div>
              </div>

              {/* Token Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted">Supply:</span>
                  <div className="font-medium">
                    {parseInt(token.amount).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Decimals:</span>
                  <div className="font-medium">{token.decimals}</div>
                </div>
                <div>
                  <span className="text-muted">Created:</span>
                  <div className="font-medium">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Mint:</span>
                  <div className="font-mono text-xs truncate">
                    {token.mintAddress.slice(0, 8)}...
                    {token.mintAddress.slice(-8)}
                  </div>
                </div>
              </div>
            </div>

            {/* WSOL Dust Banner */}
            <WsolDustBanner />

            {/* Live Analytics */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <h2 className="text-xl font-bold mb-6">Live Analytics</h2>
              <TokenStats
                mint={token.mintAddress}
                tokenName={token.name}
                tokenSymbol={token.symbol}
              />
            </div>

            {/* LP Status Chips */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">LP Status</h2>
                <div className="flex items-center space-x-4">
                  {!walletAddress ? (
                    <button
                      onClick={connectWallet}
                      className="flex items-center space-x-2 bg-primary hover:bg-primary-600 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300"
                    >
                      <span>👛 Connect Wallet</span>
                    </button>
                  ) : (
                    <div className="text-sm text-muted">
                      👛 {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      fetchLpChips();
                      if (walletAddress) {
                        fetchWalletLP();
                      }
                    }}
                    disabled={isLpLoading || isWalletLPLoading}
                    className="flex items-center space-x-2 bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-4 rounded-lg transition-all duration-300 disabled:opacity-50"
                  >
                    <AiOutlineReload
                      size={16}
                      className={
                        isLpLoading || isWalletLPLoading ? "animate-spin" : ""
                      }
                    />
                    <span>
                      {isLpLoading || isWalletLPLoading
                        ? "Refreshing..."
                        : "Refresh"}
                    </span>
                  </button>

                  {/* Auto-refresh toggle */}
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRefresh}
                        onChange={(e) => setAutoRefresh(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoRefresh ? "bg-primary" : "bg-muted/30"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoRefresh ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </div>
                      <span className="text-sm text-muted font-medium">
                        Auto-refresh (30s)
                      </span>
                    </label>
                  </div>

                  {/* Copy Shill Bundle Button */}
                  <button
                    onClick={async () => {
                      try {
                        const shillText = formatShill();
                        await navigator.clipboard.writeText(shillText);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      } catch (error) {
                        console.error("Failed to copy shill bundle:", error);
                      }
                    }}
                    className={`btn btn-secondary transition-all duration-300 flex items-center space-x-2 ${
                      copySuccess
                        ? "bg-success text-bg"
                        : "bg-accent hover:bg-accent/80 text-bg"
                    }`}
                    title="Copy preformatted shill post with metrics and link"
                  >
                    <AiOutlineCopy size={16} />
                    <span>{copySuccess ? "Copied!" : "Copy Shill Bundle"}</span>
                  </button>
                </div>
              </div>

              {/* LP Status Chips */}
              <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {/* LP Size */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">💧</div>
                    <div className="text-sm text-muted mb-1">LP Size</div>
                    <div className="font-semibold text-lg">
                      {isLpLoading ? (
                        <div className="animate-pulse">
                          <div className="h-6 bg-muted/30 rounded w-20 mx-auto"></div>
                        </div>
                      ) : (
                        (() => {
                          const display = formatLpUsd(lpChips?.lpUsd);
                          if (display === "—") {
                            return (
                              <span
                                className="text-muted cursor-help"
                                title="Data unavailable. Try Refresh."
                              >
                                —
                              </span>
                            );
                          }
                          return display;
                        })()
                      )}
                    </div>
                  </div>

                  {/* Range Status */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <div className="text-sm text-muted mb-1">Range</div>
                    <div className="font-semibold text-lg">
                      {isLpLoading ? (
                        <div className="animate-pulse">
                          <div className="h-6 bg-muted/30 rounded w-16 mx-auto"></div>
                        </div>
                      ) : (
                        (() => {
                          const display = getRangeDisplay(lpChips?.inRange);
                          if (display === "🎯 —") {
                            return (
                              <span
                                className="text-muted cursor-help"
                                title="Data unavailable. Try Refresh."
                              >
                                🎯 —
                              </span>
                            );
                          }
                          return display;
                        })()
                      )}
                    </div>
                  </div>

                  {/* Honest Verification */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">✅</div>
                    <div className="text-sm text-muted mb-1">Verification</div>
                    <div className="font-semibold text-lg">
                      {isLpLoading ? (
                        <div className="animate-pulse">
                          <div className="h-6 bg-muted/30 rounded w-24 mx-auto"></div>
                        </div>
                      ) : (
                        (() => {
                          const display = getHonestDisplay(lpChips?.honest);
                          if (display === "⚠️ —") {
                            return (
                              <span
                                className="text-muted cursor-help"
                                title="Data unavailable. Try Refresh."
                              >
                                ⚠️ —
                              </span>
                            );
                          }
                          return display;
                        })()
                      )}
                    </div>
                  </div>

                  {/* Last Transaction */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">🔗</div>
                    <div className="text-sm text-muted mb-1">Last TX</div>
                    <div className="font-semibold text-lg">
                      {isLpLoading ? (
                        <div className="animate-pulse">
                          <div className="h-6 bg-muted/30 rounded w-20 mx-auto"></div>
                        </div>
                      ) : (
                        (() => {
                          const txElement = getLastTxElement(lpChips?.lastTx);
                          if (txElement.href) {
                            return (
                              <a
                                href={txElement.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 underline transition-colors"
                              >
                                {txElement.text}
                              </a>
                            );
                          }
                          if (txElement.text === "🔗 —") {
                            return (
                              <span
                                className="text-muted cursor-help"
                                title="Data unavailable. Try Refresh."
                              >
                                🔗 —
                              </span>
                            );
                          }
                          return txElement.text;
                        })()
                      )}
                    </div>
                  </div>

                  {/* Wallet LP Badge */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl mb-2">👛</div>
                    <div className="text-sm text-muted mb-1">Your LP</div>
                    <div className="font-semibold text-lg">
                      {!walletAddress ? (
                        <span className="text-muted">Connect</span>
                      ) : isWalletLPLoading ? (
                        <div className="animate-pulse">
                          <div className="h-6 bg-muted/30 rounded w-16 mx-auto"></div>
                        </div>
                      ) : walletLP ? (
                        <span
                          className={
                            walletLP.has ? "text-success" : "text-muted"
                          }
                        >
                          {walletLP.has ? "Yes" : "No"}
                        </span>
                      ) : (
                        <span
                          className="text-muted cursor-help"
                          title="Data unavailable. Try Refresh."
                        >
                          —
                        </span>
                      )}
                    </div>
                    {walletLP?.positionsCount > 0 && (
                      <div className="text-xs text-muted mt-1">
                        {walletLP.positionsCount} position
                        {walletLP.positionsCount !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-sm text-muted">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>

                {/* Data Source Info */}
                {lpChips?.source && (
                  <div className="mt-4 text-center">
                    <span className="chip text-muted">
                      Data source: {lpChips.source}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Proof Section */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-muted group-open:text-fg transition-colors">
                      Proof
                    </h2>
                    <div className="text-muted group-open:text-fg transition-colors">
                      <svg
                        className="w-5 h-5 transform group-open:rotate-180 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </summary>

                <div className="mt-2 space-y-4">
                  {/* Check if there's anything to show */}
                  {!isOnChainVerified && !lpChips?.lastTx && !walletLP?.has ? (
                    <div className="text-center py-4">
                      <h3 className="text-lg font-semibold text-muted mb-2">
                        No proofs yet
                      </h3>
                      <p className="text-sm text-muted mb-4">
                        Add liquidity or enforce Honest Launch to generate proof
                        data.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <a
                          href={`/liquidity?tokenMint=${encodeURIComponent(
                            token.mintAddress
                          )}&dex=Raydium&pair=SOL/TOKEN`}
                          className="btn btn-primary"
                        >
                          Add Liquidity
                        </a>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(
                                "/api/token/verify",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    mint: token.mintAddress,
                                  }),
                                }
                              );

                              if (response.ok) {
                                const result = await response.json();
                                if (result.verified) {
                                  alert(
                                    "✅ Token verified as honest on-chain!"
                                  );
                                  setIsOnChainVerified(true);
                                } else {
                                  alert(
                                    "⚠️ Token verification failed: " +
                                      (result.reason || "Unknown reason")
                                  );
                                }
                              } else {
                                alert("❌ Verification check failed");
                              }
                            } catch (error) {
                              alert("❌ Error checking verification: " + error);
                            }
                          }}
                          className="btn btn-secondary"
                        >
                          Check Honest Launch
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Honest Verification */}
                      <div className="bg-muted/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-semibold">
                                Honest Verification
                              </h3>
                              <p className="text-sm text-muted">
                                {isOnChainVerified
                                  ? "Verified on-chain"
                                  : "Not yet verified"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                // Call the honest verification function
                                const response = await fetch(
                                  "/api/token/verify",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      mint: token.mintAddress,
                                    }),
                                  }
                                );

                                if (response.ok) {
                                  const result = await response.json();
                                  // Show toast with result
                                  if (result.verified) {
                                    alert(
                                      "✅ Token verified as honest on-chain!"
                                    );
                                    setIsOnChainVerified(true);
                                  } else {
                                    alert(
                                      "⚠️ Token verification failed: " +
                                        (result.reason || "Unknown reason")
                                    );
                                  }
                                } else {
                                  alert("❌ Verification check failed");
                                }
                              } catch (error) {
                                alert(
                                  "❌ Error checking verification: " + error
                                );
                              }
                            }}
                            className="btn btn-primary hover:bg-primary-600 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                          >
                            Check on Chain
                          </button>
                        </div>
                      </div>

                      {/* Last Transaction */}
                      {lpChips?.lastTx && (
                        <div className="bg-muted/10 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">🔗</div>
                              <div>
                                <h3 className="font-semibold">
                                  Last Transaction
                                </h3>
                                <p className="text-sm text-muted">
                                  Most recent LP activity
                                </p>
                              </div>
                            </div>
                            <a
                              href={`https://solscan.io/tx/${lpChips.lastTx}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-accent hover:bg-accent/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                            >
                              View on Solscan
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Wallet LP Positions Link */}
                      {walletLP?.has && (
                        <div className="bg-muted/10 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-2xl">👛</div>
                              <div>
                                <h3 className="font-semibold">
                                  Your Positions
                                </h3>
                                <p className="text-sm text-muted">
                                  {walletLP.positionsCount} position
                                  {walletLP.positionsCount !== 1
                                    ? "s"
                                    : ""}{" "}
                                  found
                                </p>
                              </div>
                            </div>
                            <a
                              href={`/positions?filter=${encodeURIComponent(
                                token.mintAddress
                              )}`}
                              className="bg-success hover:bg-success/80 text-bg font-bold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                            >
                              View Positions
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Copy Proof Button */}
                      <div className="flex justify-center pt-4">
                        <button
                          onClick={async () => {
                            try {
                              let proofText = `Proof for ${token.name} ($${token.symbol}):\n`;

                              // Add honest verification status
                              proofText += `✅ Honest: ${
                                isOnChainVerified ? "Verified" : "Not verified"
                              }\n`;

                              // Add last transaction if available
                              if (lpChips?.lastTx) {
                                proofText += `🔗 Last TX: https://solscan.io/tx/${lpChips.lastTx}\n`;
                              }

                              // Add wallet LP status if available
                              if (walletLP?.has) {
                                proofText += `👛 Your LP: Yes (${
                                  walletLP.positionsCount
                                } position${
                                  walletLP.positionsCount !== 1 ? "s" : ""
                                })\n`;
                              }

                              // Add token page link
                              proofText += `🔗 Token: ${window.location.href}`;

                              await navigator.clipboard.writeText(proofText);
                              alert("✅ Proof copied to clipboard!");
                            } catch (error) {
                              alert("❌ Failed to copy proof: " + error);
                            }
                          }}
                          className="btn btn-secondary duration-300 flex items-center space-x-2"
                        >
                          <AiOutlineCopy size={16} />
                          <span>Copy Proof</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </details>
            </div>

            {/* Action Buttons */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <h2 className="h3 mb-6">Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <a
                  href={`/meme-kit?name=${encodeURIComponent(
                    token.name
                  )}&ticker=${encodeURIComponent(token.symbol)}`}
                  className="btn btn-primary"
                >
                  Get Meme Kit
                </a>

                <a
                  href={`/api/meme/kit.zip?name=${encodeURIComponent(
                    token.name
                  )}&ticker=${encodeURIComponent(
                    token.symbol
                  )}&vibe=degen&preset=${encodeURIComponent(
                    token.preset
                  )}&shareUrl=${encodeURIComponent(window.location.href)}`}
                  className="btn btn-primary"
                >
                  Download ZIP
                </a>

                <a
                  href={`/liquidity?tokenMint=${encodeURIComponent(
                    token.mintAddress
                  )}&dex=Raydium&pair=SOL/TOKEN`}
                  className="btn btn-primary"
                >
                  Add Liquidity
                </a>

                <button
                  onClick={handleOpenDexScreener}
                  className="btn btn-secondary"
                >
                  Open on DexScreener
                </button>

                <button
                  onClick={handleCopyLink}
                  className={`btn btn-secondary duration-300 flex items-center justify-center space-x-2 ${
                    copySuccess
                      ? "bg-success text-bg"
                      : "bg-accent hover:bg-accent/80 text-bg"
                  }`}
                >
                  <AiOutlineCopy size={16} />
                  <span>{copySuccess ? "Copied!" : "Copy Share Link"}</span>
                </button>
              </div>
            </div>

            {/* Share Section */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <h2 className="text-xl font-bold mb-6">Share</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Share on X (Twitter) */}
                <button
                  onClick={() => {
                    const shareUrls = getSocialShareUrls(
                      window.location.href,
                      token.name,
                      token.symbol
                    );
                    window.open(shareUrls.twitter, "_blank");
                  }}
                  className="btn btn-primary duration-300 flex items-center justify-center space-x-2"
                >
                  <FaTwitter size={16} />
                  <span>Share on X</span>
                </button>

                {/* Share on Telegram */}
                <button
                  onClick={() => {
                    const shareUrls = getSocialShareUrls(
                      window.location.href,
                      token.name,
                      token.symbol
                    );
                    window.open(shareUrls.telegram, "_blank");
                  }}
                  className="btn btn-primary duration-300 flex items-center justify-center space-x-2"
                >
                  <FaTelegram size={16} />
                  <span>Share on Telegram</span>
                </button>

                {/* Copy Link with UTM */}
                <button
                  onClick={async () => {
                    try {
                      const shareUrls = getSocialShareUrls(
                        window.location.href,
                        token.name,
                        token.symbol
                      );
                      await navigator.clipboard.writeText(shareUrls.copy);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    } catch (error) {
                      console.error("Failed to copy link:", error);
                    }
                  }}
                  className={`btn btn-secondary duration-300 flex items-center justify-center space-x-2 ${
                    copySuccess
                      ? "bg-success text-bg"
                      : "bg-accent hover:bg-accent/80 text-bg"
                  }`}
                >
                  <AiOutlineCopy size={16} />
                  <span>{copySuccess ? "Copied!" : "Copy Link"}</span>
                </button>
              </div>

              {/* Share Preview */}
              <div className="mt-6 p-4 bg-muted/10 rounded-lg border border-muted/20">
                <h3 className="text-sm font-semibold mb-2 text-muted">
                  Share Preview
                </h3>
                <p className="text-sm text-muted mb-2">
                  <strong>Text:</strong>{" "}
                  {getSocialShareUrls(
                    window.location.href,
                    token.name,
                    token.symbol
                  ).twitter.includes("text=")
                    ? decodeURIComponent(
                        getSocialShareUrls(
                          window.location.href,
                          token.name,
                          token.symbol
                        )
                          .twitter.split("text=")[1]
                          .split("&")[0]
                      )
                    : `${token.name} ($${token.symbol}) live now on Solana.`}
                </p>
                <p className="text-xs text-muted">
                  <strong>Link:</strong>{" "}
                  {
                    getSocialShareUrls(
                      window.location.href,
                      token.name,
                      token.symbol
                    ).copy
                  }
                </p>
              </div>
            </div>

            {/* Social Links (if available) */}
            {token.links &&
              (token.links.tg || token.links.x || token.links.site) && (
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
                  <h2 className="text-xl font-bold mb-6">Social Links</h2>
                  <div className="flex flex-wrap gap-4">
                    {token.links.tg && (
                      <a
                        href={token.links.tg}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        <FaTelegram size={16} />
                        <span>Telegram</span>
                      </a>
                    )}

                    {token.links.x && (
                      <a
                        href={token.links.x}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        <FaTwitter size={16} />
                        <span>Twitter</span>
                      </a>
                    )}

                    {token.links.site && (
                      <a
                        href={token.links.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-muted/20 hover:bg-muted/30 text-fg font-bold py-2 px-4 rounded-lg transition-all duration-300"
                      >
                        <AiOutlineLink size={16} />
                        <span>Website</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Advanced Section - LP Burn (Hidden by default) */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10">
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-muted">
                      Advanced Tools
                    </h2>
                    <div className="text-muted group-open:text-fg transition-colors">
                      <svg
                        className="w-5 h-5 transform group-open:rotate-180 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </summary>

                <div className="mt-6 space-y-4">
                  <div className="text-muted text-sm">
                    <p className="mb-4">
                      <strong>⚠️ Advanced Features:</strong> These tools are for
                      experienced users only. Use with extreme caution as some
                      actions are irreversible.
                    </p>
                  </div>

                  {/* LP Token Burner - requires LP mint and owner token account */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">
                      LP Token Management
                    </h3>
                    <p className="text-muted text-sm mb-4">
                      To use LP burn functionality, you need to provide the LP
                      mint address and your LP token account address.
                    </p>

                    <div className="text-xs text-muted bg-muted/20 p-3 rounded border border-muted/30">
                      <strong>Note:</strong> LP burn functionality requires
                      specific LP token addresses. This is typically used after
                      adding liquidity to DEX pairs like Raydium or Orca.
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TokenSharePage;
