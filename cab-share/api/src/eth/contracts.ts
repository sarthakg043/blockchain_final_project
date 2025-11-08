import { ethers } from 'ethers';
import config from '../config.js';
import fs from 'fs';
import path from 'path';

// Load contract ABIs
const loadABI = (contractName: string) => {
  const abiPath = path.join(process.cwd(), '..', 'contracts', 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
  if (fs.existsSync(abiPath)) {
    const artifact = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    return artifact.abi;
  }
  throw new Error(`ABI not found for ${contractName}`);
};

// Setup provider and signer
export const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);

// Debug: Log private key info
console.log('Private Key Length:', config.ethereum.privateKey?.length);
console.log('Private Key Starts with 0x:', config.ethereum.privateKey?.startsWith('0x'));
console.log('Private Key Value:', config.ethereum.privateKey);

if (!config.ethereum.privateKey || config.ethereum.privateKey.length !== 66) {
  throw new Error(`Invalid private key configuration. Length: ${config.ethereum.privateKey?.length}, Expected: 66`);
}

export const wallet = new ethers.Wallet(config.ethereum.privateKey, provider);

// Contract instances
export const getCabShareCore = () => {
  const abi = loadABI('CabShareCore');
  return new ethers.Contract(config.contracts.cabShareCore, abi, wallet);
};

export const getReputation = () => {
  const abi = loadABI('Reputation');
  return new ethers.Contract(config.contracts.reputation, abi, wallet);
};

export const getDPoSHub = () => {
  const abi = loadABI('DPoSDelegateHub');
  return new ethers.Contract(config.contracts.dposHub, abi, wallet);
};

export const getDeposits = () => {
  const abi = loadABI('Deposits');
  return new ethers.Contract(config.contracts.deposits, abi, wallet);
};

// Event listeners
export const setupEventListeners = () => {
  const cabShareCore = getCabShareCore();
  
  cabShareCore.on('RideRequested', (rideId, rider, ctHash, policyRef, event) => {
    console.log('🚗 Ride Requested:', {
      rideId,
      rider,
      ctHash,
      policyRef,
      blockNumber: event.log.blockNumber
    });
  });
  
  cabShareCore.on('DriverProposed', (rideId, driver, deposit, event) => {
    console.log('👤 Driver Proposed:', {
      rideId,
      driver,
      deposit: ethers.formatEther(deposit),
      blockNumber: event.log.blockNumber
    });
  });
  
  cabShareCore.on('DriverMatched', (rideId, driver, matcher, event) => {
    console.log('✅ Driver Matched:', {
      rideId,
      driver,
      matcher,
      blockNumber: event.log.blockNumber
    });
  });
  
  cabShareCore.on('RideCompleted', (rideId, rider, driver, event) => {
    console.log('🎉 Ride Completed:', {
      rideId,
      rider,
      driver,
      blockNumber: event.log.blockNumber
    });
  });
  
  console.log('✓ Event listeners setup complete');
};

export default {
  provider,
  wallet,
  getCabShareCore,
  getReputation,
  getDPoSHub,
  getDeposits,
  setupEventListeners
};
