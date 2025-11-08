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

/**
 * POST /rides
 * Create encrypted ride request
 */
router.post('/', async (req, res) => {
  try {
    const { plaintext, policy, riderAddress } = req.body;

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
    const { driverAddress, trip } = req.body;

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

    const cabShareCore = getCabShareCore();
    const minDeposit = ethers.parseEther('0.02');

    const tx = await cabShareCore.proposeRide(rideId, driverTrip, { value: minDeposit });
    await tx.wait();

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
 * Admin/delegate matches driver
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
      return res.status(400).json({ error: 'Driver attributes do not satisfy policy' });
    }

    // Match driver on-chain
    const cabShareCore = getCabShareCore();
    const tx = await cabShareCore.matchDriver(rideId, driverAddress);
    await tx.wait();

    // Generate re-encryption key
    const originalCt = await loadFromStorage(`ct_${rideId}.json`);
    
    // Create target policy for driver (simplified - same policy)
    const targetPolicy = policy;
    
    const rekeyResult = await cryptoService.rekey(originalCt, targetPolicy);
    
    // Re-encrypt CT to CT'
    const reencryptResult = await cryptoService.reencrypt(originalCt, rekeyResult.rekey);
    
    // Store CT' off-chain
    await saveToStorage(`ct_prime_${rideId}.json`, reencryptResult.ct_prime);
    
    // Submit CT' hash on-chain
    const tx2 = await cabShareCore.submitReencryption(
      rideId,
      `0x${reencryptResult.ct_prime_hash}`
    );
    await tx2.wait();

    res.json({
      success: true,
      rideId,
      driver: driverAddress,
      ctPrimeHash: reencryptResult.ct_prime_hash,
      matchTxHash: tx.hash,
      reencryptTxHash: tx2.hash
    });

  } catch (error: any) {
    console.error('Error matching driver:', error);
    res.status(500).json({ error: error.message });
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
