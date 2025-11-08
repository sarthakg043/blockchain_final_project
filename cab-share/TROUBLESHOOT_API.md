# 🔧 API Troubleshooting Guide

## ✅ What I Just Fixed

### Problem
The API was failing with "invalid private key" error even though the `.env` file looked correct.

### Root Causes Found
1. **File encoding issues** - `.env` had wrong encoding or BOM
2. **Path resolution** - TypeScript wasn't finding the `.env` file correctly
3. **Quotes in values** - Earlier version had quotes around values

### Solutions Applied
1. ✅ **Recreated `.env`** with UTF-8 encoding (no BOM)
2. ✅ **Updated `config.ts`** to explicitly point to root `.env` file
3. ✅ **Added debugging** to show what private key is being loaded
4. ✅ **Removed all quotes** from environment variables

---

## 🚀 Try the API Now

### Step 1: Verify .env File
```powershell
Get-Content .env | Select-String "PRIVATE_KEY"
```

**Should show:**
```
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

✅ **No quotes!** ✅ **66 characters long!**

---

### Step 2: Start Hardhat Node (if not running)
```powershell
cd contracts
npx hardhat node
```

Keep this running in a separate terminal!

---

### Step 3: Start the API
```powershell
cd api
npm run dev
```

**You should see:**
```
Private Key Length: 66
Private Key Starts with 0x: true
Private Key Value: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
API Gateway listening on http://localhost:3001
```

---

## 📋 Checklist Before Starting API

- [ ] `.env` file exists in **root directory** (not in api folder)
- [ ] PRIVATE_KEY has **no quotes**
- [ ] PRIVATE_KEY is **66 characters** long (including 0x)
- [ ] Hardhat node is **running** on port 8545
- [ ] Contract addresses are filled in `.env`

---

## 🐛 If Still Getting Errors

### Error: "Invalid private key"

**Check 1: File encoding**
```powershell
# Recreate .env with correct encoding
$content = Get-Content .env.example -Raw
[System.IO.File]::WriteAllText("$PWD\.env", $content, [System.Text.UTF8Encoding]::new($false))
```

**Check 2: Verify private key**
```powershell
$pk = (Get-Content .env | Select-String "^PRIVATE_KEY=").ToString().Split('=')[1]
Write-Host "Length: $($pk.Length)"
Write-Host "Starts with 0x: $($pk.StartsWith('0x'))"
```

Should show: Length: 66, Starts with 0x: True

**Check 3: Test .env loading**
```powershell
cd api
node test-env.js
```

Should show all environment variables correctly.

---

### Error: "Could not detect network"

**Cause:** Hardhat node not running

**Fix:**
```powershell
# In a separate terminal
cd contracts
npx hardhat node
```

---

### Error: "ABI not found"

**Cause:** Contracts not compiled

**Fix:**
```powershell
cd contracts
npx hardhat compile
```

---

## 📝 Current Configuration

Your `.env` file should look exactly like this:

```bash
ETHEREUM_RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CHAIN_ID=31337

CABSHARE_CORE_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
REPUTATION_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
DPOS_DELEGATE_HUB_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
DEPOSITS_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

CRYPTO_SERVICE_URL=http://localhost:5000

API_PORT=3001
API_HOST=localhost

VITE_API_URL=http://localhost:3001
VITE_CRYPTO_SERVICE_URL=http://localhost:5000

IPFS_URL=http://localhost:5001
STORAGE_PATH=./data
```

**No quotes, no extra spaces, UTF-8 encoding!**

---

## 🎯 Quick Fix Command

If nothing works, run this to recreate `.env`:

```powershell
cd C:\Users\saigo\OneDrive\Desktop\blockchain\cab-share

$content = @'
ETHEREUM_RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CHAIN_ID=31337

CABSHARE_CORE_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
REPUTATION_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
DPOS_DELEGATE_HUB_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
DEPOSITS_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

CRYPTO_SERVICE_URL=http://localhost:5000

API_PORT=3001
API_HOST=localhost

VITE_API_URL=http://localhost:3001
VITE_CRYPTO_SERVICE_URL=http://localhost:5000

IPFS_URL=http://localhost:5001
STORAGE_PATH=./data
'@

[System.IO.File]::WriteAllText("$PWD\.env", $content, [System.Text.UTF8Encoding]::new($false))

Write-Host "✅ .env file recreated!"
```

Then try the API again!

---

## ✅ Success Indicators

When the API starts successfully, you'll see:

```
Private Key Length: 66
Private Key Starts with 0x: true
API Gateway listening on http://localhost:3001
✓ Connected to Ethereum node
✓ Loaded contract ABIs
```

**Now you're ready to use the system!** 🎉
