// ui/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Key, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store API key in session storage
        sessionStorage.setItem('api_key', apiKey);
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('user_name', data.name);
        
        // Redirect to memories page
        router.push('/memories');
      } else {
        setError(data.detail || 'Invalid API key');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-4">
            <Brain className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">OpenMemory</h1>
          <p className="text-gray-400">Collaborative AI Memory System</p>
        </div>

        {/* Login Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="mem_lab_xxxxxxxxxxxx"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Enter your API key to access the memory dashboard
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 px-4 py-3 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !apiKey}
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            >
              {loading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="text-center text-sm text-gray-400">
              <p>New user? Create your first memory via MCP</p>
              <p className="mt-1">to receive your API key</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>Research Lab Memory System</p>
          <p className="mt-1">Powered by Claude + Human Collaboration</p>
        </div>
      </div>
    </div>
  );
}