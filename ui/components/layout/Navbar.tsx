// ui/components/layout/Navbar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brain, Database, Settings, LogOut, User as UserIcon } from 'lucide-react';
import apiService from '@/services/api';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ user_id: string; name: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Get current user from session
    const userId = sessionStorage.getItem('user_id');
    const userName = sessionStorage.getItem('user_name');
    
    if (userId && userName) {
      setCurrentUser({ user_id: userId, name: userName });
    }
  }, [pathname]); // Re-check on route change

  const handleLogout = () => {
    // Clear session storage
    sessionStorage.clear();
    // Redirect to login
    router.push('/login');
  };

  const getUserColor = () => {
    if (!currentUser) return '#6B7280';
    return apiService.getUserColor(currentUser.user_id);
  };

  const getUserInitials = () => {
    if (!currentUser) return '?';
    return apiService.getUserInitials(currentUser.name);
  };

  // Don't show navbar on login page
  if (pathname === '/login') {
    return null;
  }

  const navItems = [
    { href: '/memories', label: 'Memories', icon: Database },
    { href: '/apps', label: 'Apps', icon: Brain },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link href="/memories" className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-lg">OpenMemory</span>
            </Link>

            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-gray-800 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-3 text-gray-300 hover:text-white transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ backgroundColor: getUserColor() }}
              >
                {getUserInitials()}
              </div>
              <span className="hidden md:block text-sm">
                {currentUser?.name || 'Unknown User'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-50">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-sm text-white font-medium">
                    {currentUser?.name || 'Unknown User'}
                  </p>
                  <p className="text-xs text-gray-400">
                    @{currentUser?.user_id || 'unknown'}
                  </p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-800">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium ${
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}