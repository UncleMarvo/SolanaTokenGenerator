import { FC, useState, useEffect } from "react";
import { TokenStats as TokenStatsType } from "../lib/analytics";

interface TokenStatsProps {
  mint: string;
  tokenName?: string;
  tokenSymbol?: string;
}

const TokenStats: FC<TokenStatsProps> = ({ mint, tokenName, tokenSymbol }) => {
  const [stats, setStats] = useState<TokenStatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Extract existing fetch into a function
  async function loadStats(force = false) {
    if (!mint) return;
    
    try {
      if (!stats) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      
      const qs = force ? `?mint=${mint}&t=${Date.now()}` : `?mint=${mint}`;
      const response = await fetch(`/api/token/stats${qs}`, { cache: "no-store" });
      const data = await response.json();
      setStats(data);
      setLastUpdated(Date.now());
    } catch (error) {
      // leave prior stats; optionally show a small error note
      console.warn("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, [mint]);

  // Copy metrics handler
  function formatNumber(n?: number, digits = 2) { 
    return (typeof n === "number") ? Number(n).toLocaleString(undefined, { maximumFractionDigits: digits }) : "—"; 
  }
  
  function metricsSummary() {
    const p = stats?.price != null ? `$${formatNumber(stats.price, 6)}` : "—";
    const ch = (typeof stats?.change24h === "number") ? `${stats!.change24h >= 0 ? "+" : ""}${formatNumber(stats!.change24h, 2)}%` : "—";
    const liq = stats?.liquidityUSD != null ? `$${formatNumber(Math.round(stats.liquidityUSD), 0)}` : "—";
    const holders = (typeof stats?.holders === "number") ? String(stats.holders) : "—";
    const url = typeof window !== "undefined" ? window.location.href : "";
    return `Token: ${tokenName || "Unknown"} ($${tokenSymbol || "UNKNOWN"})\nPrice: ${p}\n24h: ${ch}\nLiquidity: ${liq}\nHolders: ${holders}\n${url}`;
  }
  
  async function handleCopyMetrics() {
    try {
      await navigator.clipboard.writeText(metricsSummary());
      // show a small success toast/snackbar if available; else temporary inline note
      setCopied(true); 
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn("Failed to copy metrics:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          {/* Skeleton loading chips */}
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-8 bg-muted/20 rounded-full animate-pulse"
              style={{ width: `${Math.random() * 60 + 80}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!stats || Object.keys(stats).length === 0) {
    return (
      <div className="text-muted text-sm">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Action Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => loadStats(true)} 
            disabled={isRefreshing || isLoading} 
            className="bg-muted/20 hover:bg-muted/30 text-fg border border-muted/30 rounded px-3 py-1 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          
          <button 
            onClick={handleCopyMetrics} 
            className="bg-muted/20 hover:bg-muted/30 text-fg border border-muted/30 rounded px-3 py-1 text-sm font-medium transition-all duration-200"
          >
            Copy metrics
            {copied && <span className="text-xs text-success ml-2">Copied!</span>}
          </button>
        </div>
        
        {/* Optional tiny timestamp */}
        {lastUpdated && (
          <span className="text-muted text-xs">
            Last updated {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Price Chip */}
        <div className="chip bg-primary/10 border-primary/20">
          <span className="text-primary font-medium">
            {stats.price ? `$${stats.price.toFixed(4)}` : "—"}
          </span>
        </div>

        {/* 24h Change Chip */}
        <div className={`chip ${
          stats.change24h && stats.change24h >= 0
            ? "bg-success/10 border-success/20"
            : "bg-error/10 border-error/20"
        }`}>
          <span className={`font-medium ${
            stats.change24h && stats.change24h >= 0
              ? "text-success"
              : "text-error"
          }`}>
            {stats.change24h !== undefined
              ? stats.change24h >= 0
                ? `📈 +${stats.change24h.toFixed(2)}%`
                : `📉 ${stats.change24h.toFixed(2)}%`
              : "—"
            }
          </span>
        </div>

        {/* Liquidity Chip */}
        <div className="chip bg-secondary/10 border-secondary/20">
          <span className="text-secondary font-medium">
            {stats.liquidityUSD
              ? `💧 $${Intl.NumberFormat().format(Math.round(stats.liquidityUSD))}`
              : "—"
            }
          </span>
        </div>

        {/* Holders Chip */}
        <div className="chip bg-accent/10 border-accent/20">
          <span className="text-accent font-medium">
            {stats.holders !== undefined ? stats.holders.toLocaleString() : "—"}
          </span>
        </div>
      </div>

      {/* Source Attribution */}
      <div className="flex items-center justify-start text-xs text-muted">
        {stats.source === "dexscreener" && (
          <span>Data via DexScreener</span>
        )}
      </div>
    </div>
  );
};

export default TokenStats;
