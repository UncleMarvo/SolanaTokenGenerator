# DEVNET Setup for QA Testing

This document explains how to set up and use the devnet configuration for QA testing.

## Quick Setup

1. **Create environment file:**
   ```bash
   cp .env.dev .env.local
   ```

2. **Update wallet addresses:**
   Edit `.env.local` and replace the placeholder wallet addresses:
   - `FEE_WALLET=your_dev_fee_wallet` → Your devnet fee wallet
   - `ADMIN_WALLETS=your_admin_wallet` → Your devnet admin wallet
   - `NEXT_PUBLIC_ADMIN_WALLETS=your_admin_wallet` → Same as ADMIN_WALLETS (for frontend)

3. **Start the application:**
   ```bash
   npm run dev
   ```

## Environment Variables

The `.env.dev` file includes:

- `NETWORK=devnet` - Enables devnet mode
- `RPC_PRIMARY=https://api.devnet.solana.com` - Devnet RPC endpoint
- `LAUNCH_FLAT_FEE_SOL=0.02` - Reduced launch fee for testing
- `PRO_FEE_SOL=0.25` - Reduced Pro access fee for testing
- `NEXT_PUBLIC_ADMIN_WALLETS` - Admin wallet addresses (for showing Admin link)

## Airdrop Helper

The airdrop endpoint is only available when `NETWORK=devnet`:

### Usage
```bash
# Airdrop 2 SOL (default amount)
GET /api/dev/airdrop?wallet=<WALLET_PUBLIC_KEY>

# Airdrop custom amount (max 10 SOL)
GET /api/dev/airdrop?wallet=<WALLET_PUBLIC_KEY>&sol=5
```

### Example
```bash
curl "http://localhost:3000/api/dev/airdrop?wallet=9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM&sol=5"
```

### Response
```json
{
  "ok": true,
  "sig": "transaction_signature_here",
  "amount": 5,
  "wallet": "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
  "message": "Successfully airdropped 5 SOL to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"
}
```

## Network Detection

The application automatically detects the network using:

```typescript
import { NETWORK, IS_DEVNET, CLUSTER } from '@/lib/network';

// Check if running on devnet
if (IS_DEVNET) {
  // Devnet-specific logic
}

// Get cluster string for Solana libraries
const cluster = CLUSTER; // "devnet" or "mainnet-beta"
```

## Testing Checklist

- [ ] Environment file created and configured
- [ ] Wallet addresses updated
- [ ] Application starts without errors
- [ ] Airdrop endpoint responds correctly
- [ ] Network detection works properly
- [ ] Reduced fees are applied in devnet mode

## Security Notes

- The airdrop endpoint is **only available on devnet**
- It will return an error if accessed on mainnet
- Maximum airdrop amount is limited to 10 SOL
- Always use test wallets for devnet testing

## Troubleshooting

1. **Airdrop fails:** Check that `NETWORK=devnet` is set
2. **Invalid wallet error:** Ensure the wallet address is a valid Solana public key
3. **RPC errors:** Verify the devnet RPC endpoint is accessible
4. **Environment not loading:** Make sure `.env.local` exists and is properly formatted
