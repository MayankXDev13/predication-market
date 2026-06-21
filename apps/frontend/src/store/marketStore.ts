import { create } from 'zustand';
import type { Market } from '../types';
import { api } from '../services/api';

interface MarketStore {
  markets: Market[];
  selectedMarketId: string | null;
  loading: boolean;
  error: string | null;
  fetchMarkets: () => Promise<void>;
  selectMarket: (id: string | null) => void;
}

export const useMarketStore = create<MarketStore>((set) => ({
  markets: [],
  selectedMarketId: null,
  loading: false,
  error: null,

  fetchMarkets: async () => {
    set({ loading: true, error: null });
    try {
      const data = await api.get<{ markets: Market[] }>('/markets');
      set({ markets: data.markets, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  selectMarket: (id) => set({ selectedMarketId: id }),
}));
