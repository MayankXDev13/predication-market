import { useState } from 'react';
import { api } from '../../services/api';
import { toast } from '../ui/Toast';
import { useMarketStore } from '../../store/marketStore';
import { useUserStore } from '../../store/userStore';

export function SplitMerge() {
  const { markets, selectedMarketId } = useMarketStore();
  const market = markets.find((m) => m.id === selectedMarketId);
  const { fetchBalance, fetchPositions } = useUserStore();

  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);

  if (!market) return null;

  const runAction = async (action: 'split' | 'merge') => {
    const parsedAmount = Math.floor(Number(amount));
    if (!Number.isFinite(parsedAmount) || parsedAmount < 1) {
      toast('Enter a valid quantity', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/${action}`, {
        marketId: market.id,
        amount: parsedAmount,
      });
      toast(`${action === 'split' ? 'Split' : 'Merge'} completed`);
      await Promise.all([fetchBalance(), fetchPositions()]);
    } catch (err: any) {
      toast(err.message || `${action} failed`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1a1a23] rounded-lg p-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Split / Merge</span>
        <span className="text-xs text-gray-500">1:1 conversion</span>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#24243a] rounded-lg px-3 py-2 text-sm text-white border border-[#2d2d3d] focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => runAction('split')}
            disabled={loading}
            className="py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => runAction('merge')}
            disabled={loading}
            className="py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50"
          >
            Merge
          </button>
        </div>
      </div>
    </div>
  );
}
