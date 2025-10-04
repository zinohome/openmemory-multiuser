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
      const apiUrl = '/api/proxy'; // 使用代理路径
      //console.log('('Attempting login to:', `${apiUrl}/api/v1/auth/login`);
      
      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ api_key: apiKey }),
        credentials: 'include' // 确保包含cookies
      });

      // 先读取响应文本，保存后再尝试解析
      const responseText = await response.text();

      if (!response.ok) {
        console.error(`Server error: ${response.status} ${response.statusText}`);
        console.error('Response text:', responseText);
        setError(`Server error: ${response.status} ${response.statusText}`);
        return;
      }

      // 尝试解析JSON
      let data;
      try {
        data = JSON.parse(responseText);
        //console.log('('Login response:', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON:', jsonError);
        console.error('Response text:', responseText);
        setError('Server returned invalid response');
        return;
      }
      //const data = await response.json();
      //console.log('Login response:', data);

      if (response.ok && data.success) {
        // 清除旧的存储数据
        sessionStorage.clear();
        localStorage.clear();

        // 存储API key和用户信息
        sessionStorage.setItem('api_key', apiKey);
        sessionStorage.setItem('user_id', data.user_id);
        sessionStorage.setItem('user_name', data.name || data.user_id);
        
        // localStorage备份
        localStorage.setItem('api_key', apiKey);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user_name', data.name || data.user_id);
        
        // 安全地设置cookie
        const authToken = `${data.user_id}:${apiKey}`;
        // 修改前的cookie设置
        // document.cookie = `om_auth=${encodeURIComponent(authToken)}; path=/; max-age=86400; SameSite=Lax`;

        // 修改后的cookie设置（更详细的配置）
        // 修改后的cookie设置
        const setAuthCookie = (name: string, value: string, days: number = 1) => {
          const expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + days);
          
          // 简化cookie设置，确保路径和SameSite设置正确
          document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${days * 24 * 60 * 60}; SameSite=Lax`;
        };

        // 使用新函数设置cookie
        setAuthCookie('om_auth', authToken);
        
        //console.log('('Login success - cookies after setting:', document.cookie);
        //console.log('('Cookie value:', document.cookie.includes('om_auth') ? 'Cookie exists' : 'Cookie missing');
                
        // Show success message
        setSuccess(true);
        setError('');
        
        // 获取重定向参数，如果有的话
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get('redirect') || '/memories';

        // 临时解决方案：直接在sessionStorage中设置当前用户信息，避免加载用户列表
        const currentUserInfo = {
          id: data.user_id,
          name: data.user_id,
          displayName: data.name || data.user_id,
          isActive: true,
          createdAt: new Date().toISOString()
        };

        sessionStorage.setItem('currentUser', JSON.stringify(currentUserInfo));
        
        // 使用window.location进行可靠的重定向
        setTimeout(() => {
          //console.log('('Redirecting to:', redirectPath);
          window.location.href = redirectPath;
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
    //console.log('('Testing navigation...');
    router.push('/memories');
    setTimeout(() => {
      if (window.location.pathname === '/login') {
        //console.log('('Router navigation failed, trying window.location');
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
