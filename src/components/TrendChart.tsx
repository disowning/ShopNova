import { useEffect, useState } from 'react';
import { fetchTrend30Days, type TrendPoint } from '../lib/adminService';

export default function TrendChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrend30Days().then((d) => { setData(d); setLoading(false); });
  }, []);

  if (loading || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col" style={{ minHeight: 240 }}>
        <div className="text-sm font-bold text-slate-800 mb-1">订单趋势</div>
        <div className="text-[11px] text-slate-400 mb-4">近 30 天订单量变化</div>
        <div className="flex-1 flex items-center justify-center">
          {loading
            ? <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            : <span className="text-xs text-slate-400">暂无订单数据</span>}
        </div>
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.orders), 1);
  const minVal = Math.min(...data.map((d) => d.orders));
  const chartH = 130;
  const chartW = 100;

  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * chartW;
    const range = maxVal - minVal || 1;
    const y = chartH - ((d.orders - minVal) / range) * chartH;
    return { x, y, ...d };
  });

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const fillPath = `M${pts[0].x},${chartH} ` + pts.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${chartH} Z`;
  const labelPts = pts.filter((_, i) => i % 5 === 0 || i === pts.length - 1);

  const total = data.reduce((a, b) => a + b.orders, 0);
  const avg = Math.round(total / data.length);
  const now = new Date();
  const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-slate-800">订单趋势</div>
          <div className="text-[11px] text-slate-400 mt-0.5">近 30 天订单量变化</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <div className="w-3 h-0.5 bg-blue-500 rounded-full" />
            <span>订单量</span>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold border border-blue-100">{monthLabel}</span>
        </div>
      </div>

      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${chartW} ${chartH + 16}`} preserveAspectRatio="none" className="w-full" style={{ height: 150 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((t) => (
            <line key={t} x1="0" y1={chartH * (1 - t)} x2={chartW} y2={chartH * (1 - t)} stroke="#f1f5f9" strokeWidth="0.5" />
          ))}
          <path d={fillPath} fill="url(#areaGrad)" />
          <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
          {pts.filter((_, i) => i === pts.length - 1).map((p) => (
            <circle key={p.day} cx={p.x} cy={p.y} r="2" fill="#3b82f6" stroke="white" strokeWidth="1" />
          ))}
          {labelPts.map((p) => (
            <text key={p.day} x={p.x} y={chartH + 11} textAnchor="middle" fontSize="3.2" fill="#94a3b8">{p.day}</text>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 mt-1 border-t border-slate-100">
        <div className="text-center">
          <div className="text-sm font-bold text-slate-800">{maxVal}</div>
          <div className="text-[10px] text-slate-400">峰值</div>
        </div>
        <div className="text-center border-x border-slate-100">
          <div className="text-sm font-bold text-slate-800">{avg}</div>
          <div className="text-[10px] text-slate-400">日均</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-slate-800">{total.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400">月总计</div>
        </div>
      </div>
    </div>
  );
}
