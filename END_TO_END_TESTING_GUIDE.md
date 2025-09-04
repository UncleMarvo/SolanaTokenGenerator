# End-to-End Testing Guide

## Overview
This guide provides step-by-step testing procedures to verify all major flows in the application, from basic operations to error handling and fallback scenarios.

## Prerequisites
- Test wallet with SOL and test tokens
- Browser console open for logging inspection
- Network tab open to monitor API calls
- Database access for verification

---

## 1. Orca Sanity Test (Control Flow)

### 1.1 Commit Small TOKEN/USDC → Success
**Steps:**
1. Navigate to `/liquidity?dex=Orca&pair=USDC/TOKEN`
2. Enter small amount (e.g., 0.1 USDC)
3. Click "Get Quote" → verify quote appears
4. Click "Commit" → verify transaction builds
5. Sign transaction in wallet
6. **Expected:** Transaction confirms, success message

**Console Logs to Verify:**
```json
[action] {"when":1234567890,"action":"commit","dex":"orca","mint":"TOKEN_MINT","poolId":"WHIRLPOOL_ADDRESS","wallet":"Abc1...Xyz9","ms":1500,"ok":true}
```

### 1.2 Increase 10% → Success
**Steps:**
1. Go to `/positions` page
2. Find the Orca position card
3. Click "Increase" → enter 10% more
4. Confirm transaction
5. **Expected:** Position updates, new liquidity amount

**Console Logs:**
```json
[action] {"when":1234567890,"action":"increase","dex":"orca","mint":"TOKEN_MINT","poolId":"WHIRLPOOL_ADDRESS","wallet":"Abc1...Xyz9","ms":1200,"ok":true}
```

### 1.3 Collect → Success
**Steps:**
1. On same position card, click "Collect"
2. Confirm transaction
3. **Expected:** Fees collected, position remains

**Console Logs:**
```json
[action] {"when":1234567890,"action":"collect","dex":"orca","mint":"TOKEN_MINT","poolId":"WHIRLPOOL_ADDRESS","wallet":"Abc1...Xyz9","ms":800,"ok":true}
```

### 1.4 Decrease 100% → NFT Gone, Positions Refresh OK
**Steps:**
1. Click "Decrease" → enter 100%
2. Confirm transaction
3. **Expected:** Position disappears from list
4. Refresh positions page → verify no orphaned data

**Console Logs:**
```json
[action] {"when":1234567890,"action":"decrease","dex":"orca","mint":"TOKEN_MINT","poolId":"WHIRLPOOL_ADDRESS","wallet":"Abc1...Xyz9","ms":1800,"ok":true}
```

### 1.5 Share Page Verification
**Steps:**
1. Go to `/token/[mint]` page
2. **Expected Results:**
   - Honest ✓ (green checkmark)
   - LP ✓ (liquidity present indicator)
   - Last tx link (clickable, goes to Solscan)

---

## 2. Raydium CLMM (USDC) Flow

### 2.1 Quote → Commit → Transaction Confirms
**Steps:**
1. Navigate to `/liquidity?dex=Raydium&pair=USDC/TOKEN`
2. Enter amount (e.g., 1 USDC)
3. Get quote → verify tick boundaries appear
4. Commit transaction → sign in wallet
5. **Expected:** Transaction confirms on-chain

**Console Logs:**
```json
[action] {"when":1234567890,"action":"commit","dex":"raydium","mint":"TOKEN_MINT","poolId":"CLMM_POOL_ID","wallet":"Abc1...Xyz9","ms":2000,"ok":true}
```

### 2.2 /api/tx/notify Saved → Position Card Appears
**Steps:**
1. After transaction confirms, check browser network tab
2. Look for POST to `/api/tx/notify`
3. **Expected:** 200 response with `saved: true`
4. Go to `/positions` page
5. **Expected:** New Raydium CLMM position card appears

**Database Verification:**
```sql
-- Check tx_events table
SELECT * FROM "TxEvent" WHERE "txSig" = 'CONFIRMED_TX_SIG';

-- Check positions_clmm table
SELECT * FROM "PositionsClmm" WHERE "poolId" = 'CLMM_POOL_ID';
```

### 2.3 Increase 10% → Success
**Steps:**
1. On Raydium position card, click "Increase"
2. Enter 10% more liquidity
3. Confirm transaction
4. **Expected:** Position updates, new liquidity amount

**Console Logs:**
```json
[action] {"when":1234567890,"action":"increase","dex":"raydium","mint":"TOKEN_MINT","poolId":"CLMM_POOL_ID","wallet":"Abc1...Xyz9","ms":1500,"ok":true}
```

### 2.4 Collect → Success
**Steps:**
1. Click "Collect" on position
2. Confirm transaction
3. **Expected:** Fees collected, position remains

**Console Logs:**
```json
[action] {"when":1234567890,"action":"collect","dex":"raydium","mint":"TOKEN_MINT","poolId":"CLMM_POOL_ID","wallet":"Abc1...Xyz9","ms":900,"ok":true}
```

### 2.5 Decrease 100% → Position Gone, DB Updated
**Steps:**
1. Click "Decrease" → enter 100%
2. Confirm transaction
3. **Expected:** Position disappears from UI
4. **Database Check:** Position should be marked as closed/removed

**Database Verification:**
```sql
-- Check if position was updated
SELECT "updatedAt", "lastLiquidity" FROM "PositionsClmm" 
WHERE "positionMint" = 'POSITION_MINT';
```

