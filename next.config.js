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
            "style-src 'self' 'unsafe-inline';", // Allow inline styles for Tailwind/DaisyUI
            "img-src 'self' data: blob: https:;", // Allow images from any HTTPS source
            "font-src 'self' data:;", // Allow local fonts and data URIs
            "connect-src 'self' https://api.mainnet-beta.solana.com https://api.dexscreener.com https://solana-mainnet.g.alchemy.com;", // Allow connections to Solana RPC and DexScreener
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
