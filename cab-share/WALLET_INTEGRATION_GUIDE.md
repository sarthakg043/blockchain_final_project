# Wallet Integration Guide

## Problem: "Rider cannot propose" Error

### Root Cause
The API was using a **single wallet** for all transactions. When a driver tried to propose a ride, the transaction was actually sent from the API's default wallet (rider's address), triggering the smart contract's role validation.

### Why This Happened
1. Frontend didn't send driver's private key
2. API couldn't sign transaction as the driver
3. Transaction was sent from wrong address (rider instead of driver)

---

## ✅ Solution Implemented (Local Testing)

### Changes Made:

**1. API Backend** (`api/src/routes/rides.ts`)
- Added `driverPrivateKey` parameter
- Creates temporary wallet for driver to sign transaction
- **Only for local Hardhat testing!**

**2. Frontend** (`web/src/pages/DriverPage.tsx`)
- Added private key input field
- Shows warning: "Local Testing Only"
- Pre-filled with Hardhat Account #1 key

**3. API Client** (`web/src/lib/api.ts`)
- Updated `proposeRide()` to include `driverPrivateKey`

---

## 🚀 How to Use (Local Testing)

### Step 1: Get Hardhat Test Account

When you run `npx hardhat node`, you'll see 20 test accounts:

```
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```

### Step 2: Use Frontend

1. Open http://localhost:5173
2. Go to **Driver Page**
3. The private key field is **pre-filled** with Account #1's key
4. Enter the Ride ID
5. Fill in trip details
6. Click "Propose Ride"

### Step 3: Verify Success

You should see:
```json
{
  "success": true,
  "rideId": "0x...",
  "driver": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "txHash": "0x...",
  "message": "Driver proposal submitted successfully"
}
```

---

## 🔒 Production Solution: Web3 Wallet Integration

For production, **NEVER send private keys to the API**. Use MetaMask instead:

### Step 1: Install Dependencies

```bash
cd web
npm install ethers@6 @web3modal/ethers
```

### Step 2: Create Wallet Context

```typescript
// web/src/contexts/WalletContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider, Contract } from 'ethers';

interface WalletContextType {
  address: string | null;
  provider: BrowserProvider | null;
  signer: any | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({} as WalletContextType);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<any | null>(null);

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask!');
      return;
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAddress(address);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setProvider(null);
    setSigner(null);
  };

  return (
    <WalletContext.Provider value={{ address, provider, signer, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
```

### Step 3: Update Driver Page

```typescript
// web/src/pages/DriverPage.tsx
import { useWallet } from '../contexts/WalletContext';
import { Contract } from 'ethers';
import CabShareCoreABI from '../../../contracts/artifacts/contracts/CabShareCore.sol/CabShareCore.json';

export default function DriverPage() {
  const { address, signer, connect } = useWallet();
  
  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signer) {
      await connect();
      return;
    }

    try {
      // Create contract instance with user's signer
      const contract = new Contract(
        '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9', // CabShareCore address
        CabShareCoreABI.abi,
        signer
      );

      // Call contract directly - no API needed for transactions!
      const tx = await contract.proposeRide(
        rideId,
        Math.floor(Date.now() / 1000), // departureTime
        tripData.destination,
        'Optimal route',
        Math.floor(Date.now() / 1000) + 3600, // arrivalTime
        tripData.availableSeats,
        ethers.parseEther(tripData.pricePerSeat),
        attributesAsBytes
      );

      await tx.wait();
      setResult({ success: true, txHash: tx.hash });
    } catch (error: any) {
      setResult({ error: error.message });
    }
  };

  return (
    <div>
      {!address ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <form onSubmit={handlePropose}>
          {/* Form fields */}
        </form>
      )}
    </div>
  );
}
```

### Step 4: Update App.tsx

```typescript
// web/src/App.tsx
import { WalletProvider } from './contexts/WalletContext';

function App() {
  return (
    <WalletProvider>
      {/* Rest of your app */}
    </WalletProvider>
  );
}
```

### Benefits of Web3 Wallet:
✅ **No private keys sent anywhere**  
✅ **User signs transactions locally in MetaMask**  
✅ **Works with any Ethereum wallet**  
✅ **Industry standard approach**  
✅ **API only handles read operations**  

---

## 📊 Comparison

| Approach | Security | User Experience | Best For |
|----------|----------|----------------|----------|
| **Private Key Input** | ❌ Insecure | Simple | Local testing only |
| **Web3 Wallet (MetaMask)** | ✅ Secure | Requires extension | Production |
| **WalletConnect** | ✅ Secure | Mobile-friendly | Production |

---

## 🛠️ Current Status

✅ **Local Testing**: Works with private key input  
⚠️ **Production**: Requires Web3 wallet integration  

---

## 🔐 Security Checklist

### Local Development (Current)
- [x] Private key input only in development
- [x] Warning message displayed
- [x] Using Hardhat test accounts only
- [x] Not committed to git

### Before Production
- [ ] Remove private key inputs
- [ ] Implement MetaMask integration
- [ ] Add WalletConnect support
- [ ] Sign transactions client-side
- [ ] Keep API read-only for blockchain data
- [ ] Only use API for crypto service calls

---

## 📝 Next Steps

1. **For Local Testing**: Use the current implementation with Hardhat accounts
2. **For Production**: Follow the "Production Solution" section above
3. **For Mobile**: Add WalletConnect integration
4. **For Enhanced UX**: Add wallet connection status indicator

---

## 🆘 Troubleshooting

### "Rider cannot propose" still appearing?

1. Check the private key matches the driver address:
   ```bash
   # In Hardhat console
   npx hardhat console --network localhost
   > const wallet = new ethers.Wallet('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d')
   > await wallet.getAddress()
   # Should return: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   ```

2. Verify API is receiving the private key:
   - Check Network tab in browser DevTools
   - Look for `driverPrivateKey` in request payload

3. Check API logs for errors:
   ```bash
   # In API terminal
   # Should show: "Creating driver wallet from provided private key"
   ```

### MetaMask not connecting?

1. Make sure MetaMask is installed
2. Add Hardhat network to MetaMask:
   - Network Name: Hardhat Local
   - RPC URL: http://127.0.0.1:8545
   - Chain ID: 31337
   - Currency: ETH

3. Import Hardhat test account to MetaMask:
   - Settings → Import Account
   - Paste private key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

---

## 📚 Resources

- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [MetaMask Docs](https://docs.metamask.io/)
- [WalletConnect](https://walletconnect.com/)
- [Web3Modal](https://web3modal.com/)
