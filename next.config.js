/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_ADMIN_UI: process.env.ADMIN_UI || "0",
  },
};

module.exports = nextConfig;
