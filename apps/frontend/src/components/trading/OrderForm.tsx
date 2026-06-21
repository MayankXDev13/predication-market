import { useState, type FormEvent } from 'react';
import { api } from '../../services/api';
import { toast } from '../ui/Toast';
import { useMarketStore } from '../../store/marketStore';
import { useUserStore } from '../../store/userStore';
import { OutcomeToggle } from './OutcomeToggle';

export function OrderForm() {
  const { markets, selectedMarketId } = useMarketStore();
  const market = markets.find((m) => m.id === selectedMarketId);
  const { fetchBalance, fetchPositions } = useUserStore();

  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState('0.50');
  const [qty, setQty] = useState('10');
  const [loading, setLoading] = useState(false);

  if (!market) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(Number(price) * 100);
    const quantity = Math.floor(Number(qty) || 0);

    if (priceCents < 1 || priceCents > 99 || quantity < 1) {
      toast('Enter a valid price (1-99¢) and quantity', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/order', {
        marketId: market.id,
        side,
        type,
        price: priceCents,
        qty: quantity,
      });
      toast(`Order placed: ${type} ${quantity} ${side.toUpperCase()} at ${priceCents}¢`);
      await Promise.all([fetchBalance(), fetchPositions()]);
    } catch (err: any) {
      toast(err.message || 'Order failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const priceCents = Math.round(Number(price) * 100);
  const quantity = Math.floor(Number(qty) || 0);
  const total = (priceCents * quantity) / 100;

  return (
    <div className="bg-[#1a1a23] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Trade</span>
        <span className="text-xs font-medium text-white">
          {type === 'buy' ? 'Buy' : 'Sell'} {side.toUpperCase()}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Buy/Sell toggle */}
        <div className="grid grid-cols-2 gap-1 bg-[#24243a] rounded-lg p-0.5">
          <button
            type="button"
            className={`py-1.5 rounded-md text-sm font-medium transition-colors ${
              type === 'buy' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
            onClick={() => setType('buy')}
          >
            Buy
          </button>
          <button
            type="button"
            className={`py-1.5 rounded-md text-sm font-medium transition-colors ${
              type === 'sell' ? 'bg-blue-600 text-white' : 'text-gray-400'
            }`}
            onClick={() => setType('sell')}
          >
            Sell
          </button>
        </div>

        <OutcomeToggle side={side} onChange={setSide} />

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Limit price</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            max="0.99"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-[#24243a] rounded-lg px-3 py-2 text-sm text-white border border-[#2d2d3d] focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">Quantity</label>
          <input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full bg-[#24243a] rounded-lg px-3 py-2 text-sm text-white border border-[#2d2d3d] focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div className="bg-[#24243a] rounded-lg p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Order value</span>
            <span className="text-white font-medium">${total.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
            loading
              ? 'bg-gray-600 text-gray-400'
              : side === 'yes'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {loading ? 'Processing...' : `${type === 'buy' ? 'Buy' : 'Sell'} ${side.toUpperCase()}`}
        </button>
      </form>
    </div>
  );
}
