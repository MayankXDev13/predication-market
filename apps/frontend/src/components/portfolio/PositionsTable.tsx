import { useUserStore } from '../../store/userStore';
import { useMarketStore } from '../../store/marketStore';

export function PositionsTable() {
  const { positions } = useUserStore();
  const { markets } = useMarketStore();
  const marketTitleById = new Map(markets.map((m) => [m.id, m.title]));

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No positions yet. Start trading!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-[#2d2d3d]">
            <th className="text-left py-2 px-2">Market</th>
            <th className="text-left py-2 px-2">Type</th>
            <th className="text-right py-2 px-2">Quantity</th>
            <th className="text-right py-2 px-2">Value (¢)</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const value = pos.type === 'Yes'
              ? positions.find((p) => p.marketId === pos.marketId && p.type === 'No')?.qty || 0
              : 0;
            return (
              <tr key={pos.id} className="border-b border-[#2d2d3d] hover:bg-[#24243a]">
                <td className="py-2 px-2 text-white max-w-[200px] truncate">
                  {marketTitleById.get(pos.marketId) || 'Unknown'}
                </td>
                <td className={`py-2 px-2 font-medium ${pos.type === 'Yes' ? 'text-green-400' : 'text-red-400'}`}>
                  {pos.type}
                </td>
                <td className="py-2 px-2 text-right text-white">{pos.qty.toLocaleString()}</td>
                <td className="py-2 px-2 text-right text-gray-400">
                  {pos.qty > 0 ? `$${pos.qty.toFixed(2)}` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
