import { Router } from 'express';
import { ethers } from 'ethers';
import { getCabShareCore } from '../eth/contracts.js';
import { cryptoService } from '../services/cryptoService.js';
import fs from 'fs/promises';
import path from 'path';
import config from '../config.js';

const router = Router();

// Storage helper
const saveToStorage = async (filename: string, data: any) => {
  const storagePath = path.join(config.storage.path, filename);
  await fs.mkdir(config.storage.path, { recursive: true });
  await fs.writeFile(storagePath, JSON.stringify(data, null, 2));
};

const loadFromStorage = async (filename: string) => {
  const storagePath = path.join(config.storage.path, filename);
  try {
    const data = await fs.readFile(storagePath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    console.error(`Error loading ${filename}:`, error.message);
    throw new Error(`File not found: ${filename}. Make sure the ride was created first.`);
  }
};

// Storage for ride pool
const RIDE_DATA_FILE = 'ride_data.json';
const FULFILLED_RIDES_FILE = 'fulfilled_rides.json';

const loadRidePool = async () => {
  try {
    return await loadFromStorage(RIDE_DATA_FILE);
  } catch {
    return { rides: [] };
  }
};

const saveRidePool = async (ridePool: any) => {
  await saveToStorage(RIDE_DATA_FILE, ridePool);
};

const loadFulfilledRides = async () => {
  try {
    return await loadFromStorage(FULFILLED_RIDES_FILE);
  } catch {
    return { rides: [] };
  }
};

const saveFulfilledRides = async (fulfilledRides: any) => {
  await saveToStorage(FULFILLED_RIDES_FILE, fulfilledRides);
};

/**
 * GET /rides/pool
 * Get all unfulfilled rides
 */
router.get('/pool', async (req, res) => {
  try {
    const ridePool = await loadRidePool();
    res.json(ridePool);
  } catch (error: any) {
    console.error('Error loading ride pool:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /rides
 * Create encrypted ride request
 */
router.post('/', async (req, res) => {
  try {
    const { plaintext, policy, riderAddress, rideMetadata } = req.body;

    if (!plaintext || !policy) {
      return res.status(400).json({ error: 'Missing plaintext or policy' });
    }

    // Encrypt ride data
    const encryptResult = await cryptoService.encrypt(plaintext, policy);
    
    // Generate ride ID
    const rideId = ethers.keccak256(ethers.toUtf8Bytes(`${riderAddress}:${Date.now()}`));
    
    // Store CT off-chain
    await saveToStorage(`ct_${rideId}.json`, encryptResult.ciphertext);
    
    // Store policy reference
    const policyRef = `ipfs://policy_${rideId}`;  // In production, upload to IPFS
    await saveToStorage(`policy_${rideId}.json`, policy);
    
    // Prepare on-chain data
    const accessPolicy = {
      policyHash: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(policy))),
      policyRef,
      earliestArrival: 0,
      latestArrival: Math.floor(Date.now() / 1000) + 86400, // 24 hours
      minAttributes: policy.matrix.length
    };
    
    // Call smart contract
    const cabShareCore = getCabShareCore();
    const minDeposit = ethers.parseEther('0.01');
    
    const tx = await cabShareCore.createRide(
      rideId,
      `0x${encryptResult.ct_hash}`,
      accessPolicy,
      { value: minDeposit }
    );
    
    await tx.wait();
    
    // Add ride to pool
    const ridePool = await loadRidePool();
    ridePool.rides = ridePool.rides || [];
    ridePool.rides.push({
      rideId,
      riderAddress,
      destination: rideMetadata?.destination || 'Not specified',
      pickup: rideMetadata?.pickup || 'Not specified',
      departureTime: accessPolicy.earliestArrival,
      latestArrival: accessPolicy.latestArrival,
      minAttributes: accessPolicy.minAttributes,
      price: rideMetadata?.price || 'Not specified',
      time: rideMetadata?.time || 'Not specified',
      status: 0, // Requested
      createdAt: Math.floor(Date.now() / 1000),
      proposalCount: 0
    });
    await saveRidePool(ridePool);
    
    res.json({
      success: true,
      rideId,
      ctHash: encryptResult.ct_hash,
      binding: encryptResult.binding,
      txHash: tx.hash
    });
    
  } catch (error: any) {
    console.error('Error creating ride:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /rides/:id/proposals
 * Driver proposes to fulfill ride
 */
router.post('/:id/proposals', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { driverAddress, driverPrivateKey, trip } = req.body;

    if (!trip || !trip.attributes) {
      return res.status(400).json({ error: 'Missing trip data or attributes' });
    }

    // Hash attributes
    const hashedAttributes = trip.attributes.map((attr: string) =>
      ethers.keccak256(ethers.toUtf8Bytes(attr))
    );

    const driverTrip = {
      departureTime: trip.departureTime || Math.floor(Date.now() / 1000),
      destination: trip.destination || '',
      arrivalTime: trip.arrivalTime || Math.floor(Date.now() / 1000) + 3600,
      route: trip.route || '',
      availableSeats: trip.availableSeats || 1,
      pricePerSeat: ethers.parseEther(trip.pricePerSeat || '0.01'),
      attributes: hashedAttributes
    };

    // Create driver-specific wallet if private key provided
    let driverWallet;
    if (driverPrivateKey) {
      // Use driver's private key
      const { provider } = await import('../eth/contracts.js');
      driverWallet = new ethers.Wallet(driverPrivateKey, provider);
      
      // Verify the private key matches the address
      if (driverWallet.address.toLowerCase() !== driverAddress.toLowerCase()) {
        return res.status(400).json({ 
          error: 'Private key does not match driver address',
          expected: driverAddress,
          actual: driverWallet.address
        });
      }
    } else {
      // Fallback: Use API wallet (less secure, for testing only)
      console.warn('⚠️  WARNING: Using API wallet for driver transaction. This should only be used for testing!');
      const { wallet } = await import('../eth/contracts.js');
      driverWallet = wallet;
    }

    // Load contract ABI
    const abiPath = path.join(process.cwd(), '..', 'contracts', 'artifacts', 'contracts', 'CabShareCore.sol', 'CabShareCore.json');
    const artifact = JSON.parse(await fs.readFile(abiPath, 'utf8'));
    const { provider } = await import('../eth/contracts.js');
    const config = (await import('../config.js')).default;
    
    // Create contract instance with driver's wallet
    const cabShareCore = new ethers.Contract(config.contracts.cabShareCore, artifact.abi, driverWallet);
    const minDeposit = ethers.parseEther('0.02');

    const tx = await cabShareCore.proposeRide(rideId, driverTrip, { value: minDeposit });
    await tx.wait();

    // Update ride pool - increment proposal count and change status
    const ridePool = await loadRidePool();
    const rideIndex = ridePool.rides.findIndex((r: any) => r.rideId === rideId);
    if (rideIndex !== -1) {
      ridePool.rides[rideIndex].proposalCount = (ridePool.rides[rideIndex].proposalCount || 0) + 1;
      ridePool.rides[rideIndex].status = 1; // Proposed
    }
    await saveRidePool(ridePool);

    res.json({
      success: true,
      rideId,
      driver: driverAddress,
      txHash: tx.hash
    });

  } catch (error: any) {
    console.error('Error proposing ride:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /rides/:id/match
 * Check policy match and prepare re-encryption (blockchain call done by frontend)
 */
router.post('/:id/match', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { driverAddress, driverAttributes } = req.body;

    console.log('Match request:', { rideId, driverAddress, driverAttributes });

    // Load policy
    console.log('Loading policy...');
    const policy = await loadFromStorage(`policy_${rideId}.json`);
    console.log('Policy loaded:', policy);
    
    // Check if driver attributes satisfy policy
    console.log('Checking match...');
    const matches = await cryptoService.match(driverAttributes, policy);
    console.log('Match result:', matches);
    
    if (!matches) {
      return res.status(400).json({ 
        success: false,
        error: 'Driver attributes do not satisfy policy' 
      });
    }

    // Generate re-encryption key
    const originalCt = await loadFromStorage(`ct_${rideId}.json`);
    
    // Create target policy for driver (simplified - same policy)
    const targetPolicy = policy;
    
    const rekeyResult = await cryptoService.rekey(originalCt, targetPolicy);
    
    // Re-encrypt CT to CT'
    const reencryptResult = await cryptoService.reencrypt(originalCt, rekeyResult.rekey);
    
    // Store CT' off-chain
    await saveToStorage(`ct_prime_${rideId}.json`, reencryptResult.ct_prime);

    // Move ride from pool to fulfilled
    const ridePool = await loadRidePool();
    const rideIndex = ridePool.rides.findIndex((r: any) => r.rideId === rideId);
    if (rideIndex !== -1) {
      const fulfilledRide = { 
        ...ridePool.rides[rideIndex], 
        status: 2, // Matched
        matchedDriver: driverAddress,
        matchedAt: Math.floor(Date.now() / 1000)
      };
      
      // Remove from pool
      ridePool.rides.splice(rideIndex, 1);
      await saveRidePool(ridePool);
      
      // Add to fulfilled
      const fulfilledRides = await loadFulfilledRides();
      fulfilledRides.rides = fulfilledRides.rides || [];
      fulfilledRides.rides.push(fulfilledRide);
      await saveFulfilledRides(fulfilledRides);
    }

    res.json({
      success: true,
      rideId,
      driver: driverAddress,
      ctPrimeHash: reencryptResult.ct_prime_hash,
      message: 'Policy matched and re-encryption prepared. Frontend will submit to blockchain.'
    });

  } catch (error: any) {
    console.error('Error matching driver:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /rides/:id/decrypt
 * Driver verifies and decrypts CT'
 */
router.get('/:id/decrypt', async (req, res) => {
  try {
    const { id: rideId } = req.params;
    const { userPtid } = req.query;

    if (!userPtid) {
      return res.status(400).json({ error: 'Missing userPtid' });
    }

    // Load CT'
    const ctPrime = await loadFromStorage(`ct_prime_${rideId}.json`);
    
    // Verify
    const isValid = await cryptoService.verify(ctPrime, userPtid as string);
    
    if (!isValid) {
      return res.status(400).json({ error: 'Verification failed' });
    }

    // Decrypt
    const plaintext = await cryptoService.decrypt(ctPrime, userPtid as string);

    res.json({
      success: true,
      plaintext,
      verified: true
    });

  } catch (error: any) {
    console.error('Error decrypting:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /rides/:id/complete
 * Complete ride
 */
router.post('/:id/complete', async (req, res) => {
  try {
    const { id: rideId } = req.params;

    const cabShareCore = getCabShareCore();
    const tx = await cabShareCore.completeRide(rideId);
    await tx.wait();

    res.json({
      success: true,
      rideId,
      txHash: tx.hash
    });

  } catch (error: any) {
    console.error('Error completing ride:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /rides/:id
 * Get ride details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id: rideId } = req.params;

    const cabShareCore = getCabShareCore();
    const ride = await cabShareCore.getRide(rideId);

    res.json({
      success: true,
      ride: {
        rideId: ride.rideId,
        rider: ride.rider,
        driver: ride.driver,
        ctHash: ride.ctHash,
        ctPrimeHash: ride.ctPrimeHash,
        status: ride.status,
        createdAt: Number(ride.createdAt),
        matchedAt: Number(ride.matchedAt),
        completedAt: Number(ride.completedAt)
      }
    });

  } catch (error: any) {
    console.error('Error fetching ride:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
