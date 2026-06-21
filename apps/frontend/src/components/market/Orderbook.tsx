import type { Orderbook as OrderbookType } from '../../types';

interface Level {
  price: number;
  availableQty: number;
  total: number;
}

function toLevels(ob: OrderbookType): Level[] {
  return Object.entries(ob).map(([price, data]) => ({
    price: Number(price),
    availableQty: data.availableQty,
    total: (Number(price) / 100) * data.availableQty,
  }));
}

export function OrderbookCard({
  title,
  asks,
  bids,
}: {
  title: string;
  asks: OrderbookType;
  bids: OrderbookType;
}) {
  const askLevels = toLevels(asks).sort((a, b) => a.price - b.price);
  const bidLevels = toLevels(bids).sort((a, b) => b.price - a.price);
  const bestAsk = askLevels[0]?.price ?? null;
  const bestBid = bidLevels[0]?.price ?? null;
  const spread = bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null;

  return (
    <div className="bg-[#1a1a23] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-400">
            Bid: {bestBid !== null ? `${bestBid}¢` : '—'} · Ask:{' '}
            {bestAsk !== null ? `${bestAsk}¢` : '—'}
          </p>
        </div>
        <span className="text-xs text-gray-500 bg-[#24243a] px-2 py-0.5 rounded">
          Spread: {spread !== null ? `${spread}¢` : '—'}
        </span>
      </div>

      <div className="grid grid-cols-3 text-xs text-gray-500 mb-1 pb-1 border-b border-[#2d2d3d]">
        <span>Price</span>
        <span className="text-right">Shares</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks */}
      <div className="space-y-[1px] mb-2">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Asks</div>
        {askLevels.length === 0 ? (
          <div className="text-xs text-gray-500 py-1">No asks</div>
        ) : (
          askLevels.slice(0, 8).map((level) => (
            <div key={`ask-${level.price}`} className="grid grid-cols-3 text-xs text-red-400">
              <span>${(level.price / 100).toFixed(2)}</span>
              <span className="text-right">{level.availableQty.toLocaleString()}</span>
              <span className="text-right">${level.total.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>

      {/* Spread */}
      <div className="grid grid-cols-3 text-xs text-gray-400 border-y border-[#2d2d3d] py-1 mb-2">
        <span>Spread</span>
        <span className="text-right col-span-2 font-medium">
          {spread !== null ? `${spread}¢` : '—'}
        </span>
      </div>

      {/* Bids */}
      <div className="space-y-[1px]">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Bids</div>
        {bidLevels.length === 0 ? (
          <div className="text-xs text-gray-500 py-1">No bids</div>
        ) : (
          bidLevels.slice(0, 8).map((level) => (
            <div key={`bid-${level.price}`} className="grid grid-cols-3 text-xs text-green-400">
              <span>${(level.price / 100).toFixed(2)}</span>
              <span className="text-right">{level.availableQty.toLocaleString()}</span>
              <span className="text-right">${level.total.toFixed(2)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
