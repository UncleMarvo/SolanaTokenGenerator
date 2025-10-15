import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { tokenStorage, StoredToken } from "../../utils/tokenStorage";
import { PresetBadge } from "../../components/PresetBadge";
import HonestBadge from "../../components/HonestBadge";
import HonestLaunchEnforcer from "../../components/HonestLaunchEnforcer";
import TokenStats from "../../components/TokenStats";
import AdvancedTools from "../../components/AdvancedTools";
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

  // AMM LP detection state
  const [ammLpMint, setAmmLpMint] = useState<string | null>(null);

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

      // Fetch LP chips data, creator wallet, and detect AMM LP mint
      fetchLpChips();
      fetchCreatorWallet();
      detectAmmLpMint();
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

  // Function to detect AMM LP mint for this token
  const detectAmmLpMint = async () => {
    if (!mint || typeof mint !== "string") return;

    try {
      // Try to find AMM LP mint by checking Raydium pools
      const response = await fetch(
        `https://api.raydium.io/v2/sdk/liquidity/mainnet.json`
      );
      if (response.ok) {
        const data = await response.json();
        const allPools = [
          ...(data?.official ?? []),
          ...(data?.unOfficial ?? []),
        ];

        // Find pool that contains our token mint
        const matchingPool = allPools.find(
          (pool: any) =>
            pool.baseMint?.toLowerCase() === mint.toLowerCase() ||
            pool.quoteMint?.toLowerCase() === mint.toLowerCase()
        );

        if (matchingPool?.lpMint) {
          setAmmLpMint(matchingPool.lpMint);
        }
      }
    } catch (error) {
      console.error("Failed to detect AMM LP mint:", error);
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
        <div className="container mx-auto px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {/* Two-column grid layout for better space utilization */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN - Token Preview & Details (Sticky) */}
              <div className="space-y-6">
                {/* Token Image & Basic Info Card */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10 lg:sticky lg:top-6">
                  <div className="text-center">
                    {/* Token Image with glow effect */}
                    <div className="mx-auto inline-flex items-center justify-center w-32 h-32 rounded-full bg-neutral-900 relative mb-4">
                      <img
                        src={token.image || "/brand/meme-placeholder.png"}
                        alt={`${token.name} logo`}
                        className="w-24 h-24 object-contain relative z-10 rounded-full"
                      />
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          boxShadow:
                            "0 0 60px 10px rgba(0,229,255,0.25), 0 0 90px 20px rgba(124,77,255,0.15)",
                        }}
                      />
                    </div>

                    {/* Token Name & Symbol */}
                    <h1 className="text-3xl font-bold mb-2">{token.name}</h1>
                    <div className="text-xl text-muted mb-4">
                      ${token.symbol}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted mb-4">
                      {token.description}
                    </p>

                    {/* Status badges */}
                    <div className="space-y-3 mb-6">
                      <PresetBadge
                        preset={token.preset}
                        isOnChainVerified={isOnChainVerified}
                      />
                      <HonestLaunchEnforcer
                        mintAddress={token.mintAddress}
                        preset={token.preset}
                        onVerificationChange={handleVerificationChange}
                      />
                    </div>

                    {/* Token Details Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/10 rounded-lg p-3">
                        <div className="text-muted text-xs mb-1">Supply</div>
                        <div className="font-semibold">
                          {parseInt(token.amount).toLocaleString()}
                        </div>
                      </div>
                      <div className="bg-muted/10 rounded-lg p-3">
                        <div className="text-muted text-xs mb-1">Decimals</div>
                        <div className="font-semibold">{token.decimals}</div>
                      </div>
                      <div className="bg-muted/10 rounded-lg p-3">
                        <div className="text-muted text-xs mb-1">Created</div>
                        <div className="font-semibold">
                          {new Date(token.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="bg-muted/10 rounded-lg p-3">
                        <div className="text-muted text-xs mb-1">Mint</div>
                        <div className="font-mono text-xs truncate">
                          {token.mintAddress.slice(0, 6)}...
                          {token.mintAddress.slice(-6)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WSOL Dust Banner */}
                <WsolDustBanner />
              </div>

              {/* RIGHT COLUMN - Analytics & Actions */}
              <div className="space-y-6">
                {/* Live Analytics */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10">
                  <h2 className="text-lg font-bold mb-4">Live Analytics</h2>
                  <TokenStats
                    mint={token.mintAddress}
                    tokenName={token.name}
                    tokenSymbol={token.symbol}
                  />
                </div>

                {/* LP Status Section - Compact design */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">LP Status</h2>
                    <div className="flex items-center space-x-2">
                      {/* Refresh button */}
                      <button
                        onClick={() => {
                          fetchLpChips();
                          if (walletAddress) {
                            fetchWalletLP();
                          }
                        }}
                        disabled={isLpLoading || isWalletLPLoading}
                        className="flex items-center space-x-1 bg-muted/20 hover:bg-muted/30 text-fg px-3 py-1.5 rounded-lg transition-all duration-300 disabled:opacity-50 text-sm"
                        title="Refresh LP data"
                      >
                        <AiOutlineReload
                          size={14}
                          className={
                            isLpLoading || isWalletLPLoading
                              ? "animate-spin"
                              : ""
                          }
                        />
                      </button>

                      {/* Auto-refresh toggle - compact */}
                      <label
                        className="flex items-center space-x-1 cursor-pointer"
                        title="Auto-refresh every 30s"
                      >
                        <input
                          type="checkbox"
                          checked={autoRefresh}
                          onChange={(e) => setAutoRefresh(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            autoRefresh ? "bg-primary" : "bg-muted/30"
                          }`}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              autoRefresh ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Honest Verification - Full width, prominent placement */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-2 mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">✅</span>
                        <span className="text-xs text-muted">Honest Launch Verification</span>
                      </div>
                      <div className="font-semibold text-sm">
                        {isLpLoading ? (
                          <div className="animate-pulse">
                            <div className="h-5 bg-muted/30 rounded w-24"></div>
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
                            return <span className={lpChips?.honest ? "text-success" : "text-warning"}>{display}</span>;
                          })()
                        )}
                      </div>
                    </div>
                  </div>

                  {/* LP Metrics Grid - 4 columns on desktop, 2 on mobile */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {/* LP Size */}
                    <div className="bg-muted/10 border border-muted/20 rounded-lg p-2 text-center">
                      <div className="text-lg mb-0.5">💧</div>
                      <div className="text-xs text-muted mb-0.5">LP Size</div>
                      <div className="font-semibold text-sm">
                        {isLpLoading ? (
                          <div className="animate-pulse">
                            <div className="h-5 bg-muted/30 rounded w-16 mx-auto"></div>
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
                    <div className="bg-muted/10 border border-muted/20 rounded-lg p-2 text-center">
                      <div className="text-lg mb-0.5">🎯</div>
                      <div className="text-xs text-muted mb-0.5">Range</div>
                      <div className="font-semibold text-sm">
                        {isLpLoading ? (
                          <div className="animate-pulse">
                            <div className="h-5 bg-muted/30 rounded w-14 mx-auto"></div>
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

                    {/* Last Transaction */}
                    <div className="bg-muted/10 border border-muted/20 rounded-lg p-2 text-center">
                      <div className="text-lg mb-0.5">🔗</div>
                      <div className="text-xs text-muted mb-0.5">Last TX</div>
                      <div className="font-semibold text-sm">
                        {isLpLoading ? (
                          <div className="animate-pulse">
                            <div className="h-5 bg-muted/30 rounded w-16 mx-auto"></div>
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
                                  className="text-primary hover:text-primary/80 underline transition-colors text-xs"
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
                    {walletAddress ? (
                      <div className="bg-muted/10 border border-muted/20 rounded-lg p-2 text-center">
                        <div className="text-lg mb-0.5">👛</div>
                        <div className="text-xs text-muted mb-0.5">
                          Your LP
                        </div>
                        <div className="font-semibold text-sm">
                          {isWalletLPLoading ? (
                            <div className="animate-pulse">
                              <div className="h-5 bg-muted/30 rounded w-16 mx-auto"></div>
                            </div>
                          ) : walletLP ? (
                            <span
                              className={
                                walletLP.has ? "text-success" : "text-muted"
                              }
                              title={walletLP.has ? `${walletLP.positionsCount} position${walletLP.positionsCount !== 1 ? "s" : ""}` : "No positions"}
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
                      </div>
                    ) : (
                      <div className="bg-muted/10 border border-muted/20 rounded-lg p-2 text-center flex items-center justify-center">
                        <button
                          onClick={connectWallet}
                          className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                          title="Connect wallet to view your LP positions"
                        >
                          👛 Connect
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Updated timestamp and source info on same line */}
                  <div className="flex items-center justify-between text-xs text-muted pt-2">
                    <span>Last updated: {new Date().toLocaleTimeString()}</span>
                    {lpChips?.source && (
                      <span>Source: {lpChips.source}</span>
                    )}
                  </div>
                </div>

                {/* Quick Actions - Combined Actions & Share in compact format */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10">
                  <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`/liquidity?tokenMint=${encodeURIComponent(
                        token.mintAddress
                      )}&dex=Raydium&pair=SOL/TOKEN`}
                      className="btn btn-primary py-2 text-sm"
                    >
                      Add Liquidity
                    </a>

                    <a
                      href={`/meme-kit?name=${encodeURIComponent(
                        token.name
                      )}&ticker=${encodeURIComponent(token.symbol)}`}
                      className="btn btn-primary py-2 text-sm"
                    >
                      Meme Kit
                    </a>

                    <button
                      onClick={handleOpenDexScreener}
                      className="btn btn-secondary py-2 text-sm"
                    >
                      DexScreener
                    </button>

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
                      className={`btn btn-secondary py-2 text-sm transition-all duration-300 ${
                        copySuccess ? "bg-success text-bg" : ""
                      }`}
                      title="Copy preformatted shill post"
                    >
                      {copySuccess ? "✓ Copied!" : "Shill Bundle"}
                    </button>
                  </div>
                </div>

                {/* Share Section - Compact */}
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10">
                  <h2 className="text-lg font-bold mb-4">Share</h2>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => {
                        const shareUrls = getSocialShareUrls(
                          window.location.href,
                          token.name,
                          token.symbol
                        );
                        window.open(shareUrls.twitter, "_blank");
                      }}
                      className="btn btn-primary py-2 text-sm flex items-center justify-center space-x-1"
                    >
                      <FaTwitter size={14} />
                      <span>X</span>
                    </button>

                    <button
                      onClick={() => {
                        const shareUrls = getSocialShareUrls(
                          window.location.href,
                          token.name,
                          token.symbol
                        );
                        window.open(shareUrls.telegram, "_blank");
                      }}
                      className="btn btn-primary py-2 text-sm flex items-center justify-center space-x-1"
                    >
                      <FaTelegram size={14} />
                      <span>TG</span>
                    </button>

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
                      className={`btn btn-secondary py-2 text-sm flex items-center justify-center space-x-1 transition-all ${
                        copySuccess ? "bg-success text-bg" : ""
                      }`}
                    >
                      <AiOutlineCopy size={14} />
                      <span>{copySuccess ? "✓" : "Copy"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width sections at bottom - Collapsed by default for cleaner layout */}

            {/* Proof Section - Compact collapsible */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10 mb-6 mt-6">
              <details className="group">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-muted group-open:text-fg transition-colors">
                      Proof & Verification
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

                <div className="mt-4 space-y-3">
                  {/* Check if there's anything to show */}
                  {!isOnChainVerified && !lpChips?.lastTx && !walletLP?.has ? (
                    <div className="text-center py-3">
                      <p className="text-sm text-muted mb-3">
                        No proof data available yet. Add liquidity or verify
                        Honest Launch.
                      </p>
                      <div className="flex justify-center space-x-3">
                        <a
                          href={`/liquidity?tokenMint=${encodeURIComponent(
                            token.mintAddress
                          )}&dex=Raydium&pair=SOL/TOKEN`}
                          className="btn btn-primary py-2 px-4 text-sm"
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
                                alert(
                                  result.verified
                                    ? "✅ Verified!"
                                    : `⚠️ ${result.reason || "Failed"}`
                                );
                                if (result.verified) setIsOnChainVerified(true);
                              }
                            } catch (error) {
                              alert("❌ Error: " + error);
                            }
                          }}
                          className="btn btn-secondary py-2 px-4 text-sm"
                        >
                          Check Verification
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-3">
                      {/* Honest Verification Proof */}
                      <div className="bg-muted/10 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">✅</span>
                            <h3 className="font-semibold text-sm">
                              Honest Verification
                            </h3>
                          </div>
                        </div>
                        <p className="text-xs text-muted mb-2">
                          {isOnChainVerified
                            ? "Verified on-chain"
                            : "Not yet verified"}
                        </p>
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
                                alert(
                                  result.verified
                                    ? "✅ Verified!"
                                    : `⚠️ ${result.reason || "Failed"}`
                                );
                                if (result.verified) setIsOnChainVerified(true);
                              }
                            } catch (error) {
                              alert("❌ Error: " + error);
                            }
                          }}
                          className="btn btn-primary py-1.5 px-3 text-xs w-full"
                        >
                          Re-check
                        </button>
                      </div>

                      {/* Last Transaction Proof */}
                      {lpChips?.lastTx && (
                        <div className="bg-muted/10 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">🔗</span>
                            <h3 className="font-semibold text-sm">
                              Last Transaction
                            </h3>
                          </div>
                          <p className="text-xs text-muted mb-2">
                            Most recent LP activity
                          </p>
                          <a
                            href={`https://solscan.io/tx/${lpChips.lastTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary py-1.5 px-3 text-xs w-full"
                          >
                            View on Solscan
                          </a>
                        </div>
                      )}

                      {/* Wallet LP Positions Proof */}
                      {walletLP?.has && (
                        <div className="bg-muted/10 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-lg">👛</span>
                            <h3 className="font-semibold text-sm">
                              Your LP Positions
                            </h3>
                          </div>
                          <p className="text-xs text-muted mb-2">
                            {walletLP.positionsCount} position
                            {walletLP.positionsCount !== 1 ? "s" : ""} found
                          </p>
                          <a
                            href={`/positions?filter=${encodeURIComponent(
                              token.mintAddress
                            )}`}
                            className="btn btn-primary py-1.5 px-3 text-xs w-full"
                          >
                            View Positions
                          </a>
                        </div>
                      )}

                      {/* Copy All Proof Button */}
                      <div className="bg-muted/10 rounded-lg p-3 md:col-span-2">
                        <button
                          onClick={async () => {
                            try {
                              let proofText = `Proof for ${token.name} ($${token.symbol}):\n`;
                              proofText += `✅ Honest: ${
                                isOnChainVerified ? "Verified" : "Not verified"
                              }\n`;
                              if (lpChips?.lastTx)
                                proofText += `🔗 Last TX: https://solscan.io/tx/${lpChips.lastTx}\n`;
                              if (walletLP?.has)
                                proofText += `👛 Your LP: Yes (${
                                  walletLP.positionsCount
                                } position${
                                  walletLP.positionsCount !== 1 ? "s" : ""
                                })\n`;
                              proofText += `🔗 Token: ${window.location.href}`;
                              await navigator.clipboard.writeText(proofText);
                              alert("✅ Proof copied!");
                            } catch (error) {
                              alert("❌ Failed to copy: " + error);
                            }
                          }}
                          className="btn btn-secondary w-full py-2 text-sm flex items-center justify-center space-x-2"
                        >
                          <AiOutlineCopy size={14} />
                          <span>Copy All Proof Data</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            </div>

            {/* Social Links (if available) - Compact */}
            {token.links &&
              (token.links.tg || token.links.x || token.links.site) && (
                <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-4 border border-muted/10 mb-6">
                  <h2 className="text-lg font-bold mb-4">Social Links</h2>
                  <div className="flex flex-wrap gap-3">
                    {token.links.tg && (
                      <a
                        href={token.links.tg}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                      >
                        <FaTelegram size={14} />
                        <span>Telegram</span>
                      </a>
                    )}

                    {token.links.x && (
                      <a
                        href={token.links.x}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                      >
                        <FaTwitter size={14} />
                        <span>Twitter</span>
                      </a>
                    )}

                    {token.links.site && (
                      <a
                        href={token.links.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 bg-muted/20 hover:bg-muted/30 text-fg font-semibold py-2 px-4 rounded-lg transition-all duration-300 text-sm"
                      >
                        <AiOutlineLink size={14} />
                        <span>Website</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

            {/* Advanced Tools */}
            <AdvancedTools
              mint={token.mintAddress}
              creatorWallet={creatorWallet || ""}
              shareUrl={
                typeof window !== "undefined" ? window.location.href : ""
              }
              liquidityUrl={`/liquidity?tokenMint=${encodeURIComponent(
                token.mintAddress
              )}&dex=Raydium&pair=SOL/TOKEN`}
              kitUrl={`/api/meme/kit.zip?name=${encodeURIComponent(
                token.name
              )}&ticker=${encodeURIComponent(
                token.symbol
              )}&vibe=degen&preset=${encodeURIComponent(
                token.preset
              )}&shareUrl=${encodeURIComponent(
                typeof window !== "undefined" ? window.location.href : ""
              )}`}
              ammLpMint={ammLpMint}
              onRecheck={async () => {
                await fetch("/api/honest-status/invalidate", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ mint: token.mintAddress }),
                }).catch(() => {});
                await fetch(
                  `/api/honest-status?mint=${token.mintAddress}&bust=1`
                ).catch(() => {});
                // Trigger local refresh of badge by re-fetching creator wallet
                await fetchCreatorWallet();
              }}
              onEnforce={handleEnforce}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default TokenSharePage;
