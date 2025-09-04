# Admin Revenue API

## Endpoint
`GET /api/admin/revenue`

## Authentication
Requires `ADMIN_SECRET` environment variable to be set. Include the secret in the Authorization header:

```
Authorization: Bearer YOUR_ADMIN_SECRET
```

## Purpose
Provides a comprehensive readout of fee revenue from skim events for quick accounting and analysis.

## Response Format

### Success Response (200)
```json
{
  "summary": {
    "totalEvents": 150,
    "totalFlatSol": 3.0,
    "avgSkimBp": 200.0,
    "totalSkimA": 1500.5,
    "totalSkimB": 75.25
  },
  "byMint": [
    {
      "mint": "TokenMintAddress123...",
      "count": 45,
      "totalFlatSol": 0.9,
      "totalSkimA": 450.15,
      "totalSkimB": 22.5
    }
  ],
  "recentEvents": [
    {
      "txSig": "TransactionSignature...",
      "wallet": "WalletAddress...",
      "mint": "TokenMintAddress...",
      "action": "skim",
      "skimBp": 200,
      "skimA": "10.5",
      "skimB": "0.5",
      "flatSol": 0.02,
      "ts": "2024-01-XX..."
    }
  ],
  "totalEvents": 150
}
```

### Error Responses

#### Unauthorized (401)
```json
{
  "error": "Unauthorized"
}
```

#### Internal Server Error (500)
```json
{
  "error": "Internal server error"
}
```

## Response Fields

### Summary
- `totalEvents`: Total number of skim events
- `totalFlatSol`: Total SOL collected from flat fees
- `avgSkimBp`: Average skim basis points across all events
- `totalSkimA`: Total amount skimmed from token A (sum of all skimA values)
- `totalSkimB`: Total amount skimmed from token B (sum of all skimB values)

### By Mint
- `mint`: Token mint address
- `count`: Number of transactions for this token
- `totalFlatSol`: Total SOL fees collected for this token
- `totalSkimA`: Total token A skimmed for this mint
- `totalSkimB`: Total token B skimmed for this mint

### Recent Events
- Returns the 50 most recent skim events with full details
- Includes transaction signature, wallet, mint, skim amounts, and timestamps

## Usage Examples

### cURL
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     https://your-domain.com/api/admin/revenue
```

### JavaScript
```javascript
const response = await fetch('/api/admin/revenue', {
  headers: {
    'Authorization': `Bearer ${process.env.ADMIN_SECRET}`
  }
});

const revenueData = await response.json();
console.log(`Total SOL collected: ${revenueData.summary.totalFlatSol}`);
```

## Notes
- Returns up to 500 most recent skim events
- Skim amounts are stored as strings and converted to numbers for calculations
- All numeric values are rounded to 6 decimal places for precision
- Events are ordered by timestamp (newest first)
- Per-mint analysis is sorted by transaction count (highest first)
