import { Link, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';

const navItems = [
  { path: '/', label: 'Markets' },
  { path: '/portfolio', label: 'Portfolio' },
  { path: '/history', label: 'History' },
  { path: '/deposit', label: 'Deposit' },
];

export function Header() {
  const location = useLocation();
  const { balance } = useUserStore();
  const balanceInDollars = (balance / 100).toFixed(2);

  return (
    <header className="border-b border-[#2d2d3d] bg-[#0b0b0f]">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="text-lg font-bold text-white">
            PredMarket
          </Link>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-[#24243a] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a23] px-3 py-1.5 rounded-lg text-sm">
            <span className="text-gray-400">Balance: </span>
            <span className="text-white font-medium">${balanceInDollars}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
