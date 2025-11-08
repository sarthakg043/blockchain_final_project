import axios from 'axios';
import config from '../config.js';

const cryptoAPI = axios.create({
  baseURL: `${config.cryptoService.url}/api/crypto`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AccessPolicy {
  matrix: number[][];
  rho: { [key: number]: string };
}

export interface EncryptResult {
  ciphertext: any;
  ct_hash: string;
  binding: string;
}

export interface RekeyResult {
  rekey: any;
}

export interface ReencryptResult {
  ct_prime: any;
  ct_prime_hash: string;
}

export class CryptoService {
  async setup() {
    const response = await cryptoAPI.post('/setup');
    return response.data;
  }

  async keygen(attributes: string[], userId: string) {
    const response = await cryptoAPI.post('/keygen', {
      attributes,
      user_id: userId,
    });
    return response.data;
  }

  async encrypt(plaintext: string, policy: AccessPolicy): Promise<EncryptResult> {
    const response = await cryptoAPI.post('/encrypt', {
      plaintext,
      policy,
    });
    return response.data;
  }

  async match(driverAttributes: string[], policy: AccessPolicy): Promise<boolean> {
    const response = await cryptoAPI.post('/match', {
      driver_attributes: driverAttributes,
      policy,
    });
    return response.data.matches;
  }

  async rekey(originalCt: any, targetPolicy: AccessPolicy, adminPtid?: string): Promise<RekeyResult> {
    const response = await cryptoAPI.post('/rekey', {
      original_ct: originalCt,
      target_policy: targetPolicy,
      admin_ptid: adminPtid,
    });
    return response.data;
  }

  async reencrypt(ciphertext: any, rekey: any): Promise<ReencryptResult> {
    const response = await cryptoAPI.post('/reencrypt', {
      ciphertext,
      rekey,
    });
    return response.data;
  }

  async verify(ctPrime: any, userPtid: string): Promise<boolean> {
    const response = await cryptoAPI.post('/verify', {
      ct_prime: ctPrime,
      user_ptid: userPtid,
    });
    return response.data.valid;
  }

  async decrypt(ctPrime: any, userPtid: string): Promise<string> {
    const response = await cryptoAPI.post('/decrypt', {
      ct_prime: ctPrime,
      user_ptid: userPtid,
    });
    return response.data.plaintext;
  }

  async health() {
    const response = await cryptoAPI.get('/health');
    return response.data;
  }
}

export const cryptoService = new CryptoService();
export default cryptoService;
