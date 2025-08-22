'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Package,
  Plus,
  Settings,
  Activity,
  MoreVertical,
  Calendar,
  Database,
  RefreshCw
} from 'lucide-react';
import apiService from '@/services/api';

interface App {
  id: string;
  name: string;
  created_at: string;
  memory_count?: number;
  is_active?: boolean;
}

export default function AppsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchApps();
  }, []);

  const checkAuth = () => {
    if (typeof window === 'undefined') return;
    
    const apiKey = sessionStorage.getItem('api_key') || localStorage.getItem('api_key');
    if (!apiKey) {
      router.push('/login');
    }
  };

  const fetchApps = async () => {
    setLoading(true);
    try {
      const response = await apiService.getApps();
      setApps(response.apps || response || []);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      // Create default app if none exist
      setApps([
        {
          id: 'default',
          name: 'Default App',
          created_at: new Date().toISOString(),
          memory_count: 0,
          is_active: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async () => {
    if (!newAppName.trim()) return;
    
    setCreating(true);
    try {
      await apiService.createApp(newAppName);
      setNewAppName('');
      setShowCreateDialog(false);
      fetchApps();
    } catch (error) {
      console.error('Failed to create app:', error);
      alert('Failed to create app');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">Apps</h1>
            </div>
            <button
              onClick={fetchApps}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg text-gray-300">Manage your connected applications</h2>
            <p className="text-sm text-gray-500 mt-1">
              Apps help organize memories by source or purpose
            </p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create App</span>
          </button>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Package className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No apps found</h3>
            <p className="text-gray-500 mb-4">Create your first app to organize memories</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create First App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <div
                key={app.id}
                className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <Package className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{app.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {app.is_active !== false ? (
                          <div className="flex items-center space-x-1">
                            <Activity className="h-3 w-3 text-green-400" />
                            <span className="text-xs text-green-400">Active</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1">
                            <Activity className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-500">Inactive</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-white">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Database className="h-4 w-4" />
                      <span>Memories</span>
                    </span>
                    <span className="text-white">{app.memory_count || 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created</span>
                    </span>
                    <span className="text-white">{formatDate(app.created_at)}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button
                    onClick={() => router.push(`/apps/${app.id}`)}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create App Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create New App</h2>
            <input
              type="text"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="Enter app name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
              autoFocus
            />
            <p className="text-sm text-gray-400 mb-4">
              Apps help you organize memories by their source or purpose
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewAppName('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateApp}
                disabled={!newAppName.trim() || creating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}