/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ADMIN_UI: process.env.ADMIN_UI || "0",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Transport Security - Force HTTPS with HSTS
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          
          // XSS Protection and MIME sniffing prevention
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          
          // Referrer policy - only send referrer for same-origin requests
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          
          // Content Security Policy - comprehensive protection
          { key: "Content-Security-Policy", value: [
            "default-src 'self';",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval';", // Allow inline scripts for local assets
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;", // Allow inline styles for Tailwind/DaisyUI and Google Fonts
            "img-src 'self' data: blob: https:;", // Allow images from any HTTPS source
            "font-src 'self' data: https://fonts.gstatic.com;", // Allow local fonts, data URIs, and Google Fonts
            "connect-src 'self' https://api.mainnet-beta.solana.com https://api.devnet.solana.com wss://api.mainnet-beta.solana.com wss://api.devnet.solana.com https://api.dexscreener.com https://solana-mainnet.g.alchemy.com https://api.pinata.cloud https://gateway.pinata.cloud https://devnet.helius-rpc.com https://solana-devnet.g.alchemy.com https://devnet.genesysgo.com;", // Allow connections to Solana RPC (mainnet/devnet), DexScreener, Pinata IPFS, and alternative devnet providers
            "frame-ancestors 'self';", // Prevent embedding in frames from other origins
            "base-uri 'self';", // Restrict base tag usage
            "form-action 'self';", // Restrict form submissions to same origin
          ].join(" ") },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
