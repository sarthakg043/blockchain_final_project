# Admin Wallet Integration - Fixed ✅

## Problem Solved

The admin matching functionality was failing because:
1. **API was using its default wallet** to call smart contract
2. **Smart contract has role-based access control** - only admin address can match
3. **Default API wallet was not registered as admin**

## Solution Implemented

### Frontend Changes (AdminPage.tsx)
✅ Integrated MetaMask wallet connection
✅ Admin signs `matchDriver` transaction directly via MetaMask
✅ Only the blockchain transaction goes through MetaMask
✅ Crypto operations (policy check, re-encryption) still handled by API

### Backend Changes (api/src/routes/rides.ts)
✅ Removed blockchain calls from `/rides/:id/match` endpoint
✅ API now only handles:
  - Policy matching check
  - Re-encryption preparation
  - Storing CT' off-chain
✅ Frontend calls smart contract directly

---

## 🎯 How It Works Now

### Admin Matching Flow:

```
1. Admin connects MetaMask (Account #0)
   ↓
2. Admin fills form (Ride ID, Driver Address, Attributes)
   ↓
3. Click "Match Driver" button
   ↓
4. Frontend calls API /rides/:id/match
   ↓
5. API checks: Do driver attributes satisfy policy?
   ↓
6. API generates re-encryption key
   ↓
7. API re-encrypts CT → CT'
   ↓
8. API stores CT' off-chain
   ↓
9. API returns success to frontend
   ↓
10. Frontend calls smart contract via MetaMask
    contract.matchDriver(rideId, driverAddress)
   ↓
11. MetaMask shows transaction popup
   ↓
12. Admin approves transaction
   ↓
13. Transaction confirmed ✅
```

---

## 🚀 Setup Instructions

### Step 1: Import Admin Account to MetaMask

The admin must use **Hardhat Account #0**:

```
Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

**How to import:**
1. Open MetaMask
2. Click account icon → "Import Account"
3. Select "Private Key"
4. Paste the private key above
5. Label it "Hardhat Admin"

### Step 2: Make Sure Admin is Set in Contract

Check if Account #0 is set as admin in the smart contract:

```bash
# In Hardhat console
npx hardhat console --network localhost

