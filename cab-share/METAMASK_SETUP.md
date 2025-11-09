# MetaMask Setup for Local Development

## ✅ What Changed

The frontend now uses **MetaMask** to sign transactions securely instead of sending private keys to the API. This is the proper way to handle blockchain transactions.

### Benefits:
- 🔒 **Secure**: Private keys never leave your browser
- ✅ **Industry Standard**: Same pattern used by all Web3 apps
- 🎯 **Production Ready**: No code changes needed for mainnet
- 🔐 **User Control**: Users sign transactions in MetaMask

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Install MetaMask

1. Install the [MetaMask browser extension](https://metamask.io/)
2. Create a wallet or import existing one
3. Complete the setup wizard

### Step 2: Add Hardhat Local Network

1. Open MetaMask
2. Click the **network dropdown** (top center)
3. Click **"Add Network"** → **"Add a network manually"**
4. Enter these details:

```
Network Name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency Symbol: ETH
```

5. Click **"Save"**

### Step 3: Import Hardhat Test Account

You need to import a test account from Hardhat to have funds:

1. Open MetaMask
2. Click the **account icon** (top right)
3. Select **"Import Account"**
4. Choose **"Private Key"**
5. Paste one of these Hardhat test private keys:

**Account #0 (Rider):**
```
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```
Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

**Account #1 (Driver):**
```
0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
```
Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`

**Account #2 (Another Driver):**
```
0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
```
Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`

6. Click **"Import"**
7. Label the account (e.g., "Hardhat Driver")

---

## 🎮 How to Use

### For Riders (Create Ride)
1. Open frontend: http://localhost:5173
2. Switch to **Account #0** in MetaMask (Rider)
3. Click **"Connect Wallet"** in the UI
4. Fill in ride details
5. Click **"Create Ride"**
6. **Approve transaction in MetaMask popup**
7. Wait for confirmation ✅

### For Drivers (Propose Ride)
1. Go to **"Driver"** page
2. Switch to **Account #1** in MetaMask (Driver)
3. Click **"Connect Wallet"**
4. Enter the Ride ID from rider
5. Fill in trip details
6. Click **"Propose Ride"**
7. **Approve transaction in MetaMask popup**
8. Wait for confirmation ✅

---

## 🔍 How It Works

### Old Flow (Insecure):
```
Browser → API → Blockchain
         ↑
    Private Key sent!
```

### New Flow (Secure):
```
Browser → MetaMask → Blockchain
            ↑
    Private key stays here!
```

### Technical Details:

1. **Frontend connects to MetaMask**
   ```typescript
   const { provider, connect } = useWallet();
   await connect(); // Opens MetaMask
   ```

2. **Frontend creates contract instance**
   ```typescript
   const signer = await provider.getSigner();
   const contract = new Contract(address, abi, signer);
   ```

3. **Frontend calls contract method**
   ```typescript
   const tx = await contract.proposeRide(rideId, trip, { value: deposit });
   ```

4. **MetaMask shows popup** - User reviews and signs
5. **Transaction sent to blockchain** - Private key never exposed!

---

## 🛠️ Troubleshooting

### "Connect Wallet" button doesn't work

**Solution 1: Install MetaMask**
- Visit https://metamask.io/
- Install the extension for your browser
- Restart browser

**Solution 2: Check if MetaMask is locked**
- Open MetaMask
- Enter your password
- Try connecting again

### "Wrong Network" or Chain ID error

**Solution:**
1. Open MetaMask
2. Click network dropdown
3. Select **"Hardhat Local"**
4. If not visible, add it manually (see Step 2 above)

### "Insufficient funds" error

**Solution:**
You need to import a Hardhat test account:
1. These accounts have 10,000 ETH each
2. Follow **Step 3** above to import
3. Make sure you're on the **Hardhat Local** network

### Transaction fails with "Rider cannot propose"

**Solution:**
Make sure you're using the **correct account**:
- **Account #0**: For creating rides (Rider)
- **Account #1+**: For proposing rides (Driver)

Switch accounts in MetaMask and try again.

### MetaMask popup doesn't appear

**Solution 1: Check popup blocker**
- Allow popups for localhost:5173
- Try again

**Solution 2: Open MetaMask manually**
- Click MetaMask extension icon
- Look for pending transaction
- Approve or reject it

### "Nonce too high" error

**Solution:**
Reset MetaMask account:
1. Open MetaMask
2. Click account icon → Settings
3. Advanced → **"Clear activity tab data"**
4. Confirm
5. Try transaction again

### Hardhat node restarted

**Solution:**
When you restart `npx hardhat node`:
1. **Reset MetaMask**: Settings → Advanced → "Clear activity tab data"
2. **Re-import accounts** (balances reset to 10,000 ETH)
3. **Redeploy contracts** if needed

---

## 🎯 Testing Checklist

- [ ] MetaMask installed
- [ ] Hardhat Local network added
- [ ] Test account imported (has 10,000 ETH)
- [ ] Connected to Hardhat Local network
- [ ] Hardhat node running (`npx hardhat node`)
- [ ] Contracts deployed
- [ ] Frontend running (http://localhost:5173)
- [ ] Can connect wallet in UI
- [ ] Can approve transactions in MetaMask

---

## 📊 Network Info

| Parameter | Value |
|-----------|-------|
| **Network Name** | Hardhat Local |
| **RPC URL** | http://127.0.0.1:8545 |
| **Chain ID** | 31337 |
| **Currency** | ETH |
| **Block Explorer** | None (local) |

---

## 🔐 Security Notes

### For Local Development:
✅ **Safe to import private keys** - These are public test keys
✅ **Only use with Hardhat Local** - Never on mainnet!
✅ **10,000 ETH each** - Free test funds
✅ **Reset anytime** - Just restart Hardhat node

### For Production:
❌ **Never import private keys from unknown sources**
❌ **Never share your real wallet private key**
❌ **Always verify contract addresses**
✅ **Use hardware wallet for large amounts**

---

## 🚀 Next Steps

Once MetaMask is working locally, you can:

1. **Deploy to testnet** (Sepolia, Goerli)
   - Just change network in MetaMask
   - Get testnet ETH from faucets
   - Same code works!

2. **Deploy to mainnet**
   - Use the same frontend code
   - Update contract addresses
   - Users connect their own wallets

3. **Add WalletConnect** for mobile support
   - Users scan QR code
   - Use mobile wallets
   - No extension needed

---

## 📚 Resources

- [MetaMask Documentation](https://docs.metamask.io/)
- [Ethers.js v6 Docs](https://docs.ethers.org/v6/)
- [Hardhat Network](https://hardhat.org/hardhat-network/)
- [Web3 Best Practices](https://ethereum.org/en/developers/docs/web3/)

---

## ✅ Success Checklist

After setup, you should be able to:

- [x] See "Connect Wallet" button in UI
- [x] Click button → MetaMask opens
- [x] Approve connection → See your address
- [x] Fill form → Click "Propose Ride"
- [x] MetaMask shows transaction details
- [x] Approve → Transaction confirmed
- [x] See success message with tx hash

**If all steps work: You're ready to go! 🎉**
