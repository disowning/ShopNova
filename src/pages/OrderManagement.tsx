import { useState, useEffect, useCallback } from 'react';
import { Eye, Download, RefreshCw, ChevronLeft, ChevronRight, Search, AlertCircle } from 'lucide-react';
import {
  fetchOrders,
  statusLabel,
  paymentMethodLabel,
  type OrderRow,
} from '../lib/adminService';

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  refunded: 'bg-red-50 text-red-600 border-red-200',
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-800 border-red-300',
  refunded: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'paid', label: '已支付' },
  { value: 'pending', label: '待处理' },
  { value: 'processing', label: '处理中' },
  { value: 'shipped', label: '已发货' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: '', label: '全部支付' },
  { value: 'paid', label: '已支付' },
  { value: 'pending', label: '待支付' },
  { value: 'failed', label: '支付失败' },
  { value: 'refunded', label: '已退款' },
];

const PAGE_SIZE = 15;

interface Props {
  onSelect: (id: string) => void;
  selectedId: string | null;
  refreshKey?: number;
}

export default function OrderManagement({ onSelect, selectedId, refreshKey }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const { rows, total: t } = await fetchOrders({
        search,
        status: statusFilter,
        paymentStatus: paymentFilter,
        dateFrom,
        dateTo,
        page: p,
        pageSize: PAGE_SIZE,
      });
      setOrders(rows);
      setTotal(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => { setPage(1); }, [search, statusFilter, paymentFilter, dateFrom, dateTo]);
  useEffect(() => { load(page); }, [load, page, refreshKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">订单管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理所有用户端订单，支持筛选、搜索与状态更新</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(page)} className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> 刷新
          </button>
          <button className="flex items-center gap-1.5 text-xs text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Download size={12} /> 导出订单
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm space-y-3">
        {/* Row 1: search + status pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索订单号..."
              className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${statusFilter === s.value ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        {/* Row 2: payment status + date range */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            {PAYMENT_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">起始日期</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-slate-400 hover:text-red-500 px-1">清除</button>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            共 <span className="font-bold text-slate-700">{total}</span> 条订单
            {loading && <span className="ml-2 text-blue-500">加载中…</span>}
          </span>
        </div>

        {!loading && orders.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <div className="text-xs text-slate-400">没有找到匹配的订单</div>
            <div className="text-[11px] text-slate-300">请尝试调整筛选条件，或先在用户端完成结算</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100">
                  <th className="w-8 px-4 py-3"><input type="checkbox" className="rounded border-slate-300" /></th>
                  {['订单编号', '商品', '邮箱', '支付方式', '订单金额', '订单状态', '支付状态', '下单时间', '操作'].map((c) => (
                    <th key={c} className="text-left px-3 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const addr = o.shipping_address;
                  const email = addr?.email ?? '—';
                  const firstItem = o.items?.[0];
                  const productName = firstItem?.product_name ?? '—';
                  const payMethod = o.payment ? paymentMethodLabel(o.payment.payment_method) : '—';
                  const payLast4 = o.payment?.card_last4;
                  const payDisplay = payLast4 ? `${payMethod} **** ${payLast4}` : payMethod;
                  const isSelected = o.id === selectedId;

                  return (
                    <tr
                      key={o.id}
                      className={`border-b border-slate-50 hover:bg-blue-50/20 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50/40' : ''}`}
                      onClick={() => onSelect(o.id)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300" />
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">{o.order_number}</td>
                      <td className="px-3 py-3 text-slate-700 font-medium whitespace-nowrap max-w-[140px] truncate">{productName}</td>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{email}</td>
                      <td className="px-3 py-3 text-slate-500 font-mono whitespace-nowrap text-[10px]">{payDisplay}</td>
                      <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">¥{o.total_amount.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[o.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PAYMENT_STYLES[o.payment_status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {statusLabel(o.payment_status)}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{new Date(o.created_at).toLocaleString('zh-CN')}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => { e.stopPropagation(); onSelect(o.id); }}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          <Eye size={12} /> 查看
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">第 {page} / {totalPages} 页，共 {total} 条</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={13} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
              return (
                <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-medium border transition-colors ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{p}</button>
              );
            })}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
