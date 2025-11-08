// Test if .env is being read correctly
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root directory
const envPath = path.resolve(__dirname, '../.env');
console.log('Loading .env from:', envPath);

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('✅ .env loaded successfully');
}

console.log('\nEnvironment variables:');
console.log('PRIVATE_KEY length:', process.env.PRIVATE_KEY?.length);
console.log('PRIVATE_KEY value:', process.env.PRIVATE_KEY);
console.log('PRIVATE_KEY starts with 0x:', process.env.PRIVATE_KEY?.startsWith('0x'));
console.log('ETHEREUM_RPC_URL:', process.env.ETHEREUM_RPC_URL);
console.log('CABSHARE_CORE_ADDRESS:', process.env.CABSHARE_CORE_ADDRESS);
