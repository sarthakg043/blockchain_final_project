import { useState, useEffect } from 'react';
import { MapPin, Clock, Users, RefreshCw, Car } from 'lucide-react';
import { getRidePool } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface Ride {
  rideId: string;
  riderAddress: string;
  destination?: string;
  pickup?: string;
  departureTime?: number;
  latestArrival?: number;
  minAttributes?: number;
  status: number;
  createdAt: number;
  proposalCount?: number;
  price?: string;
  time?: string;
}

export default function RidePoolPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchRides = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRidePool();
      setRides(response.rides || []);
    } catch (err: any) {
      console.error('Error fetching ride pool:', err);
      setError(err.message || 'Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const getStatusLabel = (status: number) => {
    const labels = ['Requested', 'Proposed', 'Matched', 'Reencrypted', 'InProgress', 'Completed', 'Disputed', 'Cancelled'];
    return labels[status] || 'Unknown';
  };

  const getStatusColor = (status: number) => {
    const colors = [
      'bg-yellow-100 text-yellow-800',  // Requested
      'bg-blue-100 text-blue-800',      // Proposed
      'bg-green-100 text-green-800',    // Matched
      'bg-purple-100 text-purple-800',  // Reencrypted
      'bg-indigo-100 text-indigo-800',  // InProgress
      'bg-gray-100 text-gray-800',      // Completed
      'bg-red-100 text-red-800',        // Disputed
      'bg-gray-100 text-gray-800',      // Cancelled
    ];
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeString = (timeString?: string) => {
    if (!timeString) return null;
    try {
      // Try parsing the time string as a date
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return timeString; // Return original if invalid
      
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return timeString;
    }
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const handleProposeRide = (rideId: string) => {
    navigate('/driver', { state: { rideId } });
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Car className="h-8 w-8 mr-2 text-blue-600" />
              Available Rides
            </h1>
            <p className="text-gray-600 mt-1">Browse and propose to fulfill ride requests</p>
          </div>
          <button
            onClick={fetchRides}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {loading && rides.length === 0 ? (
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading rides...</p>
          </div>
        ) : rides.length === 0 ? (
          <div className="text-center py-12">
            <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No rides available at the moment</p>
            <p className="text-gray-400 text-sm mt-2">Check back later or create a ride request</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ride ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pickup → Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time & Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proposals
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rides.map((ride) => (
                  <tr key={ride.rideId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="text-sm font-mono text-gray-900">
                          {formatAddress(ride.rideId)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-500">
                        {formatAddress(ride.riderAddress)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <MapPin className="h-3 w-3 mr-1 text-green-500" />
                          <span className="font-medium">{ride.pickup || 'Not specified'}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 text-red-500" />
                          <span className="font-medium">{ride.destination || 'Not specified'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Clock className="h-3 w-3 mr-1 text-gray-400" />
                          {formatTimeString(ride.time) || formatTimestamp(ride.departureTime || ride.createdAt)}
                        </div>
                        {ride.price && (
                          <div className="text-xs text-green-600 font-semibold">
                            {ride.price} ETH
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ride.status)}`}>
                        {getStatusLabel(ride.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1 text-gray-400" />
                        {ride.proposalCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {ride.status === 0 && (
                        <button
                          onClick={() => handleProposeRide(ride.rideId)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Propose →
                        </button>
                      )}
                      {ride.status === 1 && (
                        <span className="text-gray-400">Pending</span>
                      )}
                      {ride.status >= 2 && (
                        <span className="text-green-600">✓ Matched</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="font-semibold text-blue-900 mb-2">How to Propose</h3>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Find a ride with "Requested" status</li>
            <li>2. Click "Propose →" to go to driver page</li>
            <li>3. Connect your MetaMask wallet</li>
            <li>4. Fill in your trip details and attributes</li>
            <li>5. Submit your proposal with required deposit</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