### 2.6 Share Page LP Chips Reflect Change
**Steps:**
1. Go to `/token/[mint]` page
2. **Expected:** LP presence indicator updates
3. Last tx should show the decrease transaction
4. **Database Source:** Should show "database" if fresh, "chain" if stale

---

## 3. Raydium with SOL (After WSOL Patch)

### 3.1 Commit TOKEN/SOL (Wrap Occurs)
**Steps:**
1. Navigate to `/liquidity?dex=Raydium&pair=SOL/TOKEN`
2. Enter SOL amount
3. **Expected:** WSOL wrapping occurs automatically
4. Transaction confirms successfully

**Console Logs:**
```json
[action] {"when":1234567890,"action":"commit","dex":"raydium","mint":"TOKEN_MINT","poolId":"CLMM_POOL_ID","wallet":"Abc1...Xyz9","ms":2500,"ok":true}
```

### 3.2 Decrease → Unwrap Executes (No WSOL Dust)
**Steps:**
1. Decrease position by any amount
2. **Expected:** WSOL unwraps automatically
3. **Verify:** No WSOL dust remains in wallet

### 3.3 Error Handling: Low Balance
**Steps:**
1. Try to increase/decrease with insufficient balance
2. **Expected:** Friendly "Insufficient funds" toast message
3. **Console:** Should show error logs

**Console Logs (Error Case):**
```json
[action] {"when":1234567890,"action":"increase","dex":"raydium","mint":"TOKEN_MINT","poolId":"CLMM_POOL_ID","wallet":"Abc1...Xyz9","ms":500,"ok":false,"code":"InsufficientFunds","msg":"Not enough SOL to complete transaction"}
```

### 3.4 RPC Fallback Test
**Steps:**
1. Set primary RPC to invalid URL in environment
2. Try any liquidity operation
3. **Expected:** Flow still works via fallback RPC
4. **Console:** Should show fallback messages

**Console Logs:**
```
Primary RPC failed, falling back to secondary: fetch failed
```

---

## 4. Logging Verification

### 4.1 Console Inspection
**What to Look For:**
- JSON lines starting with `[action]`
- Consistent format across all operations
- Timing information (`ms` field)
- Success/failure status (`ok` field)
- Error codes and messages when applicable

**Expected Log Format:**
```json
[action] {
  "when": 1234567890,
  "action": "commit|increase|decrease|collect",
  "dex": "orca|raydium",
  "mint": "TOKEN_MINT_ADDRESS",
  "poolId": "POOL_ID",
  "wallet": "Abc1...Xyz9",
  "ms": 1500,
  "ok": true|false,
  "code": "ERROR_CODE" // if ok: false
}
```

### 4.2 Performance Metrics
**Verify:**
- `ms` values are reasonable (< 5 seconds for most operations)
- `ok: true` for successful operations
- `ok: false` with proper error codes for failures

---

## 5. Database Verification

### 5.1 After Each Operation
**Check Tables:**
```sql
-- Recent transactions
SELECT * FROM "TxEvent" ORDER BY "ts" DESC LIMIT 5;

-- Current positions
SELECT * FROM "PositionsClmm" ORDER BY "updatedAt" DESC LIMIT 5;
```

### 5.2 Data Consistency
**Verify:**
- `tx_events` has proper `dex` field values
- `positions_clmm` has correct `wallet` and `poolId` mappings
- `updatedAt` timestamps are current
- No orphaned records

---

## 6. Error Scenarios

### 6.1 Network Failures
**Test:**
- Disconnect internet during transaction
- **Expected:** Graceful error handling, user-friendly message

### 6.2 Invalid Inputs
**Test:**
- Negative amounts
- Zero amounts
- Extremely large amounts
- **Expected:** Input validation with clear error messages

### 6.3 Wallet Connection Issues
**Test:**
- Disconnect wallet during operation
- **Expected:** Proper error handling, reconnect prompt

---

## 7. Success Criteria

### ✅ **All Flows Complete Successfully**
- Orca: commit → increase → collect → decrease → cleanup
- Raydium CLMM: quote → commit → position creation → operations → cleanup
- Raydium SOL: wrap → operations → unwrap → no dust

### ✅ **Database Consistency**
- All transactions recorded in `tx_events`
- Positions properly tracked in `positions_clmm`
- No data loss or corruption

### ✅ **User Experience**
- Clear success/error messages
- Proper loading states
- Responsive UI updates

### ✅ **Logging & Monitoring**
- Structured JSON logs for all actions
- Performance metrics captured
- Error tracking with codes

---

## 8. Troubleshooting

### Common Issues:
1. **Position not appearing:** Check `/api/tx/notify` response
2. **Database errors:** Verify schema migrations applied
3. **RPC failures:** Check environment variables and fallback logic
4. **Logging issues:** Ensure console is open and not filtered

### Debug Commands:
```bash
# Check database connection
npx prisma db pull

# Verify schema
npx prisma generate

# Check logs
npm run dev # and watch console
```

---

## 9. Performance Benchmarks

**Target Response Times:**
- Quote: < 2 seconds
- Commit: < 3 seconds  
- Increase/Decrease: < 2 seconds
- Collect: < 1 second
- Position refresh: < 1 second

**Success Rates:**
- All operations: > 95% success rate
- Error handling: 100% graceful degradation
- Database operations: 100% consistency
