import { useState, useEffect, useCallback } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Shield, Eye, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DBPayment {
  id: string;
  order_id: string;
  payment_method: string;
  status: string;
  amount: number;
  card_last4: string;
  card_holder_name: string;
  transaction_id: string;
  created_at: string;
  order_number?: string;
  user_email?: string;
}

const statusMap: Record<string, string> = {
  success: '成功',
  pending: '处理中',
  refunded: '已退款',
  failed: '失败',
};

const statusStyle: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-blue-50 text-blue-700 border-blue-200',
  refunded: 'bg-amber-50 text-amber-700 border-amber-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
};

const StatusIcon: Record<string, React.ElementType> = {
  success: CheckCircle,
  pending: Clock,
  refunded: CreditCard,
  failed: XCircle,
};

const PAGE_SIZE = 15;

export default function PaymentInfo() {
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState({ totalVol: 0, successVol: 0, successRate: 0, failedCount: 0 });

  const fetchPayments = useCallback(async () => {
    setLoading(true);

    const { data, count } = await supabase
      .from('payments')
      .select('id, order_id, payment_method, status, amount, card_last4, card_holder_name, transaction_id, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const paymentRows = (data ?? []) as DBPayment[];

    // Enrich with order_number and user email
    if (paymentRows.length > 0) {
      const orderIds = [...new Set(paymentRows.map((p) => p.order_id).filter(Boolean))];
      if (orderIds.length > 0) {
        const { data: orders } = await supabase
          .from('orders')
          .select('id, order_number, user_id')
          .in('id', orderIds);
        if (orders) {
          const orderMap = new Map(orders.map((o) => [o.id, o]));
          const userIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))];
          let userMap = new Map<string, string>();
          if (userIds.length > 0) {
            const { data: users } = await supabase
              .from('users')
              .select('id, email')
              .in('id', userIds);
            if (users) {
              userMap = new Map(users.map((u) => [u.id, u.email]));
            }
          }
          paymentRows.forEach((p) => {
            const order = orderMap.get(p.order_id);
            if (order) {
              p.order_number = order.order_number;
              p.user_email = userMap.get(order.user_id) || '';
            }
          });
        }
      }
    }

    setPayments(paymentRows);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // Fetch aggregate stats
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('payments')
        .select('status, amount');
      if (data) {
        const totalVol = data.reduce((a, p) => a + Number(p.amount), 0);
        const successItems = data.filter((p) => p.status === 'success');
        const successVol = successItems.reduce((a, p) => a + Number(p.amount), 0);
        const successRate = data.length > 0 ? (successItems.length / data.length) * 100 : 0;
        const failedCount = data.filter((p) => p.status === 'failed' || p.status === 'refunded').length;
        setStats({ totalVol, successVol, successRate, failedCount });
      }
    })();
  }, [payments]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function formatTime(t: string) {
    const d = new Date(t);
    return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function maskCard(last4: string) {
    return last4 ? `**** **** **** ${last4}` : '—';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">支付信息</h2>
          <p className="text-xs text-slate-400 mt-0.5">查看所有支付流水、手续费与退款记录</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs text-slate-600 border border-slate-200 bg-white px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={12} /> 导出流水
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '交易总额', value: `¥${stats.totalVol.toLocaleString()}`, sub: '全部支付流水', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '成功金额', value: `¥${stats.successVol.toLocaleString()}`, sub: `成功率 ${stats.successRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '交易笔数', value: total, sub: '全部支付记录', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '失败/退款', value: stats.failedCount, sub: '需人工复查', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
              <div className="text-[10px] text-slate-400">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">支付流水记录</span>
          <span className="text-xs text-slate-400">共 {total} 笔</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {['交易号', '关联订单', '客户', '支付方式', '卡号', '金额', '状态', '时间', '操作'].map((c) => (
                  <th key={c} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(9)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <CreditCard size={28} className="mx-auto mb-2 text-slate-200" />
                    暂无支付记录
                  </td>
                </tr>
              ) : (
                payments.map((p) => {
                  const SI = StatusIcon[p.status] || CheckCircle;
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] text-blue-700 whitespace-nowrap">{p.transaction_id || p.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">{p.order_number || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{p.user_email || p.card_holder_name || '—'}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap capitalize">{p.payment_method}</td>
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">{maskCard(p.card_last4)}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">¥{Number(p.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyle[p.status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          <SI size={10} />
                          {statusMap[p.status] || p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatTime(p.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                          <Eye size={12} /> 详情
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">共 {total} 笔支付</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold ${i === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
