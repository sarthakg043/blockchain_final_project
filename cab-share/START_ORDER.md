# 🚀 Correct Startup Order

## ⚠️ IMPORTANT: Start in This Order!

The services depend on each other, so you **must start them in this order**:

---

## ✅ Step-by-Step Startup

### 1️⃣ **Terminal 1: Start Blockchain** (FIRST!)
```powershell
cd contracts
npx hardhat node
```
**Wait for:** `Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/`

⏱️ **Keep this running!** Don't close this terminal.

---

### 2️⃣ **Terminal 2: Deploy Contracts** (SECOND!)
```powershell
cd contracts
npm run deploy:local
```

**You should see:**
```
CabShareCore deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
Reputation deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
DPoSDelegateHub deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
Deposits deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

✅ **Your .env already has these addresses!** You're good to go.

---

### 3️⃣ **Terminal 3: Crypto Service** (THIRD!)
```powershell
cd offchain-crypto
python service.py
```

**Wait for:** `Running on http://127.0.0.1:5123`

✅ **Already running!** Keep it running.

---

### 4️⃣ **Terminal 4: Initialize Crypto & Start API** (FOURTH!)
```powershell
# Initialize crypto (only once)
Invoke-RestMethod -Uri http://localhost:5123/api/crypto/setup -Method Post

# Start API
cd api
npm run dev
```

**Wait for:** `API Gateway listening on http://localhost:3001`

---

### 5️⃣ **Terminal 5: Web UI** (LAST!)
```powershell
cd web
npm run dev
```

**Wait for:** `Local: http://localhost:5173/`

---

## 🎯 Open Browser

Once all 5 are running, open: **http://localhost:5173**

---

## ❌ Common Errors

### Error: "invalid private key"
**Cause:** `.env` file doesn't exist  
**Fix:**
```powershell
Copy-Item .env.example .env
```

### Error: "could not detect network"
**Cause:** Hardhat node not running  
**Fix:** Start Terminal 1 first!

### Error: "contract not deployed"
**Cause:** Contracts not deployed  
**Fix:** Run Terminal 2 after Terminal 1 is running

### Error: "ECONNREFUSED localhost:5123"
**Cause:** Crypto service not running  
**Fix:** Start Terminal 3

---

## 🔍 Check Status

### Is Hardhat Running?
```powershell
curl http://127.0.0.1:8545
# Should return: {"jsonrpc":"2.0","id":null,"error":...}
```

### Is Crypto Service Running?
```powershell
Invoke-RestMethod -Uri http://localhost:5123/api/crypto/health -Method Get
# Should return: {"status": "healthy"}
```

### Is API Running?
```powershell
curl http://localhost:3001/health
# Should return: {"status": "ok"}
```

---

## 📋 Checklist

Before starting the API, make sure:

- [ ] Terminal 1: Hardhat node is running
- [ ] Terminal 2: Contracts are deployed
- [ ] Terminal 3: Crypto service is running
- [ ] `.env` file exists in root directory
- [ ] Contract addresses in `.env` match deployment output

---

## 🎉 Ready!

Once all 5 terminals show "running" or "listening", you're ready to use the system!
