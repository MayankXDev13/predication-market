import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/layout/Header';
import { ToastContainer } from './components/ui/Toast';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { MarketsPage } from './routes/MarketsPage';
import { MarketPage } from './routes/MarketPage';
import { PortfolioPage } from './routes/PortfolioPage';
import { HistoryPage } from './routes/HistoryPage';
import { DepositPage } from './routes/DepositPage';

function AuthScreen({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center">
      <div className="bg-[#1a1a23] rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">PredMarket</h1>
        <p className="text-sm text-gray-400 mb-6">
          Sign in with your Solflare wallet to access the prediction market
        </p>
        {window.solflare ? (
          <button
            onClick={onSignIn}
            className="w-full py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Sign in with Solflare
          </button>
        ) : (
          <p className="text-sm text-yellow-400">
            Please install the Solflare wallet extension
          </p>
        )}
      </div>
    </div>
  );
}

function AppShell() {
  return (
    <>
      <Header />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<MarketsPage />} />
          <Route path="/markets/:id" element={<MarketPage />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/deposit" element={<DepositPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
      <ToastContainer />
    </>
  );
}

export default function App() {
  const { isAuthenticated, loading, signIn } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? <AppShell /> : <AuthScreen onSignIn={signIn} />}
    </BrowserRouter>
  );
}
