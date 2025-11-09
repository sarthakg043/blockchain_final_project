import { useState, useEffect } from 'react';
import { Car, Star, MapPin, Send, X, Plus, Wallet } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { Contract, ethers } from 'ethers';
import { useLocation } from 'react-router-dom';

export default function DriverPage() {
  const { address, provider, isConnected, connect } = useWallet();
  const location = useLocation();
  const [rideId, setRideId] = useState('');
  const [attributes, setAttributes] = useState(['verified_driver', '5star_rating', 'premium_vehicle']);
  const [newAttribute, setNewAttribute] = useState('');
  const [tripData, setTripData] = useState({
    destination: '',
    pricePerSeat: '0.01',
    availableSeats: 3,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Pre-fill ride ID if coming from ride pool
  useEffect(() => {
    if (location.state?.rideId) {
      setRideId(location.state.rideId);
    }
  }, [location.state]);

  // Contract address - update this with your deployed contract
  const CONTRACT_ADDRESS = '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9';
  
  // Contract ABI - just the proposeRide function
  const CONTRACT_ABI = [
    "function proposeRide(bytes32 rideId, tuple(uint256 departureTime, string destination, uint256 arrivalTime, string route, uint8 availableSeats, uint256 pricePerSeat, bytes32[] attributes) trip) payable"
  ];

  const addAttribute = () => {
    if (newAttribute.trim() && !attributes.includes(newAttribute.trim())) {
      setAttributes([...attributes, newAttribute.trim()]);
      setNewAttribute('');
    }
  };

  const removeAttribute = (attr: string) => {
    setAttributes(attributes.filter(a => a !== attr));
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if wallet is connected
    if (!isConnected || !provider) {
      alert('Please connect your wallet first!');
      await connect();
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Get signer from provider
      const signer = await provider.getSigner();
      
      // Create contract instance
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      // Hash attributes
      const hashedAttributes = attributes.map((attr: string) =>
        ethers.keccak256(ethers.toUtf8Bytes(attr))
      );

      // Prepare trip data
      const trip = {
        departureTime: Math.floor(Date.now() / 1000),
        destination: tripData.destination,
        arrivalTime: Math.floor(Date.now() / 1000) + 3600,
        route: 'Optimal route',
        availableSeats: tripData.availableSeats,
        pricePerSeat: ethers.parseEther(tripData.pricePerSeat),
        attributes: hashedAttributes
      };

      const minDeposit = ethers.parseEther('0.02');

      console.log('Submitting proposal with:', { rideId, trip, deposit: minDeposit.toString() });

      // Call smart contract directly via MetaMask
      const tx = await contract.proposeRide(rideId, trip, { value: minDeposit });
      
      console.log('Transaction sent:', tx.hash);
      setResult({ 
        pending: true, 
        txHash: tx.hash,
        message: 'Transaction submitted! Waiting for confirmation...' 
      });

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      console.log('Transaction confirmed:', receipt);
      setResult({
        success: true,
        rideId,
        driver: address,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      });

    } catch (error: any) {
      console.error('Error proposing ride:', error);
      let errorMessage = error.message;
      
      // Handle common errors
      if (error.code === 4001 || error.code === 'ACTION_REJECTED' || error.message.includes('user rejected')) {
        errorMessage = 'Transaction rejected: You denied the transaction in MetaMask';
      } else if (error.message.includes('Rider cannot propose')) {
        errorMessage = 'This address is registered as a rider and cannot propose rides';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient ETH balance for deposit';
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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Propose Ride</h1>
        
        <div className="mb-6 p-4 bg-blue-50 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-3">Your Attributes</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            {attributes.map((attr, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-1"
              >
                {attr === 'verified_driver' && <Car className="h-4 w-4" />}
                {attr === '5star_rating' && <Star className="h-4 w-4" />}
                {attr}
                <button
                  type="button"
                  onClick={() => removeAttribute(attr)}
                  className="hover:bg-blue-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newAttribute}
              onChange={(e) => setNewAttribute(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAttribute())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Add attribute (e.g., premium_vehicle, eco_friendly)"
            />
            <button
              type="button"
              onClick={addAttribute}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        <form onSubmit={handlePropose} className="space-y-6">
          {!isConnected ? (
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-md text-center">
              <Wallet className="h-12 w-12 mx-auto mb-3 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-sm text-gray-600 mb-4">
                Connect MetaMask to propose rides securely
              </p>
              <button
                type="button"
                onClick={connect}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Connect MetaMask
              </button>
              <p className="mt-3 text-xs text-gray-500">
                Make sure MetaMask is connected to Hardhat Local (Chain ID: 31337)
              </p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  <strong>✓ Wallet Connected:</strong> {address?.substring(0, 10)}...{address?.substring(address.length - 8)}
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
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter ride ID to propose"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Destination
            </label>
            <input
              type="text"
              value={tripData.destination}
              onChange={(e) => setTripData({ ...tripData, destination: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Your destination"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price per Seat (ETH)
            </label>
            <input
              type="text"
              value={tripData.pricePerSeat}
              onChange={(e) => setTripData({ ...tripData, pricePerSeat: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Car className="inline h-4 w-4 mr-1" />
              Available Seats
            </label>
            <input
              type="number"
              value={tripData.availableSeats}
              onChange={(e) => setTripData({ ...tripData, availableSeats: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              min="1"
              max="8"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isConnected}
            className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Submitting Proposal...'
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Propose Ride
              </>
            )}
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
                <div className="text-green-600 font-semibold">✓ Proposal Submitted!</div>
                <div className="text-sm text-gray-600">
                  <strong>Ride ID:</strong> {result.rideId}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Driver:</strong> {result.driver?.substring(0, 20)}...
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Tx Hash:</strong> {result.txHash?.substring(0, 20)}...
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Block:</strong> {result.blockNumber}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Your deposit is locked. If matched, you'll receive the re-encrypted ride details.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
