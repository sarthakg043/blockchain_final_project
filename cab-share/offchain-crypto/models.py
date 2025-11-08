"""
Data models for CP-ABE with Proxy Re-Encryption
Implements the paper's cryptographic construction
"""

from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional
import json
import hashlib


@dataclass
class SystemParams:
    """System public parameters (PK_S, MK_S)"""
    pk: str  # Can be string or dict
    mk: str  # Master key (kept secure)
    
    def to_dict(self):
        return {
            'pk': self.pk,
            'mk': self.mk
        }


@dataclass
class UserKeys:
    """User secret and public keys (SK_U, PK_U)"""
    sk: str  # JSON string of key components
    attributes: List[str]
    ptid: str  # Privacy-preserving identifier
    binding: str = ""  # B = H1(PTID)
    
    def to_dict(self):
        return {
            'sk': self.sk,
            'attributes': self.attributes,
            'ptid': self.ptid,
            'binding': self.binding
        }


@dataclass
class AccessPolicy:
    """Access structure (M, ρ) from paper"""
    matrix: List[List[int]]  # M: access matrix
    rho: Dict[int, str]      # ρ: mapping from rows to attributes
    
    def to_dict(self):
        return {
            'matrix': self.matrix,
            'rho': self.rho
        }
    
    @staticmethod
    def from_dict(data: Dict):
        return AccessPolicy(
            matrix=data['matrix'],
            rho={int(k): v for k, v in data['rho'].items()}
        )


@dataclass
class Ciphertext:
    """Encrypted ciphertext CT with access policy"""
    ct: str  # JSON string of ciphertext components
    policy: AccessPolicy
    ct_hash: str
    
    def to_dict(self):
        return {
            'ct': self.ct,
            'policy': self.policy.to_dict(),
            'ct_hash': self.ct_hash
        }
    
    @staticmethod
    def from_dict(data: Dict):
        return Ciphertext(
            ct=data['ct'],
            policy=AccessPolicy.from_dict(data['policy']),
            ct_hash=data['ct_hash']
        )


@dataclass
class ReencryptionKey:
    """Proxy re-encryption key RK"""
    rk: str  # JSON string of re-encryption key data
    ptid_from: str = ""  # Source PTID (rider)
    ptid_to: str = ""  # Target PTID (driver)
    
    def to_dict(self):
        return {
            'rk': self.rk,
            'ptid_from': self.ptid_from,
            'ptid_to': self.ptid_to
        }


@dataclass
class ReencryptedCiphertext:
    """Re-encrypted ciphertext CT'"""
    ct_prime: str  # JSON string of re-encrypted ciphertext
    ct_prime_hash: str
    r_double_prime: str  # R'' = g^{H1(F)} for verification
    
    def to_dict(self):
        return {
            'ct_prime': self.ct_prime,
            'ct_prime_hash': self.ct_prime_hash,
            'r_double_prime': self.r_double_prime
        }


def compute_hash(data: Any) -> str:
    """Compute SHA-256 hash of data"""
    if isinstance(data, dict):
        data_str = json.dumps(data, sort_keys=True)
    else:
        data_str = str(data)
    return hashlib.sha256(data_str.encode()).hexdigest()


def compute_binding(plaintext: str) -> str:
    """Compute B = H1(PT) for data binding"""
    return hashlib.sha256(plaintext.encode()).hexdigest()