> const CabShareCore = await ethers.getContractFactory("CabShareCore");
> const contract = await CabShareCore.attach("0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
> const adminRole = await contract.DEFAULT_ADMIN_ROLE();
> const hasRole = await contract.hasRole(adminRole, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
> console.log("Account #0 is admin:", hasRole);
```

If `false`, grant admin role:
```javascript
> const [deployer] = await ethers.getSigners();
> await contract.grantRole(adminRole, "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
```

### Step 3: Use Admin Page

1. Open frontend: http://localhost:5173/admin
2. Click **"Connect MetaMask"**
3. Select **Account #0** (Admin account)
4. Approve connection
5. Fill in form:
   - **Ride ID**: From rider
   - **Driver Address**: The driver who proposed (e.g., `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
   - **Driver Attributes**: Comma-separated (e.g., `verified_driver,5star_rating`)
6. Click **"Match Driver"**
7. **Approve transaction in MetaMask**
8. Wait for confirmation ✅

---

## 🔍 Verification

### Check if Match Succeeded:

```bash
# In Hardhat console
npx hardhat console --network localhost

> const contract = await ethers.getContractAt("CabShareCore", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9");
> const rideId = "0x..."; // Your ride ID
> const ride = await contract.rides(rideId);
> console.log("Ride status:", ride.status); // Should be 2 (Matched)
> console.log("Matched driver:", ride.driver);
```

### Expected Status Values:
- `0` = Requested (Rider created)
- `1` = Proposed (Driver proposed)
- `2` = Matched (Admin matched) ✅
- `3` = Reencrypted
- `4` = InProgress
- `5` = Completed

---

## 🎭 Account Roles

| Account | Address | Role | Can Do |
|---------|---------|------|--------|
| **Account #0** | 0xf39F...2266 | **Admin/Rider** | Create rides, Match drivers |
| **Account #1** | 0x7099...79C8 | **Driver** | Propose rides |
| **Account #2** | 0x3C44...93BC | **Driver** | Propose rides |

**Important:** 
- Account #0 can act as both admin AND rider
- If account #0 creates a ride, it's a rider for that ride
- If account #0 matches a ride, it's acting as admin

---

## 🛠️ Troubleshooting

### Error: "Only admin can match drivers"

**Solution:**
You're not using the admin account. Switch to Account #0 in MetaMask.

1. Click MetaMask extension
2. Click account dropdown
3. Select the account with address starting with `0xf39F...`

### Error: "Driver attributes do not satisfy policy"

**Solution:**
The driver's attributes don't match the policy requirements.

Check the policy:
```bash
# Check what attributes are required
cat api/data/policy_<RIDE_ID>.json
```

Make sure driver attributes include ALL required attributes from policy.

### Error: "Transaction rejected by user"

**Solution:**
You clicked "Reject" in MetaMask. Try again and click "Confirm".

### Error: "Insufficient funds"

**Solution:**
Account #0 needs ETH. If you restarted Hardhat node:
1. Reset MetaMask: Settings → Advanced → "Clear activity tab data"
2. Account will have 10,000 ETH again

### MetaMask shows wrong network

**Solution:**
Switch to Hardhat Local network:
1. Click network dropdown in MetaMask
2. Select "Hardhat Local"
3. If not visible, add it (Chain ID: 31337, RPC: http://127.0.0.1:8545)

---

## 📊 Complete User Flow

### 1. Rider Creates Ride (Account #0)
```
Account #0 → Create Ride → Ride Status: Requested
```

### 2. Driver Proposes (Account #1)
```
Account #1 → Connect MetaMask → Propose Ride → Status: Proposed
```

### 3. Admin Matches (Account #0)
```
Account #0 → Admin Page → Connect MetaMask → Match Driver → Status: Matched ✅
```

### 4. Driver Decrypts (Account #1)
```
Account #1 → API call → Decrypt CT' → Get ride details
```

---

## 🔐 Security Benefits

### Old Approach (API does everything):
❌ API needs admin private key
❌ Private key stored in config
❌ Single point of failure
❌ Not production-ready

### New Approach (MetaMask):
✅ Admin signs transactions in MetaMask
✅ Private key never exposed
✅ Decentralized architecture
✅ Production-ready
✅ User has full control

---

## 💡 Key Differences from Driver Flow

| Aspect | Driver | Admin |
|--------|--------|-------|
| **Transaction** | `proposeRide()` | `matchDriver()` |
| **Deposit** | 0.02 ETH required | No deposit |
| **Role Check** | Must not be rider | Must be admin |
| **Frequency** | Once per ride | Once per ride |
| **MetaMask** | Required | Required |

---

## ✅ Testing Checklist

- [ ] Account #0 imported to MetaMask
- [ ] Account #0 has admin role in contract
- [ ] MetaMask connected to Hardhat Local
- [ ] Admin page loads (http://localhost:5173/admin)
- [ ] "Connect MetaMask" button works
- [ ] Can see admin address after connecting
- [ ] Form accepts Ride ID, Driver Address, Attributes
- [ ] "Match Driver" button enabled after connecting
- [ ] MetaMask popup appears when matching
- [ ] Transaction confirms successfully
- [ ] Success message shows Ride ID, Driver, Tx Hash, Block Number

---

## 🚀 Production Deployment

For production on mainnet/testnet:

1. **Deploy contracts** with proper admin address
2. **Grant admin role** to authorized addresses (DAO multisig recommended)
3. **Frontend works without changes** - just update contract addresses
4. **Users connect their own wallets**
5. **No private keys in config files**

---

## 📚 Code Changes Summary

### Files Modified:

1. **web/src/pages/AdminPage.tsx**
   - Added `useWallet()` hook
   - Added MetaMask connection UI
   - Call API for crypto operations
   - Call smart contract directly for matching

2. **api/src/routes/rides.ts**
   - Removed blockchain calls from `/rides/:id/match`
   - Only handles crypto operations
   - Returns success after preparing re-encryption

### Files Created:

3. **web/src/contexts/WalletContext.tsx**
   - Wallet connection management
   - Account change handling
   - Network change handling

---

## 🎉 Success

You should now be able to:
- ✅ Connect admin wallet to MetaMask
- ✅ Match drivers using admin account
- ✅ Sign transactions securely in MetaMask
- ✅ See transaction confirmations on-chain

**All components now use MetaMask for secure transaction signing!** 🔒
