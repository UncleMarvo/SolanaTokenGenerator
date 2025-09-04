# Admin Authentication System

This document describes the new wallet-based admin authentication system implemented for the Solana Token Creator platform.

## Overview

The admin authentication system provides secure, wallet-based access to administrative features using cryptographic signatures and JWT tokens. It replaces the previous simple `ADMIN_SECRET` authentication with a more secure and auditable system.

## Features

- **Wallet-based Authentication**: Uses Solana wallet signatures instead of shared secrets
- **Nonce-based Security**: Implements challenge-response protocol with time-limited nonces
- **JWT Sessions**: Secure session management with configurable expiration
- **Whitelist Control**: Only pre-approved admin wallets can access the system
- **Audit Trail**: Tracks all authentication attempts and sessions
- **Backward Compatibility**: Maintains support for legacy `ADMIN_SECRET` during transition

## Environment Variables

Add these variables to your `.env` file:

```bash
# Admin Authentication Configuration
ADMIN_WALLETS=your_admin_wallet_1,your_admin_wallet_2,your_admin_wallet_3
ADMIN_JWT_SECRET=superlongrandomstringatleast32characters
SESSION_TTL_MIN=60
NONCE_TTL_MIN=5

# Legacy support (deprecated)
ADMIN_SECRET=your_old_admin_secret
```

### Configuration Details

- **ADMIN_WALLETS**: Comma-separated list of Solana wallet addresses authorized for admin access
- **ADMIN_JWT_SECRET**: Secret key for signing JWT tokens (should be at least 32 characters)
- **SESSION_TTL_MIN**: Admin session duration in minutes (default: 60)
- **NONCE_TTL_MIN**: Authentication nonce expiration in minutes (default: 5)

## Database Schema

The system adds a new `AdminSession` model to track authentication attempts:

```prisma
model AdminSession {
  id         String   @id @default(cuid())
  wallet     String   // Admin wallet address
  nonce      String   // Challenge nonce for authentication
  used       Boolean  @default(false) // Whether nonce has been used
  createdAt  DateTime @default(now())
  verifiedAt DateTime? // When authentication was completed
  
  @@index([wallet])
  @@index([nonce])
  @@index([createdAt])
}
```

## API Endpoints

### 1. Generate Authentication Nonce
```
POST /api/admin/auth/nonce
Content-Type: application/json

{
  "wallet": "wallet_address_here"
}
```

**Response:**
```json
{
  "success": true,
  "nonce": "generated_nonce_here",
  "message": "Please sign this message with your wallet: nonce_here",
  "expiresIn": "5 minutes"
}
```

### 2. Verify Wallet Signature
```
POST /api/admin/auth/verify
Content-Type: application/json

{
  "wallet": "wallet_address_here",
  "nonce": "nonce_from_step_1",
  "signature": "hex_encoded_signature"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "wallet": "wallet_address_here",
  "message": "Admin authentication successful",
  "expiresIn": "60 minutes"
}
```

### 3. Logout (Optional)
```
POST /api/admin/auth/logout
Authorization: Bearer jwt_token_here
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful. Please remove your admin token from storage."
}
```

## Authentication Flow

1. **Wallet Connection**: User connects their Solana wallet
2. **Nonce Generation**: System generates a unique, time-limited nonce
3. **Message Signing**: User signs the nonce with their wallet
4. **Signature Verification**: Backend verifies the signature and nonce
5. **Session Creation**: JWT token is issued for authenticated session
6. **API Access**: Token is used for subsequent admin API calls

## Frontend Integration

### AdminLogin Component

The `AdminLogin` component handles the complete authentication flow:

```tsx
import AdminLogin from '../../components/AdminLogin';

<AdminLogin 
  onLogin={(token, wallet) => {
    // Store token and update UI state
    setAdminToken(token);
    setAdminWallet(wallet);
  }}
  onLogout={() => {
    // Clear token and reset state
    setAdminToken(null);
    setAdminWallet(null);
  }}
  isLoggedIn={!!adminToken}
/>
```

### Using Admin Token

Include the JWT token in API requests:

```tsx
const response = await fetch('/api/admin/revenue', {
  headers: { 
    Authorization: `Bearer ${adminToken}` 
  }
});
```

## Security Features

### Nonce Security
- Each nonce is unique and single-use
- Nonces expire after 5 minutes (configurable)
- Automatic cleanup of expired nonces
- Cryptographic randomness using Node.js crypto module

### JWT Security
- Tokens include wallet address and expiration
- Automatic validation of wallet whitelist status
- Configurable session duration
- Stateless design for scalability

### Wallet Validation
- Only pre-approved wallet addresses can authenticate
- Real-time whitelist checking on each request
- No private key transmission or storage

## Migration from Legacy System

The new system maintains backward compatibility:

1. **Existing APIs**: Continue to work with `ADMIN_SECRET`
2. **New APIs**: Require JWT authentication
3. **Hybrid Mode**: System checks both authentication methods
4. **Gradual Migration**: Can be enabled alongside existing system

## Admin Pages

### Dashboard (`/admin/dashboard`)
- Central hub for all admin functions
- Authentication interface
- Quick access to admin tools
- Session information display

### Revenue (`/admin/revenue`)
- Fee tracking and analytics
- Skim monitoring
- Historical data analysis

### Other Admin Features
- AI usage monitoring
- Data backfill operations
- System status information

## Testing

### Local Development
1. Set environment variables in `.env.local`
2. Add your wallet to `ADMIN_WALLETS`
3. Run the development server
4. Navigate to `/admin/dashboard`
5. Connect wallet and authenticate

### Production Deployment
1. Set secure environment variables
2. Use strong `ADMIN_JWT_SECRET`
3. Limit `ADMIN_WALLETS` to necessary addresses only
4. Monitor authentication logs
5. Regularly rotate JWT secrets

## Troubleshooting

### Common Issues

**"Wallet not authorized"**
- Check if wallet is in `ADMIN_WALLETS` environment variable
- Ensure wallet address format is correct
- Verify environment variable is loaded

**"Invalid signature"**
- Check if nonce has expired (5-minute limit)
- Ensure wallet is properly connected
- Verify signature format

**"JWT verification failed"**
- Check `ADMIN_JWT_SECRET` environment variable
- Ensure token hasn't expired
- Verify wallet is still in whitelist

### Debug Mode

Enable detailed logging by setting:
```bash
NODE_ENV=development
```

## Future Enhancements

- **Multi-factor Authentication**: Additional security layers
- **Role-based Access**: Different permission levels for admins
- **Session Management**: Admin dashboard for active sessions
- **Audit Logging**: Detailed authentication event tracking
- **Rate Limiting**: Prevent brute force attacks

## Security Best Practices

1. **Strong Secrets**: Use cryptographically secure random strings
2. **Limited Access**: Only add necessary wallets to admin list
3. **Regular Rotation**: Change JWT secrets periodically
4. **Monitoring**: Log and monitor authentication attempts
5. **HTTPS Only**: Ensure all admin access uses secure connections

## Support

For issues or questions about the admin authentication system:
1. Check environment variable configuration
2. Verify database migration was applied
3. Review authentication logs
4. Contact development team with specific error messages
