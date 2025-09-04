# Testing Checklist - Quick Reference

## 🧪 **Pre-Test Setup**
- [ ] Test wallet connected with SOL + test tokens
- [ ] Browser console open (F12)
- [ ] Network tab open
- [ ] Database access ready
- [ ] Environment variables configured

---

## 1️⃣ **Orca Sanity Test (Control)**
- [ ] **Commit** small TOKEN/USDC → success
- [ ] **Increase** 10% → success  
- [ ] **Collect** → success
- [ ] **Decrease** 100% → NFT gone, positions refresh OK
- [ ] **Share Page** shows Honest ✓, LP ✓, Last tx link

**Console Logs:** `[action]` JSON with `ok: true`

---

## 2️⃣ **Raydium CLMM (USDC)**
- [ ] **Quote** → **Commit** → tx confirms
- [ ] `/api/tx/notify` saved → position card appears
- [ ] **Increase** 10% → success
- [ ] **Collect** → success
- [ ] **Decrease** 100% → position gone, DB updated
- [ ] **Share Page** LP chips reflect change, Last tx updates

**Database Check:** Verify in `tx_events` and `positions_clmm`

---

## 3️⃣ **Raydium with SOL (WSOL Patch)**
- [ ] **Commit** TOKEN/SOL (wrap occurs)
- [ ] **Decrease** → unwrap executes (no WSOL dust)
- [ ] **Error Handling:** low balance → friendly "Insufficient funds" toast
- [ ] **RPC Fallback:** bad primary URL → flow works via fallback

**Console:** Look for fallback messages

---

## 4️⃣ **Logging Verification**
- [ ] Console shows `[action]` JSON lines
- [ ] All operations have `ms` + `ok` fields
- [ ] Error cases show proper codes
- [ ] Performance < 5 seconds per operation

---

## 5️⃣ **Database Verification**
- [ ] `tx_events` has proper `dex` field values
- [ ] `positions_clmm` has correct mappings
- [ ] `updatedAt` timestamps are current
- [ ] No orphaned records

---

## 🎯 **Success Criteria**
- [ ] All flows complete successfully
- [ ] Database consistency maintained
- [ ] User experience smooth
- [ ] Logging captures all actions
- [ ] Error handling graceful

---

## 🚨 **Common Issues to Watch**
- Position not appearing after commit
- Database connection errors
- RPC fallback not working
- Logging not showing in console
- Position refresh issues

---

## 🔧 **Debug Commands**
```bash
# Database
npx prisma db pull
npx prisma generate

# Development
npm run dev
npm run build
```

---

## 📊 **Performance Targets**
- Quote: < 2s
- Commit: < 3s
- Increase/Decrease: < 2s
- Collect: < 1s
- Position refresh: < 1s
- Success rate: > 95%
