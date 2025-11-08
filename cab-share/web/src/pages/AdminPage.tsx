import { useState } from 'react';
import { Shield, CheckCircle, Users } from 'lucide-react';
import { matchDriver, getRide } from '../lib/api';

export default function AdminPage() {
  const [rideId, setRideId] = useState('');
  const [driverAddress, setDriverAddress] = useState('');
  const [driverAttributes, setDriverAttributes] = useState('verified_driver,5star_rating');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rideInfo, setRideInfo] = useState<any>(null);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const attrs = driverAttributes.split(',').map(s => s.trim());
      const response = await matchDriver(rideId, driverAddress, attrs);
      setResult(response);
    } catch (error: any) {
      console.error('Error matching driver:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleGetRide = async () => {
    if (!rideId) return;
    
    try {
      const response = await getRide(rideId);
      setRideInfo(response.ride);
    } catch (error: any) {
      console.error('Error fetching ride:', error);
      setRideInfo({ error: error.message });
    }
  };

  const getStatusLabel = (status: number) => {
    const labels = ['Requested', 'Proposed', 'Matched', 'Reencrypted', 'InProgress', 'Completed', 'Disputed', 'Cancelled'];
    return labels[status] || 'Unknown';
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
            disabled={loading}
            className="w-full px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            {loading ? 'Matching...' : 'Match Driver'}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            {result.error ? (
              <div className="text-red-600">Error: {result.error}</div>
            ) : (
              <div className="text-green-600">✓ Driver Matched Successfully!</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
