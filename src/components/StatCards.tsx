import { useEffect, useState } from 'react';
import { ShoppingBag, Clock, CheckCircle, AlertCircle, ShieldAlert, DollarSign } from 'lucide-react';
import { fetchDashboardStats, type DashboardFilters, type DashboardStats } from '../lib/adminService';

function Skeleton() {
  return <div className="h-6 w-16 bg-slate-100 rounded animate-pulse" />;
}

export default function StatCards({ filters }: { filters: DashboardFilters }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    fetchDashboardStats(filters)
      .then(setStats)
      .catch(() => setError(true));
  }, [filters]);

  const fmt = (n: number) => n.toLocaleString('zh-CN');
  const fmtMoney = (n: number) => `$${n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const cards = [
    {
      label: '筛选订单',
      value: stats ? fmt(stats.totalOrders) : null,
      sub: '当前条件匹配',
      positive: true,
      icon: ShoppingBag,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      accent: 'from-blue-500 to-blue-600',
    },
    {
      label: '今日订单',
      value: stats ? fmt(stats.todayOrders) : null,
      sub: '当前条件内今日新增',
      positive: true,
      icon: Clock,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      accent: 'from-sky-500 to-sky-600',
    },
    {
      label: '支付成功',
      value: stats ? fmt(stats.paidOrders) : null,
      sub: stats && stats.totalOrders > 0 ? `成功率 ${((stats.paidOrders / stats.totalOrders) * 100).toFixed(1)}%` : '成功率 —',
      positive: true,
      icon: CheckCircle,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      accent: 'from-emerald-500 to-emerald-600',
    },
    {
      label: '待处理',
      value: stats ? fmt(stats.pendingOrders) : null,
      sub: '需及时跟进',
      positive: null,
      icon: AlertCircle,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      accent: 'from-amber-500 to-amber-600',
    },
    {
      label: '风险订单',
      value: stats ? fmt(stats.riskOrders) : null,
      sub: '需人工审核',
      positive: false,
      icon: ShieldAlert,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-600',
      accent: 'from-red-500 to-red-600',
    },
    {
      label: '总销售额',
      value: stats ? fmtMoney(stats.totalRevenue) : null,
      sub: '当前条件已支付',
      positive: true,
      icon: DollarSign,
      iconBg: 'bg-violet-50',
      iconColor: 'text-blue-700',
      accent: 'from-blue-700 to-blue-800',
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-3">
      {cards.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden group">
            <div className={`absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r ${s.accent}`} />
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg ${s.iconBg} flex items-center justify-center`}>
                <Icon size={17} className={s.iconColor} />
              </div>
              {error && <span className="text-[9px] text-red-400 font-semibold">ERR</span>}
            </div>
            <div className="text-xl font-bold text-slate-800 leading-tight mb-0.5 min-h-[28px]">
              {s.value === null ? <Skeleton /> : s.value}
            </div>
            <div className="text-[11px] text-slate-500 font-medium">{s.label}</div>
            <div className={`text-[10px] mt-1 font-medium ${s.positive === true ? 'text-emerald-600' : s.positive === false ? 'text-slate-400' : 'text-amber-600'}`}>
              {s.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
