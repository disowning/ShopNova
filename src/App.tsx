import { useState, useCallback } from 'react';
import Sidebar, { type Page } from './components/Sidebar';
import Topbar from './components/Topbar';
import StatCards from './components/StatCards';
import TrendChart from './components/TrendChart';
import DonutChart from './components/DonutChart';
import OrderTable from './components/OrderTable';
import OrderDetail from './components/OrderDetail';
import OrderManagement from './pages/OrderManagement';
import ProductManagement from './pages/ProductManagement';
import CategoryManagement from './pages/CategoryManagement';
import TagManagement from './pages/TagManagement';
import TranslationManagement from './pages/TranslationManagement';
import CustomerManagement from './pages/CustomerManagement';
import PaymentInfo from './pages/PaymentInfo';
import RiskOrders from './pages/RiskOrders';
import DataAnalysis from './pages/DataAnalysis';
import Settings from './pages/Settings';
import StoreFront from './storefront/StoreFront';
import { getSessionUser, login as adminLogin } from './lib/authService';

const showDetailPanel: Page[] = ['dashboard', 'orders'];

// ─── Admin-guarded admin panel ────────────────────────────────────────────────

function AdminLoginGate({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await adminLogin({ email, password });
      if (user.role !== 'admin') throw new Error('此账号没有管理员权限');
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-black">S</span>
          </div>
          <h1 className="text-2xl font-black text-white">管理后台</h1>
          <p className="text-slate-400 text-sm mt-1">仅限管理员访问</p>
        </div>
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8">
          <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6">
            测试账号：<span className="font-mono">admin@test.com / 123456</span>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="text-sm text-red-400 bg-red-900/20 border border-red-700/30 rounded-xl px-4 py-3">{error}</div>}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="管理员邮箱"
              className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="密码"
              className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />
            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? '验证中…' : '进入管理后台'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ onSelect, selectedId, refreshKey }: { onSelect: (id: string) => void; selectedId: string | null; refreshKey: number }) {
  return (
    <div className="space-y-4">
      <StatCards key={refreshKey} />
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3"><TrendChart key={refreshKey} /></div>
        <div className="col-span-2"><DonutChart key={refreshKey} /></div>
      </div>
      <OrderTable onSelect={onSelect} selectedId={selectedId} refreshKey={refreshKey} />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<'admin' | 'store'>('store');
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Admin auth: check session for admin role
  const [adminAuthed, setAdminAuthed] = useState(() => {
    const u = getSessionUser();
    return u?.role === 'admin';
  });

  const withDetail = showDetailPanel.includes(page) && selectedOrderId !== null;

  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId((prev) => (prev === id ? null : id));
  }, []);

  const handleCloseDetail = useCallback(() => setSelectedOrderId(null), []);

  const handleStatusChanged = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handlePageChange = useCallback((p: Page) => {
    setPage(p);
    if (!showDetailPanel.includes(p)) setSelectedOrderId(null);
  }, []);

  const handleAdminLogin = useCallback(() => {
    setAdminAuthed(true);
  }, []);

  return (
    <>
      {/* Mode toggle */}
      <div className="fixed bottom-6 right-6 z-[100] flex items-center bg-slate-900 rounded-full p-1 shadow-xl border border-white/10">
        <button
          onClick={() => setMode('store')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'store' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          用户端
        </button>
        <button
          onClick={() => setMode('admin')}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${mode === 'admin' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          管理后台
        </button>
      </div>

      {mode === 'store' ? (
        <StoreFront />
      ) : !adminAuthed ? (
        <AdminLoginGate onLogin={handleAdminLogin} />
      ) : (
        <div className="min-h-screen bg-slate-50 font-sans">
          <Sidebar currentPage={page} onNavigate={handlePageChange} />
          <Topbar withDetail={withDetail} />

          {withDetail && (
            <OrderDetail
              orderId={selectedOrderId}
              onClose={handleCloseDetail}
              onStatusChanged={handleStatusChanged}
            />
          )}

          <main className={`${withDetail ? 'mr-80' : ''} ml-56 pt-14 min-h-screen transition-all duration-200`}>
            <div className="px-5 py-5">
              {page === 'dashboard' && (
                <Dashboard onSelect={handleSelectOrder} selectedId={selectedOrderId} refreshKey={refreshKey} />
              )}
              {page === 'orders' && (
                <OrderManagement
                  onSelect={handleSelectOrder}
                  selectedId={selectedOrderId}
                  refreshKey={refreshKey}
                />
              )}
              {page === 'products' && <ProductManagement />}
              {page === 'categories' && <CategoryManagement />}
              {page === 'tags' && <TagManagement />}
              {page === 'translations' && <TranslationManagement />}
              {page === 'customers' && <CustomerManagement />}
              {page === 'payments' && <PaymentInfo />}
              {page === 'risk' && <RiskOrders />}
              {page === 'analytics' && <DataAnalysis />}
              {page === 'settings' && <Settings />}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
