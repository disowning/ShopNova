import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, PieChart, ShoppingBag, DollarSign } from 'lucide-react';
import { fetchAnalyticsSummary, type DailyOrder, type MonthlyData, type TopProduct } from '../lib/analyticsAdminService';

function BarChartSVG({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) return <div className="h-[140px] flex items-center justify-center text-xs text-slate-400">暂无数据</div>;
  const maxRev = Math.max(...data.map(m => m.revenue), 1);
  const chartH = 100;
  const barW = 22;
  const gap = 14;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg viewBox={`0 0 ${totalW + 20} ${chartH + 24}`} className="w-full" style={{ height: 140 }}>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1="10" y1={chartH * (1 - t)} x2={totalW + 10} y2={chartH * (1 - t)} stroke="#f1f5f9" strokeWidth="0.8" />
      ))}
      {data.map((m, i) => {
        const h = (m.revenue / maxRev) * chartH;
        const x = 10 + i * (barW + gap);
        const y = chartH - h;
        const isCurrent = i === data.length - 1;
        return (
          <g key={m.month}>
            <defs>
              <linearGradient id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isCurrent ? '#3b82f6' : '#93c5fd'} stopOpacity="1" />
                <stop offset="100%" stopColor={isCurrent ? '#1d4ed8' : '#60a5fa'} stopOpacity="0.7" />
              </linearGradient>
            </defs>
            <rect x={x} y={y} width={barW} height={Math.max(h, 1)} rx="3" fill={`url(#barGrad${i})`} />
            <text x={x + barW / 2} y={chartH + 12} textAnchor="middle" fontSize="7" fill="#94a3b8">{m.month}</text>
            {isCurrent && m.revenue > 0 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="6.5" fill="#2563eb" fontWeight="bold">
                {m.revenue >= 10000 ? `$${(m.revenue / 10000).toFixed(1)}万` : `$${m.revenue}`}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function MiniTrend({ data }: { data: DailyOrder[] }) {
  if (data.length < 2) return <div className="h-[70px] flex items-center justify-center text-xs text-slate-400">数据不足</div>;
  const maxV = Math.max(...data.map(d => d.count), 1);
  const minV = Math.min(...data.map(d => d.count));
  const W = 100; const H = 50;
  const range = maxV - minV || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.count - minV) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  const fill = `M0,${H} ` + data.map((d, i) => `L${(i / (data.length - 1)) * W},${H - ((d.count - minV) / range) * H}`).join(' ') + ` L${W},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: 70 }}>
      <defs>
        <linearGradient id="miniGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill="url(#miniGrad)" />
      <polyline points={pts} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function DataAnalysis() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [dailyOrders, setDailyOrders] = useState<DailyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ totalRevenue: 0, totalOrders: 0, avgOrder: 0, growth: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchAnalyticsSummary();
        if (ignore) return;
        setMonthlyData(result.monthlyData);
        setTopProducts(result.topProducts);
        setDailyOrders(result.dailyOrders);
        setKpi(result.kpi);
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : '数据分析加载失败');
          setMonthlyData([]);
          setTopProducts([]);
          setDailyOrders([]);
          setKpi({ totalRevenue: 0, totalOrders: 0, avgOrder: 0, growth: 0 });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, []);

  const todayCount = dailyOrders.length > 0 ? dailyOrders[dailyOrders.length - 1].count : 0;
  const peakCount = dailyOrders.length > 0 ? Math.max(...dailyOrders.map((d) => d.count)) : 0;
  const avgDaily = dailyOrders.length > 0 ? Math.round(dailyOrders.reduce((a, d) => a + d.count, 0) / dailyOrders.length) : 0;
  const monthTotal = dailyOrders.reduce((a, d) => a + d.count, 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-3 h-56 bg-white rounded-xl border border-slate-200 animate-pulse" />
          <div className="col-span-2 h-56 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">数据分析</h2>
          <p className="text-xs text-slate-400 mt-0.5">按已支付有效订单统计营收、订单趋势与产品销售</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '累计营收', value: kpi.totalRevenue >= 10000 ? `$${(kpi.totalRevenue / 10000).toFixed(1)}万` : `$${kpi.totalRevenue.toLocaleString()}`, sub: `环比 ${kpi.growth >= 0 ? '+' : ''}${kpi.growth.toFixed(1)}%`, icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '累计订单', value: kpi.totalOrders.toLocaleString(), sub: '全部订单数', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '客单价', value: `$${kpi.avgOrder.toFixed(0)}`, sub: '平均订单金额', icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '环比增长', value: `${kpi.growth >= 0 ? '+' : ''}${kpi.growth.toFixed(1)}%`, sub: '较上月收入增长', icon: TrendingUp, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
              <div className="text-[10px] text-emerald-600 font-medium">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-5 gap-4">
        {/* Monthly Revenue Bar Chart */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm font-bold text-slate-800">月度营收对比</div>
              <div className="text-[11px] text-slate-400 mt-0.5">近期月份销售额与订单数</div>
            </div>
            <BarChart3 size={16} className="text-slate-300" />
          </div>
          <BarChartSVG data={monthlyData} />
          {monthlyData.length > 0 && (
            <div className={`grid gap-1 mt-2`} style={{ gridTemplateColumns: `repeat(${monthlyData.length}, 1fr)` }}>
              {monthlyData.map((m, i) => (
                <div key={m.month} className="text-center">
                  <div className={`text-[10px] font-bold ${i === monthlyData.length - 1 ? 'text-blue-700' : 'text-slate-500'}`}>{m.orders}</div>
                  <div className="text-[9px] text-slate-300">单</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 30-day trend */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-bold text-slate-800">近30天订单趋势</div>
              <div className="text-[11px] text-slate-400 mt-0.5">日订单量波动</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-blue-700">{todayCount}</div>
              <div className="text-[10px] text-slate-400">今日</div>
            </div>
          </div>
          <MiniTrend data={dailyOrders} />
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 mt-1">
            {[{ l: '峰值', v: String(peakCount) }, { l: '日均', v: String(avgDaily) }, { l: '月总计', v: monthTotal.toLocaleString() }].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-sm font-bold text-slate-800">{s.v}</div>
                <div className="text-[10px] text-slate-400">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-bold text-slate-800">产品销售排行</div>
            <div className="text-[11px] text-slate-400 mt-0.5">按累计收入排序</div>
          </div>
          <PieChart size={16} className="text-slate-300" />
        </div>
        {topProducts.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">暂无销售数据</div>
        ) : (
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 truncate">{p.name}</span>
                    <span className="text-xs font-bold text-slate-800 ml-2 flex-shrink-0">${p.revenue.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(p.revenue / (topProducts[0]?.revenue || 1)) * 100}%` }}></div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] text-slate-500">{p.qty} 件</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
