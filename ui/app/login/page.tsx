'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, Key, AlertCircle, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // Use the external API URL directly
      const apiUrl = 'http://mem-lab.duckdns.org:8765';
      console.log('Attempting login to:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const data = await response.json();
      console.log('Login response:', data);

      if (response.ok && data.success) {
        // Store API key in session storage
        sessionStorage.setItem('api_key', apiKey);
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('user_name', data.name || data.user_id);
        
        // Also store in localStorage as backup
        localStorage.setItem('api_key', apiKey);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user_name', data.name || data.user_id);
        
        console.log('Login successful, stored credentials');
        console.log('Stored user_id:', data.user_id);
        console.log('Stored user_name:', data.name);
        
        // Show success message
        setSuccess(true);
        setError('');
        
        // Try multiple navigation methods
        setTimeout(() => {
          console.log('Attempting navigation to /memories');
          
          // Method 1: Next.js router
          router.push('/memories');
          
          // Method 2: Fallback to window.location after a delay
          setTimeout(() => {
            // If we're still on this page, force navigation
            if (window.location.pathname === '/login') {
              console.log('Router.push failed, using window.location');
              window.location.href = '/memories';
            }
          }, 1000);
        }, 500);
        
      } else {
        setError(data.detail || 'Invalid API key');
        console.error('Login failed:', data);
      }
    } catch (err) {
      setError('Failed to connect to server. Please check your connection.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add a debug function to test navigation
  const testNavigation = () => {
    console.log('Testing navigation...');
    router.push('/memories');
    setTimeout(() => {
      if (window.location.pathname === '/login') {
        console.log('Router navigation failed, trying window.location');
        window.location.href = '/memories';
      }
    }, 500);
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
                  className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="mem_lab_xxxxxxxxxxxx"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Enter your API key to access the memory dashboard
              </p>
            </div>

            {success && (
              <div className="flex items-center space-x-2 text-green-400 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>Login successful! Redirecting...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || success}
            >
              {loading ? 'Authenticating...' : success ? 'Redirecting...' : 'Access Dashboard'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              New to OpenMemory?{' '}
              <Link 
                href="/register" 
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Research Lab Memory System</p>
          <p>Powered by Claude + Human Collaboration</p>
        </div>
      </div>
    </div>
  );
}
