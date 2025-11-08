# 🚗 Complete User Guide - Decentralized Cab Sharing

## ✅ All Issues Fixed!

1. ✅ **Rider page** - Can now add/remove required attributes
2. ✅ **Driver page** - Can now add/remove your attributes
3. ✅ **Matching logic** - Driver with MORE attributes than required will match!

---

## 📱 Step-by-Step Usage

### **Step 1: Rider Creates Ride Request**

1. Go to **Rider** page (top navigation)
2. Fill in the form:
   - **Pickup Location**: `Downtown Mall`
   - **Destination**: `Airport Terminal 3`
   - **Pickup Time**: `2:00 PM`
   - **Max Price (ETH)**: `0.01`

3. **Required Driver Attributes** (you can now edit these!):
   - Default: `verified_driver`, `5star_rating`
   - Click **X** to remove an attribute
   - Type new attribute and click **Add** (or press Enter)
   - Examples: `premium_vehicle`, `eco_friendly`, `wheelchair_accessible`

4. Click **Create Ride Request**

5. **Copy the Ride ID** from the success message (e.g., `0x1234...`)

---

### **Step 2: Driver Proposes Ride**

1. Go to **Driver** page
2. **Your Attributes** section (you can now edit!):
   - Default: `verified_driver`, `5star_rating`, `premium_vehicle`
   - Click **X** to remove
   - Type and click **Add** to add more

3. Fill in the form:
   - **Ride ID**: `<paste from Step 1>`
   - **Destination**: `Airport Terminal 3`
   - **Price per Seat (ETH)**: `0.01`
   - **Available Seats**: `3`

4. Click **Propose Ride**

---

### **Step 3: Admin Matches Driver**

1. Go to **Admin** page
2. Fill in:
   - **Ride ID**: `<paste from Step 1>`
   - **Driver Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (Hardhat account #1)
   - **Driver Attributes**: `verified_driver,5star_rating`

**IMPORTANT:** Even if the driver has `verified_driver,5star_rating,premium_vehicle`, you only need to list the REQUIRED attributes from the policy!

3. Click **Match Driver**

4. **Success!** The system will:
   - ✅ Verify driver has required attributes
   - ✅ Generate re-encryption key
   - ✅ Transform CT → CT′
   - ✅ Store CT′ hash on blockchain

---

## 🔍 Understanding the Matching Logic

### **How Matching Works**

**Rider requires:** `verified_driver`, `5star_rating`  
**Driver has:** `verified_driver`, `5star_rating`, `premium_vehicle`

**Result:** ✅ **MATCH!**

The driver has **ALL** the required attributes (and more). This is correct behavior!

### **Policy Satisfaction**

```
Required Attributes ⊆ Driver Attributes
```

If the driver has a **superset** of required attributes, they match!

### **Examples**

#### ✅ Example 1: Match
- **Rider requires**: `verified_driver`, `5star_rating`
- **Driver has**: `verified_driver`, `5star_rating`, `premium_vehicle`
- **Result**: ✅ Match (driver has all required + extra)

#### ✅ Example 2: Match
- **Rider requires**: `verified_driver`
- **Driver has**: `verified_driver`, `5star_rating`, `premium_vehicle`, `eco_friendly`
- **Result**: ✅ Match (driver has all required + many extras)

#### ❌ Example 3: No Match
- **Rider requires**: `verified_driver`, `5star_rating`, `wheelchair_accessible`
- **Driver has**: `verified_driver`, `5star_rating`
- **Result**: ❌ No match (driver missing `wheelchair_accessible`)

---

## 🎯 Test Scenarios

### **Scenario 1: Basic Match**

**Rider:**
```
Pickup: Downtown Mall
Destination: Airport
Attributes Required: verified_driver, 5star_rating
```

**Driver:**
```
Attributes: verified_driver, 5star_rating, premium_vehicle
Destination: Airport
```

**Admin:**
```
Driver Attributes: verified_driver,5star_rating
```

**Result:** ✅ Match successful!

---

### **Scenario 2: Premium Service**

**Rider:**
```
Pickup: Hotel
Destination: Conference Center
Attributes Required: verified_driver, 5star_rating, premium_vehicle, wifi_available
```

**Driver:**
```
Attributes: verified_driver, 5star_rating, premium_vehicle, wifi_available, refreshments
```

**Admin:**
```
Driver Attributes: verified_driver,5star_rating,premium_vehicle,wifi_available
```

**Result:** ✅ Match successful! (Driver has all 4 required + bonus attribute)

---

### **Scenario 3: Failed Match**

**Rider:**
```
Attributes Required: verified_driver, 5star_rating, wheelchair_accessible
```

**Driver:**
```
Attributes: verified_driver, 5star_rating
```

**Admin:**
```
Driver Attributes: verified_driver,5star_rating
```

**Result:** ❌ Match fails! (Driver missing `wheelchair_accessible`)

---

## 🔐 What Happens Behind the Scenes

### **1. Rider Creates Request**
```
Plaintext: "Pickup: Downtown, Destination: Airport, Time: 2PM, Price: 0.01"
Policy: {verified_driver AND 5star_rating}
↓
Encrypt with CP-ABE
↓
CT (ciphertext) stored off-chain
H(CT) (hash) stored on-chain
```

### **2. Driver Proposes**
```
Driver attributes: [verified_driver, 5star_rating, premium_vehicle]
↓
Submit proposal to blockchain
↓
Lock driver deposit
```

### **3. Admin Matches**
```
Check: {verified_driver, 5star_rating} ⊆ [verified_driver, 5star_rating, premium_vehicle]
✅ TRUE - Driver has all required attributes!
↓
Generate RK (re-encryption key)
↓
Transform: CT → CT′
↓
Verify: R″ = g^{H1(F)}
↓
Store H(CT′) on blockchain
```

### **4. Driver Decrypts**
```
Driver receives CT′
↓
Decrypt with SK_driver
↓
Get plaintext: "Pickup: Downtown, Destination: Airport..."
↓
Pick up rider!
```

---

## 💡 Tips

### **For Riders**
- Be specific with required attributes
- More attributes = fewer matching drivers
- Common attributes: `verified_driver`, `5star_rating`, `premium_vehicle`

### **For Drivers**
- Add all your attributes to increase match chances
- More attributes = more ride opportunities
- Keep your reputation high!

### **For Admins**
- Only list the REQUIRED attributes (from policy)
- Don't list ALL driver attributes
- The system checks if driver has AT LEAST the required ones

---

## 🐛 Common Issues

### Issue: "Match fails even though driver has the attributes"

**Cause:** You're listing ALL driver attributes instead of just the required ones

**Fix:** In Admin page, only enter the attributes that the RIDER REQUIRED, not all the driver's attributes.

**Example:**
- Rider requires: `verified_driver,5star_rating`
- Driver has: `verified_driver,5star_rating,premium_vehicle`
- Admin should enter: `verified_driver,5star_rating` ← Just the required ones!

---

### Issue: "Can't add/remove attributes"

**Fix:** The UI is now updated! You should see:
- Input box to type new attributes
- **Add** button (or press Enter)
- **X** button on each attribute badge to remove

Refresh the page if you don't see these controls.

---

## 🎉 You're Ready!

Your system now has:
- ✅ Editable rider requirements
- ✅ Editable driver attributes
- ✅ Correct matching logic (superset matching)
- ✅ Full CP-ABE encryption
- ✅ Proxy re-encryption
- ✅ Blockchain integration

**Happy testing!** 🚗💨✨
