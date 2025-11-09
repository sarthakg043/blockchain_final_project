import { Routes, Route, Link } from 'react-router-dom';
import { Car, Users, Shield, List } from 'lucide-react';
import RiderPage from './pages/RiderPage';
import DriverPage from './pages/DriverPage';
import AdminPage from './pages/AdminPage';
import RidePoolPage from './pages/RidePoolPage';
import { WalletProvider } from './contexts/WalletContext';

function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-purple-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                Decentralized Cab Sharing
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50"
              >
                <Users className="h-4 w-4 mr-1" />
                Rider
              </Link>
              <Link
                to="/pool"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50"
              >
                <List className="h-4 w-4 mr-1" />
                Ride Pool
              </Link>
              <Link
                to="/driver"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50"
              >
                <Car className="h-4 w-4 mr-1" />
                Driver
              </Link>
              <Link
                to="/admin"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50"
              >
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<RiderPage />} />
          <Route path="/pool" element={<RidePoolPage />} />
          <Route path="/driver" element={<DriverPage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </main>
    </div>
    </WalletProvider>
  );
}

export default App;
