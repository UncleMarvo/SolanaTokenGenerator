# Database Setup Guide

This guide explains how to set up the PostgreSQL database for persisting Raydium CLMM position metadata and transaction events.

## Prerequisites

- PostgreSQL database (local or remote)
- Node.js and npm installed
- Access to the project directory

## Setup Steps

### 1. Install Dependencies

The required packages are already installed:
```bash
npm install prisma @prisma/client
```

### 2. Configure Database Connection

1. Copy `env.example` to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Edit `.env.local` and set your `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/solana_tokens
   ```

   **Local PostgreSQL Example:**
   ```env
   DATABASE_URL=postgresql://postgres:mypassword@localhost:5432/solana_tokens
   ```

   **Remote PostgreSQL Example:**
   ```env
   DATABASE_URL=postgresql://user:pass@host.com:5432/dbname
   ```

### 3. Initialize Database Schema

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Create and apply migrations:**
   ```bash
   npx prisma migrate dev --name init
   ```

   This will:
   - Create the database if it doesn't exist
   - Create the required tables
   - Generate the Prisma client

### 4. Verify Setup

1. **Check database connection:**
   ```bash
   npx prisma db pull
   ```

2. **View database in Prisma Studio:**
   ```bash
   npx prisma studio
   ```

## Database Schema

### Tables Created

#### `PositionsClmm`
Stores Raydium CLMM position metadata:
- `positionMint` (Primary Key): Unique position identifier
- `wallet`: Wallet address that owns the position
- `poolId`: Raydium CLMM pool identifier
- `tokenA`, `tokenB`: Token mint addresses
- `decA`, `decB`: Token decimal places
- `tickLower`, `tickUpper`: Position tick boundaries
- `lastLiquidity`: Current liquidity amount
- `createdAt`, `updatedAt`: Timestamps

#### `TxEvent`
Stores all transaction events:
- `txSig` (Primary Key): Transaction signature
- `wallet`: Wallet address
- `mint`: Primary token mint
- `positionMint`: Associated position (optional)
- `poolId`: Pool identifier (optional)
- `action`: Transaction type (commit/increase/decrease/close/collect)
- `amountA`, `amountB`: Token amounts involved
- `liquidityDelta`: Liquidity change
- `success`: Transaction success status
- `ts`: Timestamp

## API Integration

### Transaction Notification Endpoint

**POST** `/api/tx/notify`

Automatically called after successful transactions to persist metadata.

**Enhanced Features:**
- **Automatic Position Mint Discovery**: For Raydium CLMM transactions without `positionMint` in context, the system automatically extracts the position NFT mint from the confirmed transaction
- **Fallback Scanning**: If transaction parsing fails, the system can attempt SDK-based position scanning (when available)
- **Multi-Method Parsing**: Uses both instruction parsing and token account change analysis for maximum success rate

### Transaction Parsing Library

**File**: `src/lib/txParse.ts`

**Functions:**
- `findClmmPositionMint(connection, txSig, opts)`: Comprehensive position mint discovery
- `findClmmPositionMintFromTx(connection, txSig, opts)`: Instruction-based parsing
- `findClmmPositionMintFromTokenChanges(connection, txSig)`: Token account change analysis

**Usage Example:**
```typescript
import { findClmmPositionMint } from "@/lib/txParse";

const positionMint = await findClmmPositionMint(connection, txSignature, {
  wallet: "wallet_address",
  poolId: "pool_identifier"
});
```

**Request Body:**
```json
{
  "txSig": "transaction_signature",
  "wallet": "wallet_address",
  "mint": "token_mint",
  "dex": "raydium" | "orca",
  "context": {
    "poolId": "pool_identifier",
    "positionMint": "position_identifier",
    "tickLower": 123,
    "tickUpper": 456,
    "tokenA": "token_a_mint",
    "tokenB": "token_b_mint",
    "decA": 6,
    "decB": 6,
    "lastLiquidity": "1000",
    "action": "increase",
    "amountA": "100",
    "amountB": "50",
    "liquidityDelta": "100"
  }
}
```

**Response:**
```json
{
  "saved": true,
  "positionMint": "position_identifier"
}
```

## Usage Examples

### Raydium CLMM Actions

All Raydium CLMM actions automatically persist metadata:

1. **Commit Liquidity** → Creates new position record
2. **Increase Liquidity** → Updates position metadata
3. **Decrease Liquidity** → Updates position metadata
4. **Collect Fees** → Records fee collection event

### Orca Actions

All Orca actions also persist metadata:

1. **Commit Liquidity** → Creates new position record
2. **Increase Liquidity** → Updates position metadata
3. **Decrease Liquidity** → Updates position metadata
4. **Collect Fees** → Records fee collection event

## Database Management

### Viewing Data

```bash
# Open Prisma Studio (web interface)
npx prisma studio

# Or use direct database queries
npx prisma db execute --stdin
```

### Backup and Restore

```bash
# Export schema
npx prisma db pull

# Reset database (development only)
npx prisma migrate reset

# Deploy to production
npx prisma migrate deploy
```

## Troubleshooting

### Common Issues

1. **Connection Refused:**
   - Verify PostgreSQL is running
   - Check connection string format
   - Ensure database exists

2. **Permission Denied:**
   - Verify database user permissions
   - Check if database exists

3. **Migration Errors:**
   - Reset database: `npx prisma migrate reset`
   - Check for conflicting migrations

### Debug Commands

```bash
# Check database connection
npx prisma db pull

# View migration status
npx prisma migrate status

# Reset and recreate database
npx prisma migrate reset

# Generate fresh client
npx prisma generate
```

## Production Considerations

1. **Connection Pooling:** Configure connection limits in production
2. **Backup Strategy:** Implement regular database backups
3. **Monitoring:** Set up database performance monitoring
4. **Security:** Use environment variables for sensitive data
5. **Scaling:** Consider read replicas for high-traffic applications

## Support

For database-related issues:
1. Check Prisma documentation: https://www.prisma.io/docs/
2. Verify PostgreSQL configuration
3. Review migration logs
4. Check environment variables
