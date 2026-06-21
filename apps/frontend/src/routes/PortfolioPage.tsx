import { useEffect } from 'react';
import { useUserStore } from '../store/userStore';
import { BalanceCard } from '../components/portfolio/BalanceCard';
import { PositionsTable } from '../components/portfolio/PositionsTable';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';

export function PortfolioPage() {
  const { fetchBalance, fetchPositions, positions, loading } = useUserStore();

  useEffect(() => {
    fetchBalance();
    fetchPositions();
  }, [fetchBalance, fetchPositions]);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Portfolio</h1>

      <div className="mb-6">
        <BalanceCard />
      </div>

      <div className="bg-[#1a1a23] rounded-lg p-4">
        <h2 className="text-sm font-semibold text-white mb-4">Positions</h2>
        {loading ? <TableSkeleton rows={3} /> : <PositionsTable />}
      </div>
    </div>
  );
}
