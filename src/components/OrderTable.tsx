import { useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { fetchOrders, statusLabel, paymentMethodLabel, type DashboardFilters, type OrderRow } from '../lib/adminService';

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  refunded: 'bg-red-50 text-red-600 border-red-200',
  unfulfilled: 'bg-slate-100 text-slate-600 border-slate-200',
  preparing: 'bg-blue-50 text-blue-700 border-blue-200',
  delivered: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

const PAYMENT_STYLES: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-800 border-red-300',
  refunded: 'bg-red-50 text-red-600 border-red-200',
};

interface Props {
  onSelect: (id: string) => void;
  selectedId: string | null;
  refreshKey?: number;
  filters: DashboardFilters;
}

export default function OrderTable({ onSelect, selectedId, refreshKey, filters }: Props) {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOrders({
      pageSize: 10,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      status: filters.status,
      paymentMethod: filters.paymentMethod,
      search: filters.search,
    })
      .then(({ rows }) => setOrders(rows))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters, refreshKey]);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-800">订单列表</div>
          <div className="text-[11px] text-slate-400 mt-0.5">当前筛选条件下最新 10 条订单</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-2">
          <div className="text-xs text-slate-400">暂无订单数据</div>
          <div className="text-[11px] text-slate-300">请先在用户端完成一笔结算</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {['订单编号', '商品', '邮箱', '支付方式', '订单金额', '发货物流', '订单状态', '支付状态', '下单时间', '操作'].map((col) => (
                  <th key={col} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const addr = order.shipping_address;
                const firstItem = order.items?.[0];
                const productName = firstItem?.product_name ?? '—';
                const email = addr?.email ?? '—';
                const payMethod = order.payment ? paymentMethodLabel(order.payment.payment_method) : '—';
                const payLast4 = order.payment?.card_last4;
                const payDisplay = payLast4 ? `${payMethod} **** ${payLast4}` : payMethod;
                const isSelected = order.id === selectedId;

                return (
                  <tr
                    key={order.id}
                    className={`border-b border-slate-50 hover:bg-blue-50/30 transition-colors duration-100 cursor-pointer ${isSelected ? 'bg-blue-50/50' : ''}`}
                    onClick={() => onSelect(order.id)}
                  >
                    <td className="px-4 py-3.5 font-mono font-semibold text-blue-700 whitespace-nowrap">{order.order_number}</td>
                    <td className="px-4 py-3.5 text-slate-700 font-medium whitespace-nowrap max-w-[140px] truncate">{productName}</td>
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">{email}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono whitespace-nowrap">{payDisplay}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-800 whitespace-nowrap">${order.total_amount.toFixed(2)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[order.shipping_status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {statusLabel(order.shipping_status || 'unfulfilled')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[order.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${PAYMENT_STYLES[order.payment_status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {statusLabel(order.payment_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">{new Date(order.created_at).toLocaleString('zh-CN')}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelect(order.id); }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold transition-colors hover:bg-blue-50 px-2 py-1 rounded-lg"
                      >
                        <Eye size={12} /><span>查看</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
