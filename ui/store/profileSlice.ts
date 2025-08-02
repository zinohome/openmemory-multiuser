import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define user interface
export interface User {
  id: string;
  name: string;
  displayName: string;
  isActive: boolean;
  createdAt: string;
}

interface ProfileState {
  userId: string;
  currentUser: User | null;
  availableUsers: User[];
  totalMemories: number;
  totalApps: number;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  apps: any[];
}

// Initialize with your test users
const defaultUsers: User[] = [
  {
    id: 'research-lab',
    name: 'research-lab',
    displayName: 'Research Lab',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'opti',
    name: 'opti',
    displayName: 'Opti',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'piper',
    name: 'piper',
    displayName: 'Piper',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'd',
    name: 'd',
    displayName: 'D',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const initialState: ProfileState = {
  userId: process.env.NEXT_PUBLIC_USER_ID || 'research-lab',
  currentUser: defaultUsers.find(u => u.id === (process.env.NEXT_PUBLIC_USER_ID || 'research-lab')) || defaultUsers[0],
  availableUsers: defaultUsers,
  totalMemories: 0,
  totalApps: 0,
  status: 'idle',
  error: null,
  apps: [],
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setUserId: (state, action: PayloadAction<string>) => {
      state.userId = action.payload;
      state.currentUser = state.availableUsers.find(u => u.id === action.payload) || null;
    },
    setCurrentUser: (state, action: PayloadAction<User>) => {
      state.currentUser = action.payload;
      state.userId = action.payload.id;
    },
    addUser: (state, action: PayloadAction<Omit<User, 'createdAt'>>) => {
      const newUser: User = {
        ...action.payload,
        createdAt: new Date().toISOString()
      };
      state.availableUsers.push(newUser);
    },
    updateUser: (state, action: PayloadAction<User>) => {
      const index = state.availableUsers.findIndex(u => u.id === action.payload.id);
      if (index !== -1) {
        state.availableUsers[index] = action.payload;
        if (state.currentUser?.id === action.payload.id) {
          state.currentUser = action.payload;
        }
      }
    },
    removeUser: (state, action: PayloadAction<string>) => {
      state.availableUsers = state.availableUsers.filter(u => u.id !== action.payload);
      if (state.currentUser?.id === action.payload) {
        state.currentUser = state.availableUsers[0] || null;
        state.userId = state.currentUser?.id || '';
      }
    },
    setProfileLoading: (state) => {
      state.status = 'loading';
      state.error = null;
    },
    setProfileError: (state, action: PayloadAction<string>) => {
      state.status = 'failed';
      state.error = action.payload;
    },
    resetProfileState: (state) => {
      state.status = 'idle';
      state.error = null;
      state.userId = process.env.NEXT_PUBLIC_USER_ID || 'research-lab';
      state.currentUser = state.availableUsers.find(u => u.id === state.userId) || state.availableUsers[0];
    },
    setTotalMemories: (state, action: PayloadAction<number>) => {
      state.totalMemories = action.payload;
    },
    setTotalApps: (state, action: PayloadAction<number>) => {
      state.totalApps = action.payload;
    },
    setApps: (state, action: PayloadAction<any[]>) => {
      state.apps = action.payload;
    }
  },
});

export const {
  setUserId,
  setCurrentUser,
  addUser,
  updateUser,
  removeUser,
  setProfileLoading,
  setProfileError,
  resetProfileState,
  setTotalMemories,
  setTotalApps,
  setApps
} = profileSlice.actions;

export default profileSlice.reducer;
