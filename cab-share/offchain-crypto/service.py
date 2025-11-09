"""
Flask service for CP-ABE with Proxy Re-Encryption
Main entry point for the crypto service
"""

from flask import Flask
from flask_cors import CORS
from routes import crypto_bp
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create Flask app
app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(crypto_bp, url_prefix='/api/crypto')

# Configuration
app.config['JSON_SORT_KEYS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max request size

@app.route('/')
def index():
    return {
        'service': 'CP-ABE Proxy Re-Encryption Service',
        'version': '1.0.0',
        'endpoints': {
            'setup': 'POST /api/crypto/setup',
            'keygen': 'POST /api/crypto/keygen',
            'encrypt': 'POST /api/crypto/encrypt',
            'match': 'POST /api/crypto/match',
            'rekey': 'POST /api/crypto/rekey',
            'reencrypt': 'POST /api/crypto/reencrypt',
            'verify': 'POST /api/crypto/verify',
            'decrypt': 'POST /api/crypto/decrypt',
            'health': 'GET /api/crypto/health'
        }
    }

@app.route('/health')
def health():
    return {'status': 'healthy'}, 200

if __name__ == '__main__':
    port = int(os.getenv('CRYPTO_SERVICE_PORT', 5123))
    debug = os.getenv('FLASK_ENV') == 'development'
    
    print(f"""
    ╔══════════════════════════════════════════════════════════╗
    ║  CP-ABE Proxy Re-Encryption Service                      ║
    ║  Port: {port}                                              ║
    ║  Paper: Decentralized Cab-Sharing with Blockchain        ║
    ╚══════════════════════════════════════════════════════════╝
    """)
    
    app.run(host='0.0.0.0', port=port, debug=debug)
