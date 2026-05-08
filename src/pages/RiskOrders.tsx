import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ShieldAlert, ShieldCheck, Eye, CheckCircle, XCircle, Flag, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DBRiskOrder {
  id: string;
  order_id: string;
  user_email: string;
  amount: number;
  country: string;
  risk_score: number;
  risk_level: string;
  flags: string[];
  ip_address: string;
  device_info: string;
  review_status: string;
  created_at: string;
}

const riskLevelStyle: Record<string, { badge: string; bar: string; text: string }> = {
  '极高': { badge: 'bg-red-100 text-red-800 border-red-300', bar: 'bg-red-500', text: 'text-red-700' },
  '高': { badge: 'bg-orange-50 text-orange-700 border-orange-200', bar: 'bg-orange-500', text: 'text-orange-700' },
  '中': { badge: 'bg-amber-50 text-amber-700 border-amber-200', bar: 'bg-amber-400', text: 'text-amber-700' },
  '低': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', text: 'text-emerald-700' },
};
const statusStyle: Record<string, string> = {
  '待审核': 'bg-amber-50 text-amber-700 border-amber-200',
  '已拒绝': 'bg-red-50 text-red-700 border-red-200',
  '已通过': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const PAGE_SIZE = 15;

export default function RiskOrders() {
  const [riskOrders, setRiskOrders] = useState<DBRiskOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState({ total: 0, pending: 0, rejected: 0, passed: 0, avgScore: 0 });

  const fetchRiskOrders = useCallback(async () => {
    setLoading(true);
    const { data, count } = await supabase
      .from('risk_orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setRiskOrders((data ?? []) as DBRiskOrder[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchRiskOrders(); }, [fetchRiskOrders]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('risk_orders')
        .select('review_status, risk_score');
      if (data && data.length > 0) {
        setStats({
          total: data.length,
          pending: data.filter((r) => r.review_status === '待审核').length,
          rejected: data.filter((r) => r.review_status === '已拒绝').length,
          passed: data.filter((r) => r.review_status === '已通过').length,
          avgScore: Math.round(data.reduce((a, r) => a + r.risk_score, 0) / data.length),
        });
      } else {
        setStats({ total: 0, pending: 0, rejected: 0, passed: 0, avgScore: 0 });
      }
    })();
  }, [riskOrders]);

  const handleReview = async (id: string, status: '已通过' | '已拒绝') => {
    await supabase
      .from('risk_orders')
      .update({ review_status: status, reviewed_at: new Date().toISOString() })
      .eq('id', id);
    fetchRiskOrders();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function formatTime(t: string) {
    return new Date(t).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">风险订单</h2>
          <p className="text-xs text-slate-400 mt-0.5">人工审核高风险交易，防止欺诈与盗刷</p>
        </div>
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg font-semibold">
              <AlertTriangle size={12} /> {stats.pending} 条待审核
            </span>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '风险订单总数', value: stats.total, sub: '触发风控', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
          { label: '待审核', value: stats.pending, sub: '需立即处理', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '已拒绝', value: stats.rejected, sub: '已拦截拒绝', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: '已通过', value: stats.passed, sub: '人工核验通过', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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

      {/* Risk score gauge */}
      {stats.total > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold text-slate-800">平均风险分</span>
            <span className="text-2xl font-black text-orange-600">{stats.avgScore}</span>
          </div>
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500 rounded-full relative">
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-orange-500 rounded-full shadow"
              style={{ left: `calc(${stats.avgScore}% - 6px)` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>0 低风险</span><span>50</span><span>100 极高风险</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {['订单编号', '邮箱', '金额', '来源国家', '风险评分', '风险等级', '触发标签', 'IP / 设备', '时间', '状态', '操作'].map((c) => (
                  <th key={c} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(11)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : riskOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    <ShieldCheck size={28} className="mx-auto mb-2 text-slate-200" />
                    暂无风险订单
                  </td>
                </tr>
              ) : (
                riskOrders.map((r) => {
                  const lvl = riskLevelStyle[r.risk_level] || riskLevelStyle['低'];
                  const flags = Array.isArray(r.flags) ? r.flags : [];
                  return (
                    <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">{r.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{r.user_email}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 whitespace-nowrap">¥{Number(r.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.country}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                            <div className={`h-1.5 ${lvl.bar} rounded-full`} style={{ width: `${r.risk_score}%` }}></div>
                          </div>
                          <span className={`font-bold ${lvl.text}`}>{r.risk_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${lvl.badge}`}>{r.risk_level}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {flags.map((f) => (
                            <span key={f} className="flex items-center gap-0.5 bg-red-50 text-red-600 text-[9px] font-semibold px-1.5 py-0.5 rounded border border-red-100">
                              <Flag size={7} />{f}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-500">{r.ip_address || '—'}</div>
                        <div className="text-[10px] text-slate-400">{r.device_info || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-[10px]">{formatTime(r.created_at)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusStyle[r.review_status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{r.review_status}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors" title="查看详情"><Eye size={12} /></button>
                          {r.review_status === '待审核' && (
                            <>
                              <button onClick={() => handleReview(r.id, '已通过')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors" title="通过"><CheckCircle size={12} /></button>
                              <button onClick={() => handleReview(r.id, '已拒绝')} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500 transition-colors" title="拒绝"><XCircle size={12} /></button>
                            </>
                          )}
                        </div>
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
            <span className="text-xs text-slate-400">共 {total} 条风险订单</span>
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

      {/* Risk tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-800 mb-1">风控说明</div>
            <div className="text-xs text-amber-700 leading-relaxed">
              风险评分基于：IP 地理位置、设备指纹、邮箱信誉、历史行为、支付失败次数等多维度实时计算。评分 &ge; 80 需人工审核；
              评分 &ge; 90 系统自动拦截。所有支付信息均已脱敏处理，CVV 不存储。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
