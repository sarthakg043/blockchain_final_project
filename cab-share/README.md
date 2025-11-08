# Decentralized Cab-Sharing System with Blockchain

Complete implementation of the research paper: **"Achieving a Decentralized and Secure Cab Sharing System Using Blockchain Technology"**

This system implements a fully decentralized cab-sharing platform using:
- **Ethereum Smart Contracts** for ride orchestration
- **CP-ABE with Proxy Re-Encryption** for privacy-preserving ride matching
- **DPoS Consensus** for application-level validation
- **Reputation System** with deposit-based spam prevention

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Paper Mapping](#paper-mapping)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Running the System](#running-the-system)
6. [Usage Examples](#usage-examples)
7. [Testing](#testing)
8. [Security Properties](#security-properties)
9. [Project Structure](#project-structure)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Frontend (React)                     │
│              Rider UI | Driver UI | Admin Dashboard          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   API Gateway (Node.js)                      │
│         Coordinates contracts + crypto service               │
└─────────┬────────────────────────────────┬──────────────────┘
          │                                │
┌─────────▼────────────────┐    ┌─────────▼──────────────────┐
│  Smart Contracts         │    │  CP-ABE Crypto Service     │
│  (Ethereum/Hardhat)      │    │  (Python/PyCryptodome)     │
│                          │    │                            │
│  • CabShareCore          │    │  • Setup                   │
│  • Reputation            │    │  • KeyGen                  │
│  • DPoSDelegateHub       │    │  • Encrypt                 │
│  • Deposits              │    │  • Match                   │
│                          │    │  • ReKey                   │
│                          │    │  • ReEncrypt               │
│                          │    │  • Verify                  │
│                          │    │  • Decrypt                 │
└──────────────────────────┘    └────────────────────────────┘
```

---

## 📚 Paper Mapping

### Section III: System Model

| Paper Component | Implementation |
|----------------|----------------|
| **Entities** | Rider, Driver, Admin → Smart contract roles + API endpoints |
| **PTID (Privacy ID)** | Generated in `crypto_engine.py::keygen()` |
| **Access Policy (M, ρ)** | `AccessPolicy` struct in `Types.sol` |
| **Ride Request** | `CabShareCore::createRide()` |
| **Deposits** | `Deposits.sol` with configurable minimums |

### Section IV: Construction

| Algorithm | Implementation | File |
|-----------|----------------|------|
| **Setup** | `CPABEProxyReenc::setup()` | `offchain-crypto/crypto_engine.py` |
| **KeyGeneration** | `CPABEProxyReenc::keygen()` | `offchain-crypto/crypto_engine.py` |
| **Encryption** | `CPABEProxyReenc::encrypt()` | `offchain-crypto/crypto_engine.py` |
| **Matching** | `CPABEProxyReenc::check_match()` | `offchain-crypto/crypto_engine.py` |
| **ReEncryptKey** | `CPABEProxyReenc::generate_rekey()` | `offchain-crypto/crypto_engine.py` |
| **ReEncrypt** | `CPABEProxyReenc::reencrypt()` | `offchain-crypto/crypto_engine.py` |
| **Verification** | `CPABEProxyReenc::verify()` | `offchain-crypto/crypto_engine.py` |
| **Decryption** | `CPABEProxyReenc::decrypt()` | `offchain-crypto/crypto_engine.py` |

### Section V: Security Properties

| Property | Test Location | Verification Method |
|----------|---------------|---------------------|
| **Confidentiality** | `contracts/test/Security.test.ts` | CT never on-chain; only hashes |
| **Unidirectionality** | `contracts/test/Security.test.ts` | CT′ cannot reverse to CT |
| **Collusion Resistance** | `contracts/test/Security.test.ts` | RK bound to PT identifier |
| **Verifiability** | `offchain-crypto/crypto_engine.py` | R″ = g^{H1(F)} check |

### Section VI: Performance

| Metric | Measurement | File |
|--------|-------------|------|
| **Encryption Time** | vs. attributes I | `scripts/benchmark.py` |
| **Re-encryption Time** | vs. attributes I | `scripts/benchmark.py` |
| **Decryption Time** | vs. attributes I | `scripts/benchmark.py` |

### DPoS Consensus

- **Top 101 Delegates**: `DPoSDelegateHub::getTopDelegates()`
- **Reputation-weighted Voting**: `DPoSDelegateHub::voteForDelegate()`
- **Batch Validation**: `DPoSDelegateHub::validateBatch()` with >2n+1 approval threshold
- **Admin Score Updates**: `Reputation::bumpAdminScore()` ±1 on success/failure

### Reputation System

- **Driver Score**: `Score_D(i+1) = Score_D(i) + F` where F ∈ {-1, 1, 2}
- **Rider Score**: Same formula
- **Admin Score**: ±1 on batch validation success/failure
- **Implementation**: `Reputation.sol`

---

## 🔧 Prerequisites

### Required Software

1. **Node.js** v18+ and npm
2. **Python** 3.8+ with pip
3. **Git**

### System Dependencies

**Windows:**
```powershell
# Install Node.js from https://nodejs.org/
# Install Python from https://www.python.org/

# No special build tools needed!
# PyCryptodome works natively on Windows
```

**Linux/Mac:**
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python
sudo apt-get install python3 python3-pip

# Build tools
sudo apt-get install build-essential libgmp-dev libssl-dev
```

---

## 📦 Installation

### 1. Clone and Setup

```bash
cd cab-share
```

### 2. Install Dependencies

**Install all Node.js packages:**
```bash
npm install
cd contracts && npm install && cd ..
cd api && npm install && cd ..
cd web && npm install && cd ..
cd scripts && npm install && cd ..
```

**Install Python dependencies:**
```bash
cd offchain-crypto
pip install -r requirements.txt
cd ..
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your settings (defaults work for local development)
```

---

## 🚀 Running the System

### Step 1: Start Local Blockchain

Open **Terminal 1**:
```bash
cd contracts
npx hardhat node
```

This starts a local Ethereum node on `http://127.0.0.1:8545` with 20 test accounts.

### Step 2: Deploy Smart Contracts

Open **Terminal 2**:
```bash
cd contracts
npm run deploy:local
```

**Expected Output:**
```
Deploying Decentralized Cab-Sharing System...

✓ Reputation deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
✓ Deposits deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
✓ DPoSDelegateHub deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
✓ CabShareCore deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

✓ Addresses saved to deployments.json
```

**Update `.env` file** with the deployed contract addresses.

### Step 3: Start Crypto Service

Open **Terminal 3**:
```bash
cd offchain-crypto
python service.py
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════╗
║  CP-ABE Proxy Re-Encryption Service                      ║
║  Port: 5000                                              ║
║  Paper: Decentralized Cab-Sharing with Blockchain        ║
╚══════════════════════════════════════════════════════════╝

 * Running on http://0.0.0.0:5000
```

### Step 4: Initialize Crypto System

Open **Terminal 4**:
```bash
curl -X POST http://localhost:5000/api/crypto/setup
```

### Step 5: Start API Gateway

In **Terminal 4**:
```bash
cd api
npm run dev
```

**Expected Output:**
```
╔══════════════════════════════════════════════════════════╗
║  Decentralized Cab-Sharing API Gateway                   ║
║  Port: 3001                                              ║
║  Host: localhost                                         ║
╚══════════════════════════════════════════════════════════╝

✓ Server started successfully
✓ Event listeners active
```

### Step 6: Start Web Frontend

Open **Terminal 5**:
```bash
cd web
npm run dev
```

**Expected Output:**
```
  VITE v5.0.0  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 7: Access the Application

Open your browser to: **http://localhost:5173**

---

## 💡 Usage Examples

### Example 1: Complete Ride Flow (CLI)

Run the demo script:
```bash
cd scripts
npm run demo
```

This executes a full ride lifecycle:
1. Rider creates encrypted request
2. Driver proposes
3. Admin matches driver
4. CT re-encrypted to CT′
5. Driver verifies and decrypts
6. Ride completes
7. Ratings exchanged
8. Deposits refunded

### Example 2: Manual API Testing

**1. Create Ride Request:**
```bash
curl -X POST http://localhost:3001/api/rides \
  -H "Content-Type: application/json" \
  -d '{
    "plaintext": "Pickup: Downtown, Destination: Airport, Time: 2PM",
    "policy": {
      "matrix": [[1, 0], [0, 1]],
      "rho": {"0": "verified_driver", "1": "5star_rating"}
    },
    "riderAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  }'
```

**2. Driver Proposes:**
```bash
curl -X POST http://localhost:3001/api/rides/{RIDE_ID}/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "driverAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "trip": {
      "destination": "Airport",
      "attributes": ["verified_driver", "5star_rating"],
      "pricePerSeat": "0.01"
    }
  }'
```

**3. Match Driver:**
```bash
curl -X POST http://localhost:3001/api/rides/{RIDE_ID}/match \
  -H "Content-Type: application/json" \
  -d '{
    "driverAddress": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "driverAttributes": ["verified_driver", "5star_rating"]
  }'
```

**4. Driver Decrypts:**
```bash
curl "http://localhost:3001/api/rides/{RIDE_ID}/decrypt?userPtid={DRIVER_PTID}"
```

---

## 🧪 Testing

### Smart Contract Tests

```bash
cd contracts
npm test
```

**Tests cover:**
- ✅ Ride creation with deposits
- ✅ Driver proposals
- ✅ Matching logic
- ✅ Reputation updates (F ∈ {-1, 1, 2})
- ✅ DPoS delegate selection (top 101)
- ✅ Batch validation (>2n+1 threshold)
- ✅ Deposit slashing
- ✅ Access control

### Security Property Tests

```bash
cd contracts
npx hardhat test test/Security.test.ts
```

**Validates:**
- ✅ **Confidentiality**: Plaintext never on-chain
- ✅ **Unidirectionality**: CT′ → CT impossible
- ✅ **Collusion Resistance**: RK bound to PTID
- ✅ **Verifiability**: R″ = g^{H1(F)} check

### Crypto Service Tests

```bash
cd offchain-crypto
python -m pytest tests/
```

### Performance Benchmarks

```bash
cd scripts
npm run benchmark
```

Generates performance charts matching paper's Section VI:
- Encryption time vs. attributes
- Re-encryption time vs. attributes
- Decryption time vs. attributes

---

## 🔒 Security Properties

### 1. Confidentiality
- **Guarantee**: Ride details never stored on-chain in plaintext
- **Implementation**: Only `ctHash` and `ctPrimeHash` stored in `CabShareCore`
- **Verification**: Check `CabShareCore.sol` - no plaintext storage

### 2. Unidirectionality
- **Guarantee**: Admin cannot reverse CT′ back to CT
- **Implementation**: Proxy re-encryption is one-way transformation
- **Verification**: `crypto_engine.py::reencrypt()` - no inverse function exists

### 3. Collusion Resistance
- **Guarantee**: Admin + non-matched driver cannot decrypt
- **Implementation**: RK bound to PT identifier (B = H1(PT))
- **Verification**: `crypto_engine.py::verify()` checks binding

### 4. Verifiability
- **Guarantee**: Driver verifies CT′ authenticity before decrypt
- **Implementation**: R″ = g^{H1(F)} verification step
- **Verification**: `crypto_engine.py::verify()` must pass before decrypt

### 5. DPoS Consensus
- **Guarantee**: Batch acceptance requires >2n+1 delegate approvals
- **Implementation**: `DPoSDelegateHub::validateBatch()`
- **Verification**: Check `APPROVAL_THRESHOLD_NUMERATOR/DENOMINATOR = 2/3`

### 6. Reputation Integrity
- **Guarantee**: Scores update per paper's formulas
- **Implementation**: `Reputation.sol` with F ∈ {-1, 1, 2}
- **Verification**: `rateDriver()` and `rateRider()` enforce bounds

---

## 📁 Project Structure

```
cab-share/
├── contracts/                    # Solidity smart contracts
│   ├── contracts/
│   │   ├── CabShareCore.sol     # Main ride orchestration
│   │   ├── Reputation.sol       # Score management
│   │   ├── DPoSDelegateHub.sol  # DPoS consensus
│   │   ├── Deposits.sol         # Collateral management
│   │   ├── libraries/
│   │   │   └── Types.sol        # Shared data structures
│   │   └── interfaces/          # Contract interfaces
│   ├── scripts/deploy.ts        # Deployment script
│   ├── test/                    # Contract tests
│   └── hardhat.config.ts
│
├── offchain-crypto/              # CP-ABE + Proxy Re-Encryption
│   ├── service.py               # Flask REST API
│   ├── routes.py                # API endpoints
│   ├── crypto_engine.py         # Core algorithms (Section IV)
│   ├── models.py                # Data structures
│   ├── requirements.txt
│   └── tests/
│
├── api/                          # Node.js API Gateway
│   ├── src/
│   │   ├── index.ts             # Express server
│   │   ├── config.ts            # Configuration
│   │   ├── routes/
│   │   │   └── rides.ts         # Ride endpoints
│   │   ├── eth/
│   │   │   └── contracts.ts     # Ethers.js bindings
│   │   └── services/
│   │       └── cryptoService.ts # Crypto API client
│   └── package.json
│
├── web/                          # React Frontend
│   ├── src/
│   │   ├── pages/               # UI pages
│   │   ├── components/          # Reusable components
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/api.ts           # API client
│   └── package.json
│
├── scripts/                      # Utility scripts
│   ├── seed.ts                  # Seed test data
│   ├── demo-flow.ts             # End-to-end demo
│   └── benchmark.ts             # Performance tests
│
├── README.md                     # This file
├── .env.example                 # Environment template
└── package.json                 # Monorepo root
```

---

## 🎯 Key Features Implemented

✅ **Complete CP-ABE with Proxy Re-Encryption** (Section IV algorithms)  
✅ **DPoS Consensus** with top 101 delegates and >2n+1 approval  
✅ **Reputation System** with F ∈ {-1, 1, 2} updates  
✅ **Deposit-based Spam Prevention** with slashing  
✅ **Privacy-Preserving Identifiers** (PTID)  
✅ **Verifiable Re-Encryption** (R″ = g^{H1(F)})  
✅ **On-chain Orchestration** with off-chain crypto  
✅ **Event-driven Architecture** with real-time updates  
✅ **Full REST API** for all operations  
✅ **Modern Web UI** with React + Tailwind  

---

## 🐛 Troubleshooting

### Issue: Crypto Dependencies Installation

**Windows (Works out of the box!):**
```powershell
cd offchain-crypto
pip install -r requirements.txt
# PyCryptodome installs cleanly on Windows!
```

**Linux:**
```bash
cd offchain-crypto
pip install -r requirements.txt
```

### Issue: Contract Deployment Fails

```bash
# Ensure Hardhat node is running
cd contracts
npx hardhat node

# In another terminal, deploy
npm run deploy:local
```

### Issue: API Cannot Connect to Contracts

1. Check `.env` has correct contract addresses from `deployments.json`
2. Verify Hardhat node is running on port 8545
3. Restart API gateway

### Issue: Crypto Service Not Responding

```bash
# Check if port 5000 is available
netstat -an | grep 5000

# Restart service
cd offchain-crypto
python service.py
```

---

## 📊 Performance Notes

Per paper's Section VI:
- **Encryption**: O(|I|) where I = number of attributes
- **Re-encryption**: O(|I|) transformation
- **Decryption**: O(|I|) pairing operations
- **Gas Costs**: ~200k gas per ride creation (only hashes on-chain)

Run benchmarks:
```bash
cd scripts
npm run benchmark
```

---

## 🤝 Contributing

This implementation follows the paper's specifications exactly. For modifications:
1. Update relevant algorithm in `crypto_engine.py` or smart contract
2. Add corresponding tests
3. Update this README's paper mapping section

---

## 📄 License

MIT License - See LICENSE file

---

## 📖 Citation

If you use this implementation, please cite the original paper:
```
"Achieving a Decentralized and Secure Cab Sharing System Using Blockchain Technology"
```

---

## ✨ Quick Start Summary

```bash
# Terminal 1: Blockchain
cd contracts && npx hardhat node

# Terminal 2: Deploy
cd contracts && npm run deploy:local

# Terminal 3: Crypto Service
cd offchain-crypto && python service.py

# Terminal 4: Initialize + API
curl -X POST http://localhost:5000/api/crypto/setup
cd api && npm run dev

# Terminal 5: Web UI
cd web && npm run dev

# Browser: http://localhost:5173
```

**System is now ready! 🎉**

---

For questions or issues, please check the troubleshooting section or review the paper mapping to understand which component implements each algorithm.
