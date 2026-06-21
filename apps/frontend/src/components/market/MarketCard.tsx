import { Link } from 'react-router-dom';
import type { Market, Orderbook } from '../../types';

function parseOrderbook(value: string | Orderbook): Orderbook {
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function bestAsk(ob: Orderbook) {
  const prices = Object.keys(ob).map(Number).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : null;
}

export function MarketCard({ market }: { market: Market }) {
  const yesOB = parseOrderbook(market.yesOrderbook);
  const noOB = parseOrderbook(market.noOrderbook);
  const yes = bestAsk(yesOB);
  const no = bestAsk(noOB);
  const isResolved = market.status === 'RESOLVED';

  return (
    <Link
      to={`/markets/${market.id}`}
      className="block bg-[#1a1a23] rounded-lg p-4 hover:bg-[#24243a] transition-colors border border-transparent hover:border-[#2d2d3d]"
    >
      <div className="flex items-start justify-between mb-2">
        {isResolved ? (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-600/20 text-purple-400">
            Resolved {market.resolvedOutcome}
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-600/20 text-green-400">
            Open
          </span>
        )}
        <span className="text-xs text-gray-500">
          {market.totalQty.toLocaleString()} shares
        </span>
      </div>
      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{market.title}</h3>
      <p className="text-xs text-gray-400 mb-3 line-clamp-1">{market.description}</p>
      <div className="flex gap-2">
        {yes !== null && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-600/10 text-green-400 border border-green-600/20">
            Yes {yes}¢
          </span>
        )}
        {no !== null && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-600/10 text-red-400 border border-red-600/20">
            No {no}¢
          </span>
        )}
        {yes === null && no === null && (
          <span className="text-xs text-gray-500">No liquidity</span>
        )}
      </div>
    </Link>
  );
}
