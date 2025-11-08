"""
REST API routes for CP-ABE crypto service
Exposes all algorithms from the paper
"""

from flask import Blueprint, request, jsonify
from crypto_engine_windows import CPABEProxyReenc
from models import AccessPolicy, Ciphertext, ReencryptedCiphertext, UserKeys, SystemParams
import json

crypto_bp = Blueprint('crypto', __name__)

# Global crypto engine instance
crypto_engine = CPABEProxyReenc()

# Store system params in memory (in production, use secure storage)
system_params = None
user_keys_store = {}  # ptid -> UserKeys


@crypto_bp.route('/setup', methods=['POST'])
def setup():
    """
    POST /setup
    Initialize system parameters (PK_S, MK_S)
    """
    global system_params
    
    try:
        system_params = crypto_engine.setup()
        
        # Return simplified params for Windows implementation
        return jsonify({
            'success': True,
            'params': {
                'pk': system_params.pk,
                'initialized': True
            },
            'message': 'System parameters generated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/keygen', methods=['POST'])
def keygen():
    """
    POST /keygen
    Generate user keys (SK_U, PK_U) for given attributes
    Body: { attributes: string[], user_id: string }
    """
    global system_params, user_keys_store
    
    if not system_params:
        return jsonify({
            'success': False,
            'error': 'System not initialized. Call /setup first'
        }), 400
    
    try:
        data = request.get_json()
        attributes = data.get('attributes', [])
        user_id = data.get('user_id')
        
        if not attributes or not user_id:
            return jsonify({
                'success': False,
                'error': 'Missing attributes or user_id'
            }), 400
        
        # Generate keys (Windows implementation doesn't need system_params)
        user_keys = crypto_engine.keygen(attributes, user_id)
        
        # Store keys
        user_keys_store[user_keys.ptid] = user_keys
        
        return jsonify({
            'success': True,
            'keys': {
                'ptid': user_keys.ptid,
                'attributes': user_keys.attributes,
                'binding': user_keys.binding
            },
            'ptid': user_keys.ptid
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/encrypt', methods=['POST'])
def encrypt():
    """
    POST /encrypt
    Encrypt plaintext with access policy (M, ρ)
    Body: { 
        plaintext: string,
        policy: { matrix: number[][], rho: {[key: number]: string} }
    }
    """
    global system_params
    
    if not system_params:
        return jsonify({
            'success': False,
            'error': 'System not initialized'
        }), 400
    
    try:
        data = request.get_json()
        plaintext = data.get('plaintext')
        policy_data = data.get('policy')
        
        if not plaintext or not policy_data:
            return jsonify({
                'success': False,
                'error': 'Missing plaintext or policy'
            }), 400
        
        # Parse policy
        policy = AccessPolicy.from_dict(policy_data)
        
        # Encrypt (Windows implementation doesn't need system_params)
        ciphertext = crypto_engine.encrypt(plaintext, policy)
        
        return jsonify({
            'success': True,
            'ciphertext': ciphertext.to_dict(),
            'ct_hash': ciphertext.ct_hash
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/match', methods=['POST'])
def match():
    """
    POST /match
    Check if driver attributes satisfy rider's policy
    Body: {
        driver_attributes: string[],
        policy: { matrix: number[][], rho: {[key: number]: string} }
    }
    """
    try:
        data = request.get_json()
        driver_attrs = data.get('driver_attributes', [])
        policy_data = data.get('policy')
        
        if not driver_attrs or not policy_data:
            return jsonify({
                'success': False,
                'error': 'Missing driver_attributes or policy'
            }), 400
        
        # Parse policy
        policy = AccessPolicy.from_dict(policy_data)
        
        # Check match (method is called 'match' not 'check_match')
        matches = crypto_engine.match(policy, driver_attrs)
        
        return jsonify({
            'success': True,
            'matches': matches
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/rekey', methods=['POST'])
def rekey():
    """
    POST /rekey
    Generate re-encryption key RK
    Body: {
        original_ct: Ciphertext,
        target_policy: AccessPolicy,
        admin_ptid: string
    }
    """
    global system_params, user_keys_store
    
    if not system_params:
        return jsonify({
            'success': False,
            'error': 'System not initialized'
        }), 400
    
    try:
        data = request.get_json()
        ct_data = data.get('original_ct')
        target_policy_data = data.get('target_policy')
        admin_ptid = data.get('admin_ptid')
        
        if not ct_data or not target_policy_data:
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400
        
        # Parse inputs
        original_ct = Ciphertext.from_dict(ct_data)
        target_policy = AccessPolicy.from_dict(target_policy_data)
        
        # Generate temporary driver keys for re-encryption
        # In a real system, these would be the actual driver's keys
        driver_ptid = 'temp_driver_' + str(hash(str(target_policy.to_dict())))
        driver_keys = crypto_engine.keygen(list(target_policy.rho.values()), driver_ptid)
        
        # Generate temporary rider keys
        rider_ptid = 'temp_rider_' + str(hash(str(original_ct.ct_hash)))
        rider_keys = crypto_engine.keygen(list(original_ct.policy.rho.values()), rider_ptid)
        
        # Generate re-encryption key from rider to driver
        rk = crypto_engine.generate_rekey(rider_keys, driver_keys.sk, driver_ptid)
        
        return jsonify({
            'success': True,
            'rekey': rk.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/reencrypt', methods=['POST'])
def reencrypt():
    """
    POST /reencrypt
    Re-encrypt CT to CT' using RK
    Body: {
        ciphertext: Ciphertext,
        rekey: ReencryptionKey
    }
    """
    global system_params
    
    if not system_params:
        return jsonify({
            'success': False,
            'error': 'System not initialized'
        }), 400
    
    try:
        data = request.get_json()
        ct_data = data.get('ciphertext')
        rk_data = data.get('rekey')
        
        if not ct_data or not rk_data:
            return jsonify({
                'success': False,
                'error': 'Missing ciphertext or rekey'
            }), 400
        
        # Parse inputs
        ct = Ciphertext.from_dict(ct_data)
        
        from models import ReencryptionKey
        rk = ReencryptionKey(
            rk=rk_data['rk'],
            ptid_from=rk_data.get('ptid_from', ''),
            ptid_to=rk_data.get('ptid_to', '')
        )
        
        # Re-encrypt (Windows implementation doesn't need system_params)
        ct_prime = crypto_engine.reencrypt(ct, rk)
        
        return jsonify({
            'success': True,
            'ct_prime': ct_prime.to_dict(),
            'ct_prime_hash': ct_prime.ct_prime_hash
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/verify', methods=['POST'])
def verify():
    """
    POST /verify
    Verify CT' before decryption: R'' = g^{H1(F)}
    Body: {
        ct_prime: ReencryptedCiphertext,
        user_ptid: string
    }
    """
    global system_params, user_keys_store
    
    if not system_params:
        return jsonify({
            'success': False,
            'error': 'System not initialized'
        }), 400
    
    try:
        data = request.get_json()
        ct_prime_data = data.get('ct_prime')
        user_ptid = data.get('user_ptid')
        
        if not ct_prime_data or not user_ptid:
            return jsonify({
                'success': False,
                'error': 'Missing ct_prime or user_ptid'
            }), 400
        
        # Get user keys
        user_sk = user_keys_store.get(user_ptid)
        if not user_sk:
            return jsonify({
                'success': False,
                'error': 'User keys not found'
            }), 404
        
        # Parse CT'
        ct_prime = ReencryptedCiphertext(
            ct_prime=ct_prime_data['ct_prime'],
            ct_prime_hash=ct_prime_data['ct_prime_hash'],
            r_double_prime=ct_prime_data['r_double_prime']
        )
        
        # Verify (Windows implementation doesn't need system_params or user_sk)
        is_valid = crypto_engine.verify(ct_prime)
        
        return jsonify({
            'success': True,
            'valid': is_valid
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/decrypt', methods=['POST'])
def decrypt():
    """
    POST /decrypt
    Decrypt CT' to recover plaintext
    Body: {
        ct_prime: ReencryptedCiphertext,
        user_ptid: string
    }
    """
    global system_params, user_keys_store
    
    if not system_params:
        return jsonify({
            'success': False,
            'error': 'System not initialized'
        }), 400
    
    try:
        data = request.get_json()
        ct_prime_data = data.get('ct_prime')
        user_ptid = data.get('user_ptid')
        
        if not ct_prime_data or not user_ptid:
            return jsonify({
                'success': False,
                'error': 'Missing ct_prime or user_ptid'
            }), 400
        
        # Get user keys
        user_sk = user_keys_store.get(user_ptid)
        if not user_sk:
            return jsonify({
                'success': False,
                'error': 'User keys not found'
            }), 404
        
        # Parse CT'
        ct_prime = ReencryptedCiphertext(
            ct_prime=ct_prime_data['ct_prime'],
            ct_prime_hash=ct_prime_data['ct_prime_hash'],
            r_double_prime=ct_prime_data['r_double_prime']
        )
        
        # Decrypt (Windows implementation doesn't need system_params)
        plaintext = crypto_engine.decrypt(ct_prime, user_sk)
        
        return jsonify({
            'success': True,
            'plaintext': plaintext
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@crypto_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'initialized': system_params is not None
    }), 200
