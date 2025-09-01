import { FC, useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { tokenStorage, StoredToken } from "../../utils/tokenStorage";
import { PresetBadge } from "../../components/PresetBadge";
import { HonestLaunchEnforcer } from "../../components/HonestLaunchEnforcer";
import { TokenStats } from "../../components/TokenStats";
import { AiOutlineCopy, AiOutlineLink } from "react-icons/ai";
import { FaTelegram, FaTwitter } from "react-icons/fa";

const TokenSharePage: FC = () => {
  const router = useRouter();
  const { mint } = router.query;
  const [token, setToken] = useState<StoredToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isOnChainVerified, setIsOnChainVerified] = useState(false);

  useEffect(() => {
    if (mint && typeof mint === "string") {
      const tokenData = tokenStorage.getToken(mint);
      setToken(tokenData);
      setIsLoading(false);
    }
  }, [mint]);

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
      window.open(`https://dexscreener.com/solana/${token.mintAddress}`, "_blank");
    }
  };

  // Handle honest launch verification status changes
  const handleVerificationChange = (isVerified: boolean) => {
    setIsOnChainVerified(isVerified);
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
          <p className="text-muted mb-6">The token you're looking for doesn't exist or has been removed.</p>
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
        <title>{token.name} (${token.symbol}) - Solana Token</title>
        <meta name="description" content={`${token.name} ($${token.symbol}) - A Solana token created with ${token.preset === "honest" ? "Honest Launch" : "Degen Mode"} preset.`} />
        
        {/* Open Graph Tags */}
        <meta property="og:title" content={`${token.name} ($${token.symbol})`} />
        <meta property="og:description" content={`${token.name} ($${token.symbol}) - A Solana token created with ${token.preset === "honest" ? "Honest Launch" : "Degen Mode"} preset.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={typeof window !== "undefined" ? window.location.href : ""} />
        <meta property="og:image" content={`/api/kits/${token.symbol}/og_1200x630.png?name=${encodeURIComponent(token.name)}&vibe=${token.vibe || 'degen'}&preset=${token.preset}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${token.name} ($${token.symbol})`} />
        <meta name="twitter:description" content={`${token.name} ($${token.symbol}) - A Solana token created with ${token.preset === "honest" ? "Honest Launch" : "Degen Mode"} preset.`} />
        <meta name="twitter:image" content={`/api/kits/${token.symbol}/og_1200x630.png?name=${encodeURIComponent(token.name)}&vibe=${token.vibe || 'degen'}&preset=${token.preset}`} />
      </Head>

      <div className="min-h-screen bg-bg text-fg">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto pt-20">
            {/* Header */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-8">
              <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                {/* Token Logo */}
                <div className="flex-shrink-0">
                  <img
                    src={token.image || "/brand/meme-placeholder.png"}
                    alt={`${token.name} logo`}
                    className="w-24 h-24 rounded-xl object-cover"
                  />
                </div>

                {/* Token Info */}
                <div className="flex-1 text-center md:text-left">
                  <h1 className="text-3xl font-bold mb-2">
                    {token.name} <span className="text-primary">${token.symbol}</span>
                  </h1>
                  <p className="text-muted mb-4 max-w-md">
                    {token.description}
                  </p>
                  
                  {/* Preset Badge and Honest Launch Status */}
                  <div className="mb-4 space-y-3">
                    <PresetBadge preset={token.preset} isOnChainVerified={isOnChainVerified} />
                    
                    {/* Honest Launch Enforcer - shows verification status or enforcement button */}
                    <HonestLaunchEnforcer 
                      mintAddress={token.mintAddress}
                      preset={token.preset}
                      onVerificationChange={handleVerificationChange}
                    />
                  </div>

                  {/* Token Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Supply:</span>
                      <div className="font-medium">{parseInt(token.amount).toLocaleString()}</div>
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
                        {token.mintAddress.slice(0, 8)}...{token.mintAddress.slice(-8)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Analytics */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <h2 className="text-xl font-bold mb-6">Live Analytics</h2>
              <TokenStats 
                mint={token.mintAddress} 
                tokenName={token.name}
                tokenSymbol={token.symbol}
              />
            </div>

            {/* Action Buttons */}
            <div className="bg-bg/40 backdrop-blur-2xl rounded-2xl p-8 border border-muted/10 mb-4">
              <h2 className="text-xl font-bold mb-6">Actions</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                       <a
                         href={`/meme-kit?name=${encodeURIComponent(token.name)}&ticker=${encodeURIComponent(token.symbol)}`}
                         className="bg-primary hover:bg-primary-600 text-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 text-center"
                       >
                         Get Meme Kit
                       </a>
                       
                       <a
                         href={`/api/meme/kit.zip?name=${encodeURIComponent(token.name)}&ticker=${encodeURIComponent(token.symbol)}&vibe=degen&preset=${encodeURIComponent(token.preset)}&shareUrl=${encodeURIComponent(window.location.href)}`}
                         className="bg-accent hover:bg-accent/80 text-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 text-center"
                       >
                         Download ZIP
                       </a>
                
                <a
                  href={`/liquidity?tokenMint=${encodeURIComponent(token.mintAddress)}&dex=Raydium&pair=SOL/TOKEN`}
                  className="bg-secondary hover:bg-secondary-600 text-bg font-bold py-3 px-4 rounded-lg transition-all duration-300 text-center"
                >
                  Add Liquidity
                </a>
                
                <button
                  onClick={handleOpenDexScreener}
                  className="bg-accent hover:bg-accent/80 text-bg font-bold py-3 px-4 rounded-lg transition-all duration-300"
                >
                  Open on DexScreener
                </button>
                
                <button
                  onClick={handleCopyLink}
                  className={`font-bold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                    copySuccess 
                      ? "bg-success text-bg" 
                      : "bg-muted/20 hover:bg-muted/30 text-fg"
                  }`}
                >
                  <AiOutlineCopy size={16} />
                  <span>{copySuccess ? "Copied!" : "Copy Share Link"}</span>
                </button>
              </div>
            </div>

            {/* Social Links (if available) */}
            {token.links && (token.links.tg || token.links.x || token.links.site) && (
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
                    <h2 className="text-xl font-bold text-muted">Advanced Tools</h2>
                    <div className="text-muted group-open:text-fg transition-colors">
                      <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </summary>
                
                <div className="mt-6 space-y-4">
                  <div className="text-muted text-sm">
                    <p className="mb-4">
                      <strong>⚠️ Advanced Features:</strong> These tools are for experienced users only. 
                      Use with extreme caution as some actions are irreversible.
                    </p>
                  </div>
                  
                  {/* LP Token Burner - requires LP mint and owner token account */}
                  <div className="bg-muted/10 border border-muted/20 rounded-lg p-4">
                    <h3 className="text-lg font-semibold mb-3">LP Token Management</h3>
                    <p className="text-muted text-sm mb-4">
                      To use LP burn functionality, you need to provide the LP mint address and your LP token account address.
                    </p>
                    
                    <div className="text-xs text-muted bg-muted/20 p-3 rounded border border-muted/30">
                      <strong>Note:</strong> LP burn functionality requires specific LP token addresses. 
                      This is typically used after adding liquidity to DEX pairs like Raydium or Orca.
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
