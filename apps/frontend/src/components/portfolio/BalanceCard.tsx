import { useUserStore } from '../../store/userStore';
import { useState } from 'react';
import { api } from '../../services/api';
import { toast } from '../ui/Toast';

export function BalanceCard() {
  const { balance, usdcBalance, fetchBalance } = useUserStore();
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);

  const handleOnramp = async () => {
    setLoading(true);
    try {
      await api.post('/onramp', { amount: parseFloat(amount) });
      toast(`Deposited $${amount}`);
      await fetchBalance();
    } catch (err: any) {
      toast(err.message || 'Deposit failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1a1a23] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Balance</h3>
      <div className="text-3xl font-bold text-white mb-1">
        ${(balance / 100).toFixed(2)}
      </div>
      <p className="text-xs text-gray-400 mb-4">
        USDC: ${(usdcBalance / 100).toFixed(2)}
      </p>

      <div className="space-y-2">
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-[#24243a] rounded-lg px-3 py-2 text-sm text-white border border-[#2d2d3d] focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleOnramp}
          disabled={loading}
          className="w-full py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Deposit USD'}
        </button>
      </div>
    </div>
  );
}
