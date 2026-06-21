import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { toast } from '../components/ui/Toast';
import { useUserStore } from '../store/userStore';

export function DepositPage() {
  const { usdcBalance, fetchBalance } = useUserStore();
  const [depositInfo, setDepositInfo] = useState<{ address: string; memo: string } | null>(null);
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDepositAddress();
    fetchBalance();
  }, []);

  const fetchDepositAddress = async () => {
    try {
      const data = await api.get<{ address: string; memo: string }>('/usdc/deposit-address');
      setDepositInfo(data);
    } catch {
      // USDC not configured yet
    }
  };

  const handleWithdraw = async () => {
    setLoading(true);
    try {
      const data = await api.post<{ transactionId: string; signature: string }>('/usdc/withdraw', {
        amount: Math.round(parseFloat(amount) * 100),
        destinationAddress: 'user_wallet_address',
      });
      toast(`Withdrawn! Tx: ${data.signature.slice(0, 16)}...`);
      await fetchBalance();
    } catch (err: any) {
      toast(err.message || 'Withdrawal failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Deposit / Withdraw</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deposit */}
        <div className="bg-[#1a1a23] rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Deposit USDC</h2>
          {depositInfo ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Network</label>
                <p className="text-sm text-white bg-[#24243a] rounded-lg px-3 py-2">
                  Solana Devnet
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Deposit Address</label>
                <p className="text-xs text-white bg-[#24243a] rounded-lg px-3 py-2 break-all font-mono">
                  {depositInfo.address}
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Memo (required)</label>
                <p className="text-xs text-white bg-[#24243a] rounded-lg px-3 py-2 font-mono">
                  {depositInfo.memo}
                </p>
              </div>
              <p className="text-xs text-gray-500">
                Send USDC to the address above with the memo to deposit.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              USDC deposits not configured. Use Onramp to add USD balance.
            </p>
          )}
        </div>

        {/* Withdraw */}
        <div className="bg-[#1a1a23] rounded-lg p-4">
          <h2 className="text-sm font-semibold text-white mb-4">Withdraw USDC</h2>
          <p className="text-xs text-gray-400 mb-3">
            Available: ${(usdcBalance / 100).toFixed(2)} USDC
          </p>
          <div className="space-y-3">
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (USD)"
              className="w-full bg-[#24243a] rounded-lg px-3 py-2 text-sm text-white border border-[#2d2d3d] focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleWithdraw}
              disabled={loading || usdcBalance <= 0}
              className="w-full py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Withdraw USDC'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
