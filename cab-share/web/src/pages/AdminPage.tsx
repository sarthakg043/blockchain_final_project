import { useState } from 'react';
import { Shield, CheckCircle, Users, Wallet } from 'lucide-react';
import { matchDriver } from '../lib/api';
import { useWallet } from '../contexts/WalletContext';
import { Contract } from 'ethers';

export default function AdminPage() {
  const { address, provider, isConnected, connect } = useWallet();
  const [rideId, setRideId] = useState('');
  const [driverAddress, setDriverAddress] = useState('');
  const [driverAttributes, setDriverAttributes] = useState('verified_driver,5star_rating');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Contract address
  const CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
  
  // Contract ABI - just the matchDriver function
  const CONTRACT_ABI = [
    "function matchDriver(bytes32 rideId, address driver) external"
  ];

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if wallet is connected
    if (!isConnected || !provider) {
      alert('Please connect your admin wallet first!');
      await connect();
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const attrs = driverAttributes.split(',').map(s => s.trim());
      
      // Step 1: Call API to check policy match and handle re-encryption
      console.log('Step 1: Checking policy match...');
      const apiResponse = await matchDriver(rideId, driverAddress, attrs);
      
      if (!apiResponse.success) {
        throw new Error(apiResponse.error || 'Policy check failed');
      }

      // Step 2: Call smart contract via MetaMask to match driver on-chain
      console.log('Step 2: Matching driver on blockchain...');
      const signer = await provider.getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const tx = await contract.matchDriver(rideId, driverAddress);
      console.log('Transaction sent:', tx.hash);
      
      setResult({ 
        pending: true, 
        txHash: tx.hash,
        message: 'Matching driver on blockchain...' 
      });

      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      setResult({
        success: true,
        rideId,
        driver: driverAddress,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        ctPrimeHash: apiResponse.ctPrimeHash
      });

    } catch (error: any) {
      console.error('Error matching driver:', error);
      let errorMessage = error.message;
      
      // Handle common errors
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message.includes('user rejected')) {
        errorMessage = 'Transaction rejected: You denied the transaction in MetaMask';
      } else if (error.message.includes('Only admin')) {
        errorMessage = 'Only admin can match drivers. Please use the admin wallet (Account #0)';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance';
      } else if (error.message.length > 200) {
        // If error message is too long, show a generic message
        errorMessage = 'Transaction failed. Please check console for details.';
      }
      
      setResult({ error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
          <Shield className="h-8 w-8 mr-2 text-purple-600" />
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-4 bg-purple-50 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
              <Users className="h-5 w-5 mr-2" />
              DPoS Delegates
            </h3>
            <p className="text-sm text-purple-700">
              Top 101 delegates selected by reputation-weighted voting
            </p>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              Matching Algorithm
            </h3>
            <p className="text-sm text-green-700">
              CP-ABE policy verification with proxy re-encryption
            </p>
          </div>
        </div>

        <form onSubmit={handleMatch} className="space-y-6">
          {!isConnected ? (
            <div className="p-6 bg-purple-50 border border-purple-200 rounded-md text-center">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Admin Wallet</h3>
              <p className="text-sm text-gray-600 mb-4">
                Connect your admin wallet to match drivers
              </p>
              <button
                type="button"
                onClick={connect}
                className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Connect MetaMask
              </button>
              <p className="mt-3 text-xs text-gray-500">
                Use Hardhat Account #0 (Admin): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>✓ Admin Connected:</strong> {address?.substring(0, 10)}...{address?.substring(address.length - 8)}
                </p>
              </div>

              <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ride ID
            </label>
            <input
              type="text"
              value={rideId}
              onChange={(e) => setRideId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Driver Address
            </label>
            <input
              type="text"
              value={driverAddress}
              onChange={(e) => setDriverAddress(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Driver Attributes (comma-separated)
            </label>
            <input
              type="text"
              value={driverAttributes}
              onChange={(e) => setDriverAttributes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isConnected}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Matching...' : 'Match Driver'}
          </button>
            </>
          )}
        </form>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            {result.error ? (
              <div className="text-red-600">
                <strong>Error:</strong> {result.error}
              </div>
            ) : result.pending ? (
              <div className="space-y-2">
                <div className="text-blue-600 font-semibold">⏳ Transaction Pending...</div>
                <div className="text-sm text-gray-600">
                  <strong>Tx Hash:</strong> {result.txHash?.substring(0, 20)}...
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Waiting for blockchain confirmation...
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-green-600 font-semibold">✓ Driver Matched Successfully!</div>
                <div className="text-sm text-gray-600">
                  <strong>Ride ID:</strong> {result.rideId}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Driver:</strong> {result.driver}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Tx Hash:</strong> {result.txHash?.substring(0, 20)}...
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Block:</strong> {result.blockNumber}
                </div>
                {result.ctPrimeHash && (
                  <div className="text-sm text-gray-600">
                    <strong>CT' Hash:</strong> {result.ctPrimeHash.substring(0, 20)}...
                  </div>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Ride has been re-encrypted for the driver.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
