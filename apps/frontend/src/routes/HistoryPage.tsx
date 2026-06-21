import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { OrderHistory as OrderHistoryType } from '../types';
import { useMarketStore } from '../store/marketStore';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';

export function HistoryPage() {
  const [history, setHistory] = useState<OrderHistoryType[]>([]);
  const [loading, setLoading] = useState(true);
  const { markets } = useMarketStore();
  const marketTitleById = new Map(markets.map((m) => [m.id, m.title]));

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await api.post<{ history: OrderHistoryType[] }>('/history');
        setHistory(data.history || []);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const typeColor = (type: string) => {
    switch (type) {
      case 'Buy': return 'text-green-400';
      case 'Sell': return 'text-red-400';
      case 'Split': return 'text-purple-400';
      case 'Merge': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Order History</h1>

      <div className="bg-[#1a1a23] rounded-lg p-4">
        {loading ? (
          <TableSkeleton rows={5} />
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-[#2d2d3d]">
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Market</th>
                  <th className="text-right py-2 px-2">Price</th>
                  <th className="text-right py-2 px-2">Qty</th>
                  <th className="text-right py-2 px-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-[#2d2d3d] hover:bg-[#24243a]">
                    <td className={`py-2 px-2 font-medium ${typeColor(entry.orderType)}`}>
                      {entry.orderType}
                    </td>
                    <td className="py-2 px-2 text-white max-w-[200px] truncate">
                      {marketTitleById.get(entry.marketId) || 'Unknown'}
                    </td>
                    <td className="py-2 px-2 text-right text-white">
                      {entry.price > 0 ? `$${(entry.price / 100).toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2 px-2 text-right text-white">
                      {entry.qty.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-400 text-xs">
                      {entry.createdAt
                        ? new Date(entry.createdAt).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
