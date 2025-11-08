# 🔧 Fixing Match Driver 500 Error

## 🐛 Error: "Request failed with status code 500"

This error occurs when trying to match a driver in the Admin dashboard.

---

## 🔍 **Root Causes**

### **1. Ride Not Created First**
The most common cause - you're trying to match a driver to a ride that doesn't exist or wasn't created through the system.

### **2. Missing Storage Files**
The system stores policy and ciphertext files. If these don't exist, matching fails.

### **3. Invalid Ride ID**
Using a wrong or malformed Ride ID.

---

## ✅ **Solution: Follow the Correct Order**

### **Step 1: Create Ride (Rider Page) - MUST DO FIRST!**

1. Go to **Rider** page
2. Fill in all fields:
   ```
   Pickup: Downtown Mall
   Destination: Airport Terminal 3
   Time: 2:00 PM
   Price: 0.01
   ```
3. Set required attributes (or use defaults)
4. Click **Create Ride Request**
5. **COPY THE RIDE ID!** (e.g., `1`, `2`, `3`, etc.)

**This creates:**
- ✅ Ride on blockchain
- ✅ `policy_<rideId>.json` file
- ✅ `ct_<rideId>.json` file

---

### **Step 2: Propose Ride (Driver Page)**

1. Go to **Driver** page
2. **Paste the Ride ID** from Step 1
3. Fill in destination and other details
4. Click **Propose Ride**

---

### **Step 3: Match Driver (Admin Page)**

1. Go to **Admin** page
2. **Paste the same Ride ID** from Step 1
3. Enter driver address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
4. Enter driver attributes: `verified_driver,5star_rating`
5. Click **Match Driver**

**Should work now!** ✅

---

## 🎯 **Complete Example Workflow**

### **Scenario: Alice needs a ride**

**Terminal Setup (must be running):**
- ✅ Terminal 1: Hardhat node
- ✅ Terminal 3: Crypto service
- ✅ Terminal 4: API gateway
- ✅ Terminal 5: Web UI

**Step-by-Step:**

1. **Rider Page (Alice)**
   ```
   Pickup: Downtown Mall
   Destination: Airport
   Time: 2:00 PM
   Price: 0.01 ETH
   Attributes: verified_driver, 5star_rating
   ```
   Click **Create Ride Request**
   
   **Result:** Ride ID = `1` ← **COPY THIS!**

2. **Driver Page (Bob)**
   ```
   Ride ID: 1  ← Paste here!
   Destination: Airport
   Price: 0.01 ETH
   Seats: 3
   Your Attributes: verified_driver, 5star_rating, premium_vehicle
   ```
   Click **Propose Ride**
   
   **Result:** Proposal submitted ✅

3. **Admin Page**
   ```
   Ride ID: 1  ← Same ID!
   Driver Address: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   Driver Attributes: verified_driver,5star_rating
   ```
   Click **Match Driver**
   
   **Result:** Match successful! ✅

---

## 🐛 **Debugging**

### **Check API Logs**

The API now has detailed logging. Check Terminal 4 (API) for:

```
Match request: { rideId: '1', driverAddress: '0x7099...', driverAttributes: [...] }
Loading policy...
Policy loaded: { matrix: [...], rho: {...} }
Checking match...
Match result: true
```

If you see an error like:
```
Error loading policy_1.json: ENOENT: no such file or directory
```

**This means:** The ride was never created! Go back to Step 1.

---

### **Check Storage Directory**

```powershell
cd api
ls data
```

**You should see:**
- `policy_1.json` (or policy_<rideId>.json)
- `ct_1.json` (or ct_<rideId>.json)

If these files don't exist, the ride wasn't created properly.

---

### **Restart Everything**

If nothing works:

1. **Stop all services** (Ctrl+C in all terminals)
2. **Delete storage**:
   ```powershell
   rm -r api/data
   ```
3. **Restart Hardhat** (Terminal 1):
   ```powershell
   cd contracts
   npx hardhat node
   ```
4. **Restart API** (Terminal 4):
   ```powershell
   cd api
   npm run dev
   ```
5. **Restart Web** (Terminal 5):
   ```powershell
   cd web
   npm run dev
   ```
6. **Start fresh** - Create a new ride from Rider page

---

## 📋 **Checklist Before Matching**

- [ ] Hardhat node is running (Terminal 1)
- [ ] Crypto service is running (Terminal 3)
- [ ] API is running (Terminal 4)
- [ ] Web UI is running (Terminal 5)
- [ ] You created a ride on Rider page FIRST
- [ ] You copied the Ride ID
- [ ] You proposed the ride on Driver page
- [ ] You're using the SAME Ride ID in Admin page

---

## 💡 **Common Mistakes**

### ❌ Mistake 1: Using Random Ride ID
```
Admin: Ride ID = 999
```
**Fix:** Use the actual Ride ID from the Rider page!

### ❌ Mistake 2: Skipping Rider Page
```
Driver → Admin (without creating ride first)
```
**Fix:** Always create ride on Rider page FIRST!

### ❌ Mistake 3: Wrong Ride ID Format
```
Admin: Ride ID = 0x1234abcd...
```
**Fix:** Use simple number: `1`, `2`, `3`, etc.

---

## ✅ **Success Indicators**

When everything works, you'll see:

**API Logs:**
```
Match request: { rideId: '1', ... }
Loading policy...
Policy loaded: { matrix: [[1], [1]], rho: { '0': 'verified_driver', '1': '5star_rating' } }
Checking match...
Match result: true
✓ Driver matched successfully
```

**Admin Page:**
```
✓ Match successful!
Ride ID: 1
Driver: 0x7099...
CT' Hash: 0xabc...
Tx Hash: 0xdef...
```

---

## 🎉 **You're Ready!**

Follow the correct order:
1. **Rider** → Create ride → Get Ride ID
2. **Driver** → Propose with that Ride ID
3. **Admin** → Match with that Ride ID

**The 500 error should be gone!** 🚗💨✨
