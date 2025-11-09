import { useState } from 'react';
import { MapPin, Clock, DollarSign, Send, X, Plus } from 'lucide-react';
import { createRide } from '../lib/api';

export default function RiderPage() {
  const [formData, setFormData] = useState({
    pickup: '',
    destination: '',
    datetime: '',
    price: '',
    riderAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  });
  const [attributes, setAttributes] = useState<string[]>(['verified_driver', '5star_rating']);
  const [newAttribute, setNewAttribute] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const addAttribute = () => {
    if (newAttribute.trim() && !attributes.includes(newAttribute.trim())) {
      setAttributes([...attributes, newAttribute.trim()]);
      setNewAttribute('');
    }
  };

  const removeAttribute = (attr: string) => {
    setAttributes(attributes.filter(a => a !== attr));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      // Convert datetime to timestamp
      const timestamp = formData.datetime ? Math.floor(new Date(formData.datetime).getTime() / 1000) : Math.floor(Date.now() / 1000);
      
      const plaintext = `Pickup: ${formData.pickup}, Destination: ${formData.destination}, Time: ${new Date(formData.datetime).toLocaleString()}, Price: ${formData.price}`;
      
      // Create simple access policy (M, ρ)
      const policy = {
        matrix: attributes.map(() => [1]),
        rho: attributes.reduce((acc, attr, idx) => ({ ...acc, [idx]: attr }), {}),
      };

      // Send metadata separately for ride pool display
      const rideMetadata = {
        destination: formData.destination,
        pickup: formData.pickup,
        time: new Date(formData.datetime).toLocaleString(),
        timestamp: timestamp,
        price: formData.price
      };

      const response = await createRide(plaintext, policy, formData.riderAddress, rideMetadata);
      setResult(response);
    } catch (error: any) {
      console.error('Error creating ride:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Request a Ride</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline h-4 w-4 mr-1" />
              Pickup Location
            </label>
            <input
              type="text"
              value={formData.pickup}
              onChange={(e) => setFormData({ ...formData, pickup: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter pickup location"
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
              value={formData.destination}
              onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter destination"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="inline h-4 w-4 mr-1" />
              Departure Date & Time
            </label>
            <input
              type="datetime-local"
              value={formData.datetime}
              onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              min={new Date().toISOString().slice(0, 16)}
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Select your preferred departure date and time
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="inline h-4 w-4 mr-1" />
              Max Price (ETH)
            </label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.01"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Driver Attributes
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {attributes.map((attr, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm flex items-center gap-1"
                >
                  {attr}
                  <button
                    type="button"
                    onClick={() => removeAttribute(attr)}
                    className="hover:bg-purple-200 rounded-full p-0.5"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                placeholder="e.g., verified_driver, 5star_rating, premium_vehicle"
              />
              <button
                type="button"
                onClick={addAttribute}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Policy: Driver must have ALL these attributes to match
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Creating Encrypted Ride Request...'
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Create Ride Request
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            {result.error ? (
              <div className="text-red-600">
                <strong>Error:</strong> {result.error}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-green-600 font-semibold">✓ Ride Request Created!</div>
                <div className="text-sm text-gray-600">
                  <strong>Ride ID:</strong> {result.rideId}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>CT Hash:</strong> {result.ctHash?.substring(0, 20)}...
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Tx Hash:</strong> {result.txHash?.substring(0, 20)}...
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Your ride details are encrypted with CP-ABE. Only drivers with matching attributes can decrypt.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
