# Fix: "Rider cannot propose" Error

## Problem

When a driver sends a proposal to the API endpoint, they get this error:

```
execution reverted: "Rider cannot propose"
```

## Root Cause

The API was using a **single wallet** for all transactions. When the driver called the `/proposals` endpoint, the transaction was actually being sent from the **rider's wallet** (configured in the API), not the driver's wallet. 

The smart contract has this check:

```solidity
require(msg.sender != rides[rideId].rider, "Rider cannot propose");
```

Since `msg.sender` was the rider's address (from the API wallet), the transaction was rejected.

## Solution

The API now supports **driver-specific transactions** by accepting the driver's private key in the request.

### Updated Request Format

```bash
curl -X POST http://localhost:3001/api/rides/RIDE_ID/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "driverAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "driverPrivateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "trip": {
      "destination": "Kerala",
      "pricePerSeat": "0.01",
      "availableSeats": 3,
      "attributes": ["verified_driver", "5star_rating", "premium_vehicle"],
      "departureTime": 1762687027,
      "arrivalTime": 1762690627,
      "route": "Optimal route"
    }
  }'
```

### Key Changes

1. **Added `driverPrivateKey` field** - The driver's private key must be included in the request
2. **Wallet verification** - The API verifies that the private key matches the driver address
3. **Transaction signing** - The transaction is now signed by the driver's wallet, not the API wallet

## Hardhat Test Accounts

For local testing, use these Hardhat accounts:

| Account | Address | Private Key | Role |
|---------|---------|-------------|------|
| Account #0 | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Rider (API default) |
| Account #1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Driver |
| Account #2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Admin/Delegate |

## Security Note

⚠️ **IMPORTANT:** Sending private keys over HTTP is **NOT SECURE** for production!

### For Production Systems:

Use one of these approaches:

1. **Client-Side Signing (Recommended)**
   - Frontend connects to MetaMask/WalletConnect
   - User signs transaction in their browser
   - API only receives signed transaction

2. **Backend Wallet Management**
   - API manages encrypted wallets
   - Users authenticate with username/password
   - API unlocks wallet server-side

3. **Custodial Service**
   - Use services like Fireblocks, AWS KMS
   - Store keys in HSM (Hardware Security Module)

### Current Implementation

The current implementation accepts private keys for **LOCAL TESTING ONLY**. This is acceptable because:
- Running on local Hardhat network
- Using test accounts with no real value
- All traffic is on localhost
- Simplifies testing during development

## Example: Complete Flow

### 1. Rider Creates Ride

```bash
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "plaintext": "Pickup: Downtown, Destination: Airport",
    "policy": {
      "matrix": [[1, 0], [0, 1]],
      "rho": {"0": "verified_driver", "1": "5star_rating"}
    },
    "riderAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  }'
```

**Response:**
```json
{
  "success": true,
  "rideId": "0x73868251da245281790dea0e4b7284b250768d4dc718491f720baddcd2bc0e71",
  "ctHash": "...",
  "txHash": "..."
}
```

### 2. Driver Proposes (WITH PRIVATE KEY)

```bash
curl -X POST http://localhost:3001/api/rides/0x73868251da245281790dea0e4b7284b250768d4dc718491f720baddcd2bc0e71/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "driverAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "driverPrivateKey": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "trip": {
      "destination": "Airport",
      "pricePerSeat": "0.01",
      "availableSeats": 2,
      "attributes": ["verified_driver", "5star_rating"]
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "rideId": "0x73868251da245281790dea0e4b7284b250768d4dc718491f720baddcd2bc0e71",
  "driver": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "txHash": "..."
}
```

✅ **Success!** The transaction is now sent from the driver's wallet, not the rider's.

## Verification

You can verify the transaction sender in the blockchain logs:

```bash
# In your Hardhat node terminal, you should see:
eth_sendTransaction
  from: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8  ✅ Driver's address
  to:   0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9  (CabShareCore)
```

Before the fix, it would show:
```bash
  from: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  ❌ Rider's address
```

## Code Changes

### Before (api/src/routes/rides.ts)
```typescript
const cabShareCore = getCabShareCore(); // Uses API wallet (rider)
const tx = await cabShareCore.proposeRide(rideId, driverTrip, { value: minDeposit });
```

### After (api/src/routes/rides.ts)
```typescript
// Create driver-specific wallet from provided private key
const driverWallet = new ethers.Wallet(driverPrivateKey, provider);

// Create contract instance with driver's wallet
const cabShareCore = new ethers.Contract(config.contracts.cabShareCore, artifact.abi, driverWallet);
const tx = await cabShareCore.proposeRide(rideId, driverTrip, { value: minDeposit });
```

Now the transaction is properly signed by the driver! 🎉
