import { useUserStore } from '../../store/userStore';

export function BalanceCard() {
  const { balance, usdcBalance } = useUserStore();

  return (
    <div className="bg-[#1a1a23] rounded-lg p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Balance</h3>
      <div className="text-3xl font-bold text-white mb-1">
        ${(balance / 100).toFixed(2)}
      </div>
      <p className="text-xs text-gray-400">
        USDC: ${(usdcBalance / 100).toFixed(2)}
      </p>
    </div>
  );
}
