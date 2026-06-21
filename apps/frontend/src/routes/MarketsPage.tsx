import { useEffect } from 'react';
import { useMarketStore } from '../store/marketStore';
import { MarketCard } from '../components/market/MarketCard';
import { MarketCardSkeleton } from '../components/ui/LoadingSkeleton';

export function MarketsPage() {
  const { markets, loading, error, fetchMarkets } = useMarketStore();

  useEffect(() => {
    fetchMarkets();
  }, [fetchMarkets]);

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-sm text-gray-400">Trade live prediction markets</p>
        </div>
        <span className="text-xs text-gray-500 bg-[#24243a] px-3 py-1 rounded-full">
          {markets.length} markets
        </span>
      </div>

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <MarketCardSkeleton key={i} />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-red-400 text-sm">{error}</div>
      )}

      {!loading && !error && markets.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">No markets available.</div>
      )}

      {!loading && !error && markets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
