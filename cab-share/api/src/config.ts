import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory (parent of api folder)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.API_PORT || '3001'),
  host: process.env.API_HOST || 'localhost',
  
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'http://127.0.0.1:8545',
    privateKey: process.env.PRIVATE_KEY || '',
    chainId: parseInt(process.env.CHAIN_ID || '31337'),
  },
  
  contracts: {
    cabShareCore: process.env.CABSHARE_CORE_ADDRESS || '',
    reputation: process.env.REPUTATION_ADDRESS || '',
    dposHub: process.env.DPOS_DELEGATE_HUB_ADDRESS || '',
    deposits: process.env.DEPOSITS_ADDRESS || '',
  },
  
  cryptoService: {
    url: process.env.CRYPTO_SERVICE_URL || 'http://localhost:5123',
  },
  
  storage: {
    path: process.env.STORAGE_PATH || './data',
  },
};

export default config;
