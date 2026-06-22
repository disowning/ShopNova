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
import MediaManagement from './pages/MediaManagement';
import ContentManagement from './pages/ContentManagement';
import SiteConfig from './pages/SiteConfig';
import TranslationManagement from './pages/TranslationManagement';
import CustomerManagement from './pages/CustomerManagement';
import PaymentInfo from './pages/PaymentInfo';
import RiskOrders from './pages/RiskOrders';
import DataAnalysis from './pages/DataAnalysis';
import Settings from './pages/Settings';
import StoreFront from './storefront/StoreFront';
import { getSessionUser, login as adminLogin, logout as logoutService } from './lib/authService';
import type { DashboardFilters } from './lib/adminService';

const showDetailPanel: Page[] = ['dashboard', 'orders'];

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDefaultDashboardFilters(): DashboardFilters {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    dateFrom: formatDateInput(start),
    dateTo: formatDateInput(end),
    status: '',
    paymentMethod: '',
    search: '',
  };
}

// ─── Admin-guarded admin panel ────────────────────────────────────────────────

function AdminLoginGate({ onLogin, onBack }: { onLogin: () => void; onBack: () => void }) {
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
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-slate-500 transition-colors hover:text-slate-300"
          >
            返回商城
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({
  onSelect,
  selectedId,
  refreshKey,
  filters,
}: {
  onSelect: (id: string) => void;
  selectedId: string | null;
  refreshKey: number;
  filters: DashboardFilters;
}) {
  return (
    <div className="space-y-4">
      <StatCards key={refreshKey} filters={filters} />
      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-3"><TrendChart key={refreshKey} filters={filters} /></div>
        <div className="col-span-2"><DonutChart key={refreshKey} filters={filters} /></div>
      </div>
      <OrderTable onSelect={onSelect} selectedId={selectedId} refreshKey={refreshKey} filters={filters} />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const isVisualEditorFrame = new URLSearchParams(window.location.search).get('visual-editor') === '1';
  const [mode, setMode] = useState<'admin' | 'store'>('store');
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilters>(() => getDefaultDashboardFilters());

  // Admin auth: check session for admin role
  const [adminAuthed, setAdminAuthed] = useState(() => {
    const u = getSessionUser();
    return u?.role === 'admin';
  });

  const withDetail = showDetailPanel.includes(page) && selectedOrderId !== null;

  const handleSelectOrder = useCallback((id: string) => {
    setSelectedOrderId((prev) => (prev === id ? null : id));
  }, []);

  const handleOpenCustomerOrder = useCallback((id: string) => {
    setPage('orders');
    setSelectedOrderId(id);
  }, []);

  const handleOpenRiskOrder = useCallback((id: string) => {
    setPage('orders');
    setSelectedOrderId(id);
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

  const handleOpenAdmin = useCallback(() => {
    const u = getSessionUser();
    setAdminAuthed(u?.role === 'admin');
    setMode('admin');
  }, []);

  const handleOpenStore = useCallback(() => {
    setMode('store');
  }, []);

  const handleOpenSettings = useCallback(() => {
    setPage('settings');
    setSelectedOrderId(null);
  }, []);

  const handleAdminLogout = useCallback(() => {
    logoutService();
    setAdminAuthed(false);
    setSelectedOrderId(null);
    setMode('store');
  }, []);

  const handleDashboardFilterChange = useCallback((patch: Partial<DashboardFilters>) => {
    setDashboardFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleDashboardFilterReset = useCallback(() => {
    setDashboardFilters(getDefaultDashboardFilters());
  }, []);

  if (isVisualEditorFrame) {
    return <StoreFront editorMode />;
  }

  return (
    <>
      {mode === 'store' ? (
        <StoreFront onOpenAdmin={handleOpenAdmin} />
      ) : !adminAuthed ? (
        <AdminLoginGate onLogin={handleAdminLogin} onBack={handleOpenStore} />
      ) : (
        <div className="min-h-screen bg-slate-50 font-sans">
          <Sidebar currentPage={page} onNavigate={handlePageChange} />
          <Topbar
            withDetail={withDetail}
            filters={dashboardFilters}
            onFiltersChange={handleDashboardFilterChange}
            onResetFilters={handleDashboardFilterReset}
            onOpenStore={handleOpenStore}
            onOpenSettings={handleOpenSettings}
            onLogout={handleAdminLogout}
          />

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
                <Dashboard
                  onSelect={handleSelectOrder}
                  selectedId={selectedOrderId}
                  refreshKey={refreshKey}
                  filters={dashboardFilters}
                />
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
              {page === 'media' && <MediaManagement />}
              {page === 'content' && <ContentManagement onNavigate={handlePageChange} />}
              {page === 'site' && <SiteConfig />}
              {page === 'translations' && <TranslationManagement />}
              {page === 'customers' && <CustomerManagement onSelectOrder={handleOpenCustomerOrder} />}
              {page === 'payments' && <PaymentInfo />}
              {page === 'risk' && <RiskOrders onSelectOrder={handleOpenRiskOrder} />}
              {page === 'analytics' && <DataAnalysis />}
              {page === 'settings' && <Settings />}
            </div>
          </main>
        </div>
      )}
    </>
  );
}
