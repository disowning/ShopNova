import { useEffect, useState } from 'react';
import { fetchStatusDistribution, type DashboardFilters, type StatusPoint } from '../lib/adminService';

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function DonutChart({ filters }: { filters: DashboardFilters }) {
  const [data, setData] = useState<StatusPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStatusDistribution(filters).then((d) => { setData(d); setLoading(false); });
  }, [filters]);

  const total = data.reduce((a, b) => a + b.value, 0);
  const cx = 60, cy = 60, r = 42, innerR = 28;

  let cumAngle = 0;
  const slices = data.map((d) => {
    const angle = total > 0 ? (d.value / total) * 360 : 0;
    const start = cumAngle;
    cumAngle += angle;
    return { ...d, startAngle: start, endAngle: cumAngle };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm flex flex-col">
      <div className="mb-4">
        <div className="text-sm font-bold text-slate-800">订单状态分布</div>
        <div className="text-[11px] text-slate-400 mt-0.5">当前筛选条件内的状态占比</div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-28">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="flex items-center justify-center h-28 text-xs text-slate-400">暂无订单数据</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" viewBox="0 0 120 120">
              {slices.map((s, i) => {
                const gapAngle = 1.5;
                const sa = s.startAngle + gapAngle / 2;
                const ea = s.endAngle - gapAngle / 2;
                if (ea <= sa) return null;

                const startOut = polarToCartesian(cx, cy, r, sa);
                const endOut = polarToCartesian(cx, cy, r, ea);
                const startIn = polarToCartesian(cx, cy, innerR, ea);
                const endIn = polarToCartesian(cx, cy, innerR, sa);
                const large = ea - sa <= 180 ? '0' : '1';
                const fullPath = `M ${startOut.x} ${startOut.y} A ${r} ${r} 0 ${large} 1 ${endOut.x} ${endOut.y} L ${startIn.x} ${startIn.y} A ${innerR} ${innerR} 0 ${large} 0 ${endIn.x} ${endIn.y} Z`;
                return <path key={i} d={fullPath} fill={s.color} opacity="0.9" />;
              })}
              <text x={cx} y={cy - 5} textAnchor="middle" fontSize="12" fontWeight="700" fill="#1e293b">
                {total.toLocaleString()}
              </text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize="6" fill="#94a3b8">总订单</text>
            </svg>
          </div>

          <div className="flex-1 space-y-2">
            {data.map((d) => {
              const pct = ((d.value / total) * 100).toFixed(1);
              return (
                <div key={d.label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-[11px] text-slate-600 flex-1">{d.label}</span>
                  <span className="text-[11px] font-semibold text-slate-700">{d.value.toLocaleString()}</span>
                  <span className="text-[10px] text-slate-400 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
