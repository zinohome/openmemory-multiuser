'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  Plus, 
  Search, 
  Trash2, 
  Archive, 
  Calendar,
  User as UserIcon,
  RefreshCw,
  LogOut
} from 'lucide-react';
import apiService, { Memory, User, PaginatedResponse } from '@/services/api';

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [creating, setCreating] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    checkAuth();
    fetchMemories();
    fetchUsers();
  }, [currentPage, pageSize]);

  const checkAuth = () => {
    if (typeof window === 'undefined') return;
    
    //console.log('('Checking authentication...');
    const apiKey = sessionStorage.getItem('api_key') || localStorage.getItem('api_key');
    const userId = sessionStorage.getItem('user_id') || localStorage.getItem('user_id');
    const userName = sessionStorage.getItem('user_name') || localStorage.getItem('user_name');

    if (!apiKey) {
    //console.log('('No API key found, redirecting to login');
    router.push('/login');
    return;
  }

    setCurrentUser({ userId, userName, apiKey: apiKey.substring(0, 10) + '...' });
  };

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const response: PaginatedResponse<Memory> = await apiService.getMemories({
        page: currentPage,
        size: pageSize,
        state: 'active'
      });
      
      setMemories(response.items || []);
      setTotalPages(response.pages || 1);
      setTotalItems(response.total || 0);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const userData = await apiService.getAllUsers();
      setUsers(userData);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleCreateMemory = async () => {
    if (!newMemoryContent.trim()) return;
    
    setCreating(true);
    try {
      await apiService.createMemory(newMemoryContent);
      setNewMemoryContent('');
      setShowCreateDialog(false);
      fetchMemories(); // Refresh the list
    } catch (error) {
      console.error('Failed to create memory:', error);
      alert('Failed to create memory');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;
    
    try {
      await apiService.deleteMemory(id);
      fetchMemories(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete memory:', error);
      alert('Failed to delete memory');
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }
    router.push('/login');
  };

  const getUserDisplay = (memory: Memory) => {
    const user = users.find(u => u.id === memory.user_id) || memory.user;
    
    if (!user) {
      return { initials: '?', name: 'Unknown', color: '#6B7280' };
    }

    const name = user.name || user.user_id;
    const initials = apiService.getUserInitials(name);
    const color = apiService.getUserColor(user.user_id);

    return { initials, name, color };
  };

  const filteredMemories = memories.filter(memory =>
    memory.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <Brain className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">OpenMemory</h1>
            </div>
            <div className="flex items-center space-x-4">
              {currentUser && (
                <div className="flex items-center space-x-2 text-gray-300">
                  <UserIcon className="h-4 w-4" />
                  <span>{currentUser.userName}</span>
                </div>
              )}
              <button
                onClick={fetchMemories}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Create Memory</span>
          </button>
        </div>

        {/* Stats */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-gray-300">
              <span className="text-2xl font-bold text-white">{totalItems}</span> total memories
            </div>
            <div className="text-gray-400 text-sm">
              Page {currentPage} of {totalPages} • {pageSize} per page
            </div>
          </div>
        </div>

        {/* Memories List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Brain className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No memories found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search' : 'Create your first memory to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMemories.map((memory) => {
              const userDisplay = getUserDisplay(memory);
              return (
                <div
                  key={memory.id}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                          style={{ backgroundColor: userDisplay.color }}
                        >
                          {userDisplay.initials}
                        </div>
                        <span className="text-gray-400 text-sm">{userDisplay.name}</span>
                        <span className="text-gray-500 text-sm">•</span>
                        <span className="text-gray-500 text-sm flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(memory.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-100">{memory.content}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="ml-4 p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete memory"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center space-x-2 mt-8">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </main>

      {/* Create Memory Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create New Memory</h2>
            <textarea
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              placeholder="Enter your memory..."
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewMemoryContent('');
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateMemory}
                disabled={!newMemoryContent.trim() || creating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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