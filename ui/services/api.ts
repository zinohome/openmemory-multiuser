// ui/services/api.ts
//import axios from 'axios';
// 修改第一行导入语句，添加AxiosError类型
import axios, { AxiosError } from 'axios';
// Hardcode the API URL since environment variables aren't working properly
// 修改前
//const API_BASE_URL = 'http://192.168.66.163:8765';

// 修改后
//const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.66.163:8765';
const API_BASE_URL = '/api/proxy'; // 使用代理路径

// Create axios instance with auth interceptor
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false, // 添加这一行，确保跨域请求不包含凭证
  timeout: 10000, // 添加超时设置，避免请求无限等待
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth header to all requests
api.interceptors.request.use(
  (config) => {
    // 同时检查sessionStorage和localStorage中的api_key
    const apiKey = sessionStorage.getItem('api_key') || localStorage.getItem('api_key');
    if (apiKey) {
      //console.log('('Adding auth headers with API key:', apiKey.substring(0, 10) + '...');
      config.headers['Authorization'] = `Bearer ${apiKey}`;
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 导出配置好的axios实例，供其他组件使用
export { api };

// 增加一个工具函数来记录详细的请求信息
const logRequest = (config: any) => {
  //console.log('('Making request to:', config.url);
  //console.log('('Full request URL:', `${config.baseURL}${config.url}`);
  //console.log('('Request headers:', config.headers);
  //console.log('('Request method:', config.method);

  // 检查网络连通性
  if (navigator && navigator.onLine === false) {
    console.warn('Browser is offline');
  }

  return config;
};

// 请求拦截器，添加认证信息和详细日志
api.interceptors.request.use(
  (config) => {
    // 同时检查sessionStorage和localStorage中的api_key
    const apiKey = sessionStorage.getItem('api_key') || localStorage.getItem('api_key');
    if (apiKey) {
      //console.log('('Adding auth headers with API key:', apiKey.substring(0, 10) + '...');
      config.headers['Authorization'] = `Bearer ${apiKey}`;
      config.headers['X-API-Key'] = apiKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器，处理错误和详细日志
api.interceptors.response.use(
  (response) => {
    //console.log('('Request successful:', response.config.url, 'Status:', response.status);
    return response;
  },
  (error) => {
    console.error('Request failed:', error.config?.url);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.status ? `Status: ${error.response.status}` : 'No response',
      request: error.request ? 'Request object exists' : 'No request object'
    });
    
    if (error.response?.status === 401) {
      // Clear session and redirect to login
      sessionStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  user_id: string;
  name: string;
  email?: string;
  created_at: string;
  last_active?: string;
}

export interface Memory {
  id: string;
  content: string;
  user_id: string;
  user?: User;
  app_id: string;
  created_at: string;
  updated_at?: string;
  state: 'active' | 'archived' | 'deleted';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

class ApiService {
  // Auth endpoints
  async login(apiKey: string) {
    const response = await api.post('/api/v1/auth/login', { api_key: apiKey });
    return response.data;
  }

  async validateApiKey(apiKey: string) {
    const response = await api.post('/api/v1/auth/validate', { api_key: apiKey });
    return response.data;
  }

  async getCurrentUser() {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  }

  // User endpoints
  async getAllUsers(): Promise<User[]> {
  try {
    // 首先尝试GET方法
    //console.log('('Trying GET method for users');
    const response = await api.get('/api/v1/users/');
    //console.log('('GET method successful, received users:', response.data);
    return response.data;
  } catch (getError) {
    // 使用AxiosError类型断言
    const error = getError as AxiosError;
    // GET方法失败，记录错误信息并尝试POST方法
    console.error('GET request failed for users:', {
      message: error.message,
      code: error.code,
      response: error.response?.status ? `Status: ${error.response.status}` : 'No response',
      requestDetails: error.config,
      fullRequestUrl: error.config ? `${error.config.baseURL || ''}${error.config.url || ''}` : 'No config available'
    });
    throw new Error(`Failed to fetch users: GET error(${error.message})`);
  }
}

  async getUserStats(userId?: string) {
    const params = userId ? { user_id: userId } : {};
    const response = await api.get('/api/v1/stats/', { params });  
    return response.data;
  }

  // Memory endpoints
  async getMemories(params: {
    page?: number;
    size?: number;
    user_id?: string;
    state?: string;
  }): Promise<PaginatedResponse<Memory>> {
    const response = await api.post('/api/v1/memories/filter', params);
    return response.data;
  }

  async createMemory(content: string) {
    const response = await api.post('/api/v1/memories/', {
      text: content,
    });
    return response.data;
  }

  async deleteMemory(memoryId: string) {
    const response = await api.delete('/api/v1/memories/', {
      data: { memory_id: memoryId }
    });
    return response.data;
  }

  async searchMemories(query: string, limit: number = 10) {
    const response = await api.post('/api/v1/memories/search', {
      query,
      limit
    });
    return response.data;
  }

  // App endpoints
  async getApps() {
    const response = await api.get('/api/v1/apps/');
    return response.data;
  }

  async createApp(name: string) {
    const response = await api.post('/api/v1/apps/', { name });
    return response.data;
  }

  // Utility function to generate user color from user_id hash
  getUserColor(userId: string): string {
    // Generate consistent color from user_id
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Convert to HSL with good saturation and lightness
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`;
  }

  // Get user initials
  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
}

export const apiService = new ApiService();
export default apiService;