'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings,
  User,
  Key,
  Database,
  Bell,
  Shield,
  Info,
  Copy,
  Check,
  Eye,
  EyeOff
} from 'lucide-react';

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    if (typeof window === 'undefined') return;
    
    const apiKey = sessionStorage.getItem('api_key') || localStorage.getItem('api_key');
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
    const userName = sessionStorage.getItem('user_name') || localStorage.getItem('user_name');

    if (!apiKey) {
      router.push('/login');
      return;
    }

    setCurrentUser({ userId, userName, apiKey });
  };

  const handleCopyApiKey = () => {
    if (currentUser?.apiKey) {
      navigator.clipboard.writeText(currentUser.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Settings className="h-8 w-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* User Profile Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">User Profile</h2>
          </div>
          
          {currentUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">User ID</label>
                <div className="mt-1 px-3 py-2 bg-gray-700 rounded-lg text-white">
                  {currentUser.userId}
                </div>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">Name</label>
                <div className="mt-1 px-3 py-2 bg-gray-700 rounded-lg text-white">
                  {currentUser.userName}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* API Configuration Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Key className="h-5 w-5 text-green-400" />
            <h2 className="text-lg font-semibold text-white">API Configuration</h2>
          </div>
          
          {currentUser && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">API Key</label>
                <div className="mt-1 flex items-center space-x-2">
                  <div className="flex-1 px-3 py-2 bg-gray-700 rounded-lg text-white font-mono text-sm">
                    {showApiKey ? currentUser.apiKey : '••••••••••••••••••••'}
                  </div>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title={showApiKey ? 'Hide' : 'Show'}
                  >
                    {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={handleCopyApiKey}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                    title="Copy"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-400" /> : <Copy className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Keep your API key secure. Do not share it publicly.
                </p>
              </div>
              
              <div>
                <label className="text-sm text-gray-400">API Endpoint</label>
                <div className="mt-1 px-3 py-2 bg-gray-700 rounded-lg text-white font-mono text-sm">
                  http://mem-lab.duckdns.org:8765
                </div>
              </div>
            </div>
          )}
        </div>

        {/* System Information Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Info className="h-5 w-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">System Information</h2>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Version</span>
              <span className="text-white">OpenMemory v2.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">API Status</span>
              <span className="text-green-400">Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Database</span>
              <span className="text-white">PostgreSQL + Qdrant</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Embedding Model</span>
              <span className="text-white">mxbai-embed-large</span>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Bell className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                defaultChecked
              />
              <span className="text-white">Enable notifications</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                defaultChecked
              />
              <span className="text-white">Auto-refresh dashboard</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
              />
              <span className="text-white">Dark mode only</span>
            </label>
          </div>
        </div>

        {/* Actions Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center space-x-3 mb-4">
            <Shield className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-white">Account Actions</h2>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Logout
            </button>
            
            <p className="text-xs text-gray-500 text-center">
              Logging out will clear your session. You'll need your API key to log back in.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}