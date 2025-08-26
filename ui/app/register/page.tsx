'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Brain, User, UserPlus, AlertCircle, CheckCircle, Copy, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [mcpConfig, setMcpConfig] = useState<any>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState({ apiKey: false, config: false });
  const router = useRouter();

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return "Username must be at least 3 characters";
    if (username.length > 20) return "Username must be 20 characters or less";
    if (!/^[a-z]/.test(username)) return "Username must start with a lowercase letter";
    if (!/^[a-z][a-z0-9_]*$/.test(username)) return "Username can only contain lowercase letters, numbers, and underscores";
    return null;
  };

  const handleUsernameChange = (value: string) => {
    // Convert to lowercase and remove invalid characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(cleaned);
    setError(''); // Clear errors when user types
  };

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    setError(''); // Clear errors when user types
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Client-side validation
    const usernameError = validateUsername(username);
    if (usernameError) {
      setError(usernameError);
      setLoading(false);
      return;
    }

    if (!displayName.trim()) {
      setError('Display name is required');
      setLoading(false);
      return;
    }

    if (displayName.trim().length > 50) {
      setError('Display name must be 50 characters or less');
      setLoading(false);
      return;
    }

    try {
      const apiUrl = 'http://mem-lab.duckdns.org:8765';
      console.log('Attempting registration to:', apiUrl);
      
      const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: username.trim(),
          display_name: displayName.trim()
        }),
      });

      const data = await response.json();
      console.log('Registration response:', data);

      if (response.ok && data.success) {
        setRegistrationSuccess(true);
        setApiKey(data.api_key);
        setMcpConfig(data.mcp_config);
        setError('');
        console.log('Registration successful');
      } else {
        setError(data.detail || 'Registration failed');
        console.error('Registration failed:', data);
      }
    } catch (err) {
      setError('Failed to connect to server. Please check your connection.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'apiKey' | 'config') => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopied({ ...copied, [type]: true });
      setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Show error to user
      alert('Copy failed. Please manually select and copy the text.');
    }
  };

  const goToLogin = () => {
    router.push('/login');
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/10 rounded-2xl mb-4">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Account Created!</h1>
            <p className="text-gray-400">Welcome to OpenMemory, {displayName}!</p>
          </div>

          {/* Success Card */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700 space-y-6">
            
            {/* API Key Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-white">Your API Key</h3>
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <code className="text-green-400 font-mono break-all">
                    {showApiKey ? apiKey : '•'.repeat(apiKey.length)}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiKey, 'apiKey')}
                    className="ml-3 p-2 text-gray-400 hover:text-white transition-colors"
                    title="Copy API key"
                  >
                    {copied.apiKey ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-red-400 text-sm mt-2 flex items-start">
                <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                <span>Store this key safely! It cannot be recovered if lost.</span>
              </p>
            </div>

            {/* MCP Configuration Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-white">Claude Desktop Configuration</h3>
              </div>
              <div className="bg-gray-900 border border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <pre className="text-gray-300 text-sm font-mono overflow-x-auto flex-1">
{JSON.stringify(mcpConfig, null, 2)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(mcpConfig, null, 2), 'config')}
                    className="ml-3 p-2 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                    title="Copy configuration"
                  >
                    {copied.config ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                Add this configuration to your <code className="text-gray-300 bg-gray-700 px-1 rounded">claude_desktop_config.json</code> file
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-blue-300 font-medium mb-2">Next Steps:</h4>
              <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                <li>Copy and save your API key securely</li>
                <li>Add the configuration to your Claude Desktop config file</li>
                <li>Restart Claude Desktop</li>
                <li>Start using OpenMemory with Claude!</li>
              </ol>
            </div>

            {/* Action Button */}
            <div>
              <button
                onClick={goToLogin}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
              >
                Go to Login
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>Your OpenMemory account is ready to use!</p>
            <p>Username: <span className="text-gray-400 font-mono">{username}</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/10 rounded-2xl mb-4">
            <Brain className="w-10 h-10 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Join OpenMemory</h1>
          <p className="text-gray-400">Create your personal AI memory system</p>
        </div>

        {/* Registration Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700">
          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="username"
                  type="text"
                  className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                  placeholder="alice_smith"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={20}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Lowercase letters, numbers, and underscores only. 3-20 characters.
              </p>
            </div>

            {/* Display Name Field */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <UserPlus className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  id="displayName"
                  type="text"
                  className="w-full pl-10 pr-3 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Alice Smith"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  required
                  disabled={loading}
                  maxLength={50}
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Your friendly display name (up to 50 characters)
              </p>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-center text-sm text-gray-400">
              Already have an account?{' '}
              <Link 
                href="/login" 
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>OpenMemory Multi-User System</p>
          <p>Powered by Claude + Human Collaboration</p>
        </div>
      </div>
    </div>
  );
}
