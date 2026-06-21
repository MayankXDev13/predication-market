import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMarketStore } from '../store/marketStore';
import { useUserStore } from '../store/userStore';
import { OrderbookCard } from '../components/market/Orderbook';
import { OrderForm } from '../components/trading/OrderForm';
import { SplitMerge } from '../components/trading/SplitMerge';
import { Spinner } from '../components/ui/Spinner';

function parseOrderbook(value: any) {
  return typeof value === 'string' ? JSON.parse(value) : value || {};
}

export function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { markets, loading, fetchMarkets, selectMarket } = useMarketStore();
  const { fetchBalance, fetchPositions } = useUserStore();
  const market = markets.find((m) => m.id === id);

  useEffect(() => {
    selectMarket(id || null);
    if (markets.length === 0) fetchMarkets();
    fetchBalance();
    fetchPositions();
    return () => selectMarket(null);
  }, [id]);

  if (loading && !market) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="text-blue-500 w-8 h-8" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="p-4 text-center text-gray-500">
        Market not found.{' '}
        <button onClick={() => navigate('/')} className="text-blue-400 hover:underline">
          Back to markets
        </button>
      </div>
    );
  }

  const yesOB = parseOrderbook(market.yesOrderbook);
  const noOB = parseOrderbook(market.noOrderbook);
  const isResolved = market.status === 'RESOLVED';

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-gray-400 hover:text-white transition-colors mb-4"
      >
        ← All markets
      </button>

      {/* Hero */}
      <div className="bg-[#1a1a23] rounded-lg p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <span className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">
              {isResolved ? 'Resolved' : 'Prediction market'}
            </span>
            <h1 className="text-xl font-bold text-white mb-1">{market.title}</h1>
            <p className="text-sm text-gray-400">{market.description}</p>
          </div>
          {isResolved && (
            <div className="bg-purple-600/20 text-purple-400 px-3 py-1 rounded-lg text-sm font-medium">
              Resolved: {market.resolvedOutcome}
            </div>
          )}
        </div>
      </div>

      {/* Resolution criteria */}
      <div className="bg-[#1a1a23] rounded-lg p-4 mb-4">
        <span className="text-xs text-gray-500 uppercase tracking-wider">Resolution criteria</span>
        <p className="text-sm text-gray-300 mt-1">{market.resolutionDescription}</p>
      </div>

      {/* Trading layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Orderbooks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <OrderbookCard
              title="Yes Orderbook"
              asks={yesOB}
              bids={parseOrderbook({})}
            />
            <OrderbookCard
              title="No Orderbook"
              asks={noOB}
              bids={parseOrderbook({})}
            />
          </div>
        </div>

        <div className="space-y-4">
          <OrderForm />
          {!isResolved && <SplitMerge />}
        </div>
      </div>
    </div>
  );
}
