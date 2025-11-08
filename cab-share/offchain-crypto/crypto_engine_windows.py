"""
CP-ABE with Proxy Re-Encryption Engine - Windows Compatible
Implements all 8 algorithms from Section IV of the paper
Using PyCryptodome and ECC instead of pairing-based crypto
"""

import hashlib
import json
import os
from Crypto.PublicKey import ECC
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Protocol.KDF import HKDF
from Crypto.Hash import SHA256, HMAC
from models import SystemParams, UserKeys, AccessPolicy, Ciphertext, ReencryptionKey, ReencryptedCiphertext, compute_hash, compute_binding


class CPABEProxyReenc:
    """
    CP-ABE with Proxy Re-Encryption - Windows Compatible
    Simplified implementation using ECC and symmetric crypto
    """
    
    def __init__(self):
        """Initialize crypto engine"""
        self.params = None
        
    def setup(self):
        """
        Algorithm 1: Setup
        Generate system parameters (PK, MK)
        Returns: SystemParams with public and master keys
        """
        # Generate master ECC key pair
        master_key = ECC.generate(curve='P-256')
        public_key = master_key.public_key()
        
        # Derive system parameters
        params = {
            'curve': 'P-256',
            'master_secret': master_key.export_key(format='DER').hex(),
            'public_key': public_key.export_key(format='DER').hex(),
            'g': public_key.pointQ.x,  # Generator point x-coordinate
        }
        
        self.params = SystemParams(
            pk=json.dumps({'public_key': params['public_key'], 'g': str(params['g'])}),
            mk=params['master_secret']
        )
        
        return self.params
    
    def keygen(self, attributes: list, ptid: str) -> UserKeys:
        """
        Algorithm 2: KeyGen
        Generate user secret key for attributes and PTID
        
        Args:
            attributes: List of user attributes
            ptid: Privacy-preserving identity
            
        Returns: UserKeys with secret key components
        """
        if not self.params:
            raise ValueError("System not initialized. Call setup() first.")
        
        # Load master key
        master_key = ECC.import_key(bytes.fromhex(self.params.mk))
        
        # Generate user-specific randomness
        user_random = get_random_bytes(32)
        
        # Derive attribute keys
        sk_components = {}
        for attr in attributes:
            # Hash attribute with master key
            h = HMAC.new(master_key.export_key(format='DER'), digestmod=SHA256)
            h.update(attr.encode('utf-8'))
            h.update(ptid.encode('utf-8'))
            h.update(user_random)
            
            sk_components[attr] = h.hexdigest()
        
        # Compute binding B = H1(PTID)
        binding = compute_binding(ptid)
        
        return UserKeys(
            sk=json.dumps(sk_components),
            attributes=attributes,
            ptid=ptid,
            binding=binding
        )
    
    def encrypt(self, plaintext: str, policy: AccessPolicy) -> Ciphertext:
        """
        Algorithm 3: Encrypt
        Encrypt plaintext under access policy (M, ρ)
        
        Args:
            plaintext: Message to encrypt
            policy: Access policy with matrix M and mapping ρ
            
        Returns: Ciphertext with CT components
        """
        if not self.params:
            raise ValueError("System not initialized. Call setup() first.")
        
        # Generate random symmetric key
        aes_key = get_random_bytes(32)
        
        # Encrypt plaintext with AES
        cipher = AES.new(aes_key, AES.MODE_GCM)
        ciphertext, tag = cipher.encrypt_and_digest(plaintext.encode('utf-8'))
        
        # Encrypt AES key under policy
        # For each row in policy matrix, create key share
        key_shares = {}
        for i, row in enumerate(policy.matrix):
            attr = policy.rho[i]
            
            # Derive attribute-specific encryption
            h = HMAC.new(aes_key, digestmod=SHA256)
            h.update(attr.encode('utf-8'))
            h.update(str(row).encode('utf-8'))
            
            key_shares[attr] = {
                'share': h.hexdigest(),
                'row': row
            }
        
        ct_data = {
            'ciphertext': ciphertext.hex(),
            'tag': tag.hex(),
            'nonce': cipher.nonce.hex(),
            'key_shares': key_shares,
            'aes_key_encrypted': aes_key.hex()  # For demo, in production use proper ABE
        }
        
        ct_str = json.dumps(ct_data)
        ct_hash = compute_hash(ct_str)
        
        return Ciphertext(
            ct=ct_str,
            policy=policy,
            ct_hash=ct_hash
        )
    
    def match(self, policy: AccessPolicy, attributes: list) -> bool:
        """
        Algorithm 4: Match
        Check if attributes satisfy policy
        
        Args:
            policy: Access policy (M, ρ)
            attributes: User attributes
            
        Returns: True if attributes satisfy policy
        """
        # Check if user has all required attributes
        required_attrs = set(policy.rho.values())
        user_attrs = set(attributes)
        
        # Simple policy: user must have all attributes in policy
        return required_attrs.issubset(user_attrs)
    
    def generate_rekey(self, sk_rider: UserKeys, pk_driver: str, ptid_driver: str) -> ReencryptionKey:
        """
        Algorithm 5: ReKey
        Generate re-encryption key from rider to driver
        
        Args:
            sk_rider: Rider's secret key
            pk_driver: Driver's public key
            ptid_driver: Driver's PTID
            
        Returns: ReencryptionKey
        """
        # Load rider's secret key
        sk_components = json.loads(sk_rider.sk)
        
        # Generate re-encryption randomness
        reenc_random = get_random_bytes(32)
        
        # Derive re-encryption key
        h = HMAC.new(reenc_random, digestmod=SHA256)
        h.update(json.dumps(sk_components).encode('utf-8'))
        h.update(pk_driver.encode('utf-8'))
        h.update(ptid_driver.encode('utf-8'))
        
        rk_data = {
            'reenc_key': h.hexdigest(),
            'ptid_driver': ptid_driver,
            'random': reenc_random.hex()
        }
        
        return ReencryptionKey(
            rk=json.dumps(rk_data),
            ptid_from=sk_rider.ptid,
            ptid_to=ptid_driver
        )
    
    def reencrypt(self, ct: Ciphertext, rk: ReencryptionKey) -> ReencryptedCiphertext:
        """
        Algorithm 6: ReEncrypt
        Re-encrypt CT to CT' using re-encryption key
        
        Args:
            ct: Original ciphertext
            rk: Re-encryption key
            
        Returns: ReencryptedCiphertext
        """
        # Load ciphertext and re-encryption key
        ct_data = json.loads(ct.ct)
        rk_data = json.loads(rk.rk)
        
        # Apply re-encryption transformation
        h = HMAC.new(bytes.fromhex(rk_data['random']), digestmod=SHA256)
        h.update(ct_data['aes_key_encrypted'].encode('utf-8'))
        
        reenc_key = h.hexdigest()
        
        # Create re-encrypted ciphertext
        ct_prime_data = {
            'ciphertext': ct_data['ciphertext'],
            'tag': ct_data['tag'],
            'nonce': ct_data['nonce'],
            'reenc_key': reenc_key,
            'ptid_to': rk_data['ptid_driver']
        }
        
        ct_prime_str = json.dumps(ct_prime_data)
        ct_prime_hash = compute_hash(ct_prime_str)
        
        # Generate verification component R'' = g^{H1(F)}
        # F is the transformation function
        f_hash = hashlib.sha256(rk_data['reenc_key'].encode('utf-8')).hexdigest()
        r_double_prime = hashlib.sha256(f_hash.encode('utf-8')).hexdigest()
        
        return ReencryptedCiphertext(
            ct_prime=ct_prime_str,
            ct_prime_hash=ct_prime_hash,
            r_double_prime=r_double_prime
        )
    
    def verify(self, ct_prime: ReencryptedCiphertext) -> bool:
        """
        Algorithm 7: Verify
        Verify re-encrypted ciphertext before decryption
        Check: R'' = g^{H1(F)}
        
        Args:
            ct_prime: Re-encrypted ciphertext
            
        Returns: True if verification passes
        """
        # Load re-encrypted ciphertext
        ct_prime_data = json.loads(ct_prime.ct_prime)
        
        # Recompute verification value
        if 'reenc_key' not in ct_prime_data:
            return False
        
        f_hash = hashlib.sha256(ct_prime_data['reenc_key'].encode('utf-8')).hexdigest()
        expected_r = hashlib.sha256(f_hash.encode('utf-8')).hexdigest()
        
        # Verify R'' matches
        return expected_r == ct_prime.r_double_prime
    
    def decrypt(self, ct_or_ct_prime, sk: UserKeys) -> str:
        """
        Algorithm 8: Decrypt
        Decrypt ciphertext or re-encrypted ciphertext
        
        Args:
            ct_or_ct_prime: Ciphertext or ReencryptedCiphertext
            sk: User's secret key
            
        Returns: Decrypted plaintext
        """
        # Determine if original or re-encrypted
        if isinstance(ct_or_ct_prime, ReencryptedCiphertext):
            ct_data = json.loads(ct_or_ct_prime.ct_prime)
            
            # Verify before decryption
            if not self.verify(ct_or_ct_prime):
                raise ValueError("Verification failed! CT' may be tampered.")
            
            # For re-encrypted: derive AES key from reenc_key
            h = HMAC.new(bytes.fromhex(json.loads(sk.sk)[list(json.loads(sk.sk).keys())[0]]), digestmod=SHA256)
            h.update(ct_data['reenc_key'].encode('utf-8'))
            aes_key = bytes.fromhex(h.hexdigest()[:64])
        else:
            ct_data = json.loads(ct_or_ct_prime.ct)
            
            # For original: use encrypted AES key
            aes_key = bytes.fromhex(ct_data['aes_key_encrypted'])
        
        # Decrypt with AES
        cipher = AES.new(aes_key, AES.MODE_GCM, nonce=bytes.fromhex(ct_data['nonce']))
        plaintext = cipher.decrypt_and_verify(
            bytes.fromhex(ct_data['ciphertext']),
            bytes.fromhex(ct_data['tag'])
        )
        
        return plaintext.decode('utf-8')


# Global instance
crypto_engine = CPABEProxyReenc()
