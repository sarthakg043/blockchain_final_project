# 🔄 Complete Service Restart Guide

## ⚠️ **IMPORTANT: You MUST restart the crypto service manually**

The crypto service needs to be **completely stopped and restarted** to load the fixed code.

---

## 🛑 **Step 1: Stop ALL Services**

### **Find and Kill All Running Services**

Open **Task Manager** (Ctrl+Shift+Esc) and end these processes:
- Any `python.exe` running `service.py`
- Any `node.exe` running the API
- Any `node.exe` running Vite (web)
- Any `node.exe` running Hardhat

**OR use PowerShell:**

```powershell
# Kill all Node.js processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Kill all Python processes
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## ✅ **Step 2: Start Services in Order**

Open **4 separate PowerShell terminals** and run these commands:

### **Terminal 1: Hardhat Node**
```powershell
cd C:\Users\saigo\OneDrive\Desktop\blockchain\cab-share\contracts
npx hardhat node
```

**Wait for:** `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

---

### **Terminal 2: Crypto Service** ⚠️ **MOST IMPORTANT**
```powershell
cd C:\Users\saigo\OneDrive\Desktop\blockchain\cab-share\offchain-crypto
python service.py
```

**Wait for:**
```
╔══════════════════════════════════════════════════════════╗
║  CP-ABE Proxy Re-Encryption Service                      ║
║  Port: 5123                                              ║
╚══════════════════════════════════════════════════════════╝
 * Running on http://127.0.0.1:5123
```

**⚠️ VERIFY:** Make sure you see `Running on http://127.0.0.1:5123` and NO errors!

---

### **Terminal 3: API Gateway**
```powershell
cd C:\Users\saigo\OneDrive\Desktop\blockchain\cab-share\api
npm run dev
```

**Wait for:** `Server running on port 3001`

---

### **Terminal 4: Web UI**
```powershell
cd C:\Users\saigo\OneDrive\Desktop\blockchain\cab-share\web
npm run dev
```

**Wait for:** `Local: http://localhost:5173/`

---

## 🧪 **Step 3: Test the Crypto Service**

Before trying to match, **test the crypto service directly**:

```powershell
# Test health endpoint
Invoke-RestMethod -Uri http://localhost:5123/api/crypto/health -Method Get
```

**Expected output:**
```json
{
  "success": true,
  "status": "healthy",
  "initialized": false
}
```

**If this fails, the crypto service is NOT running!**

---

## 🎯 **Step 4: Initialize Crypto System**

```powershell
Invoke-RestMethod -Uri http://localhost:5123/api/crypto/setup -Method Post
```

**Expected output:**
```json
{
  "success": true,
  "params": {
    "pk": "...",
    "initialized": true
  },
  "message": "System parameters generated successfully"
}
```

---

## 🚗 **Step 5: Test the Full Flow**

Now go to the web UI and try:

1. **Rider Page** → Create ride → Copy Ride ID
2. **Driver Page** → Propose with that Ride ID
3. **Admin Page** → Match driver

---

## 🐛 **If Still Getting Errors**

### **Check Crypto Service Terminal (Terminal 2)**

Look for errors in the crypto service terminal. You should see:

```
127.0.0.1 - - [07/Nov/2025 17:40:00] "POST /api/crypto/rekey HTTP/1.1" 200 -
```

**NOT:**
```
127.0.0.1 - - [07/Nov/2025 17:40:00] "POST /api/crypto/rekey HTTP/1.1" 500 -
```

If you see `500`, there's still an error. Look at the error message above it.

---

### **Common Issues**

#### ❌ Issue: "Can't open file service.py"
**Fix:** Make sure you're in the `offchain-crypto` directory:
```powershell
cd C:\Users\saigo\OneDrive\Desktop\blockchain\cab-share\offchain-crypto
python service.py
```

#### ❌ Issue: "Port 5123 already in use"
**Fix:** Kill the old Python process:
```powershell
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force
python service.py
```

#### ❌ Issue: Still getting "keygen() takes 3 positional arguments but 4 were given"
**Fix:** The crypto service is still running the OLD code. You MUST:
1. Stop the crypto service (Ctrl+C in Terminal 2)
2. Wait 2 seconds
3. Start it again: `python service.py`

---

## 📋 **Checklist**

Before trying to match, verify:

- [ ] Terminal 1: Hardhat node running (port 8545)
- [ ] Terminal 2: Crypto service running (port 5123) - **FRESH START**
- [ ] Terminal 3: API gateway running (port 3001)
- [ ] Terminal 4: Web UI running (port 5173)
- [ ] Crypto health check passes: `Invoke-RestMethod -Uri http://localhost:5123/api/crypto/health -Method Get`
- [ ] Crypto setup done: `Invoke-RestMethod -Uri http://localhost:5123/api/crypto/setup -Method Post`

---

## 🎉 **Success Indicators**

When everything is working, the **API logs** (Terminal 3) will show:

```
Match request: { rideId: '1', ... }
Loading policy...
Policy loaded: { matrix: [[1], [1]], rho: {...} }
Checking match...
Match result: true
✓ ReKey generated successfully
✓ CT re-encrypted to CT'
✓ Match completed
POST /api/rides/1/match 200 1234.567 ms - 256
```

**Note the `200` status code, NOT `500`!**

---

## 💡 **Pro Tip**

If you keep getting the same error, the crypto service is **definitely** still running the old code. 

**Nuclear option:**
1. Close ALL terminals
2. Restart your computer (to kill all processes)
3. Follow steps 1-5 again

This guarantees a fresh start! 🚀
