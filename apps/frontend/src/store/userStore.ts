import { create } from 'zustand';
import type { Position } from '../types';
import { api } from '../services/api';

interface UserStore {
  balance: number;
  usdcBalance: number;
  positions: Position[];
  loading: boolean;
  fetchBalance: () => Promise<void>;
  fetchPositions: () => Promise<void>;
}

export const useUserStore = create<UserStore>((set) => ({
  balance: 0,
  usdcBalance: 0,
  positions: [],
  loading: false,

  fetchBalance: async () => {
    try {
      const data = await api.get<{ balance: number; usdcBalance: number }>('/balance');
      set({ balance: data.balance, usdcBalance: data.usdcBalance });
    } catch {
      // Silently fail on auth errors
    }
  },

  fetchPositions: async () => {
    try {
      const data = await api.get<{ positions: Position[] }>('/positions');
      set({ positions: data.positions });
    } catch {
      // Silently fail on auth errors
    }
  },
}));
