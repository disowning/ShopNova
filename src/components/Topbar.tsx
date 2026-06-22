import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronDown, Filter, LogOut, RotateCcw, Search, Settings, Store } from 'lucide-react';
import type { DashboardFilters } from '../lib/adminService';
import { getSessionUser } from '../lib/authService';

interface TopbarProps {
  withDetail: boolean;
  filters: DashboardFilters;
  onFiltersChange: (patch: Partial<DashboardFilters>) => void;
  onResetFilters: () => void;
  onOpenStore: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'paid', label: '已支付' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
];

const paymentMethodOptions = [
  { value: '', label: '全部支付方式' },
  { value: 'card', label: '银行卡' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'cod', label: '货到付款' },
];

export default function Topbar({
  withDetail,
  filters,
  onFiltersChange,
  onResetFilters,
  onOpenStore,
  onOpenSettings,
  onLogout,
}: TopbarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const sessionUser = getSessionUser();
  const displayName = sessionUser?.name?.trim() || '未登录';
  const displayEmail = sessionUser?.email || '未登录';
  const avatarText = displayName === '未登录' ? '?' : displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleDateFromChange = (dateFrom: string) => {
    onFiltersChange({
      dateFrom,
      dateTo: filters.dateTo && dateFrom && dateFrom > filters.dateTo ? dateFrom : filters.dateTo,
    });
  };

  const handleDateToChange = (dateTo: string) => {
    onFiltersChange({
      dateFrom: filters.dateFrom && dateTo && dateTo < filters.dateFrom ? dateTo : filters.dateFrom,
      dateTo,
    });
  };

  return (
    <header className={`h-14 bg-white border-b border-slate-200 flex items-center justify-end px-4 gap-2 fixed top-0 left-56 ${withDetail ? 'right-80' : 'right-0'} z-10 transition-all duration-200`}>
      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
        <Calendar size={13} className="text-blue-500" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={(event) => handleDateFromChange(event.target.value)}
          className="w-[118px] bg-transparent text-xs focus:outline-none"
          aria-label="起始日期"
        />
        <span className="text-slate-300">~</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={(event) => handleDateToChange(event.target.value)}
          className="w-[118px] bg-transparent text-xs focus:outline-none"
          aria-label="结束日期"
        />
      </div>

      <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-600">
        <Filter size={12} className="text-slate-400" />
        <select
          value={filters.paymentMethod}
          onChange={(event) => onFiltersChange({ paymentMethod: event.target.value })}
          className="w-[112px] bg-transparent text-xs focus:outline-none"
        >
          {paymentMethodOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <select
        value={filters.status}
        onChange={(event) => onFiltersChange({ status: event.target.value })}
        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
      >
        {statusOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(event) => onFiltersChange({ search: event.target.value })}
          placeholder="搜索订单号 / 邮箱 / 商品 / 收货人"
          className="w-60 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-xs placeholder-slate-400 transition-all focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
      </div>

      <button
        onClick={onResetFilters}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        title="重置筛选"
      >
        <RotateCcw size={13} />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setUserMenuOpen((open) => !open)}
          className="flex h-9 items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2 text-left shadow-sm transition-colors hover:bg-slate-50"
          aria-label="管理员菜单"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-bold text-white">
            {avatarText}
          </span>
          <span className="hidden max-w-[96px] truncate text-xs font-semibold text-slate-700 lg:block">
            {displayName}
          </span>
          <ChevronDown size={13} className="text-slate-400" />
        </button>
        {userMenuOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-60 overflow-hidden rounded-lg border border-slate-100 bg-white py-2 shadow-xl shadow-slate-200/60">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="truncate text-sm font-bold text-slate-900">{displayName}</div>
              <div className="truncate text-xs text-slate-400">{displayEmail}</div>
            </div>
            <button
              type="button"
              onClick={() => { setUserMenuOpen(false); onOpenStore(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Store size={14} className="text-slate-400" />
              返回商城
            </button>
            <button
              type="button"
              onClick={() => { setUserMenuOpen(false); onOpenSettings(); }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Settings size={14} className="text-slate-400" />
              系统设置
            </button>
            <button
              type="button"
              onClick={() => { setUserMenuOpen(false); onLogout(); }}
              className="flex w-full items-center gap-2.5 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
            >
              <LogOut size={14} className="text-red-400" />
              退出登录
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
