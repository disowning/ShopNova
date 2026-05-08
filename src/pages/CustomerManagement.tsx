import { useState, useEffect, useCallback } from 'react';
import { Search, Mail, Phone, MapPin, ShoppingBag, UserPlus, Users, Crown, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DBCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  member_level: string;
  status: string;
  total_spend: number;
  order_count: number;
  last_order_at: string | null;
  created_at: string;
}

const levelColor: Record<string, string> = {
  '高级VIP': 'bg-amber-50 text-amber-700 border-amber-200',
  'VIP': 'bg-blue-50 text-blue-700 border-blue-200',
  '普通': 'bg-slate-100 text-slate-600 border-slate-200',
  '新用户': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const statusColor: Record<string, string> = {
  '活跃': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '待验证': 'bg-amber-50 text-amber-700 border-amber-200',
  '已封禁': 'bg-red-50 text-red-600 border-red-200',
};
const avatarColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-teal-500'];

function getInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').join('').slice(0, 2) || '?';
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  return new Date(d).toISOString().slice(0, 10);
}

const PAGE_SIZE = 15;

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('全部');
  const [page, setPage] = useState(0);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('users')
      .select('id, name, email, phone, country, member_level, status, total_spend, order_count, last_order_at, created_at', { count: 'exact' })
      .eq('role', 'customer')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) {
      q = q.or(`name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`);
    }
    if (levelFilter !== '全部') {
      q = q.eq('member_level', levelFilter);
    }

    const { data, count } = await q;
    setCustomers((data ?? []) as DBCustomer[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search, levelFilter, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Compute stats from current page (for small datasets this is fine; for large ones would need a separate query)
  const levels = ['全部', '高级VIP', 'VIP', '普通', '新用户'];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Stats: fetch all customers for aggregate (lightweight query)
  const [stats, setStats] = useState({ total: 0, active: 0, vip: 0, revenue: 0 });
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('status, member_level, total_spend')
        .eq('role', 'customer');
      if (data) {
        setStats({
          total: data.length,
          active: data.filter((u) => u.status === '活跃').length,
          vip: data.filter((u) => u.member_level === 'VIP' || u.member_level === '高级VIP').length,
          revenue: data.reduce((a, u) => a + (Number(u.total_spend) || 0), 0),
        });
      }
    })();
  }, [customers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">客户管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理买家信息、消费记录与会员等级</p>
        </div>
        <button className="flex items-center gap-1.5 text-xs text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <UserPlus size={13} /> 添加客户
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总客户数', value: stats.total, sub: '注册用户', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '活跃客户', value: stats.active, sub: '近30天有订单', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'VIP 客户', value: stats.vip, sub: '高价值用户', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '客户总消费', value: stats.revenue >= 10000 ? `¥${(stats.revenue / 10000).toFixed(1)}万` : `¥${stats.revenue.toLocaleString()}`, sub: '累计收入贡献', icon: ShoppingBag, color: 'text-rose-600', bg: 'bg-rose-50' },
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

      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="搜索姓名 / 邮箱..."
            className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder-slate-400"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {levels.map((l) => (
            <button key={l} onClick={() => { setLevelFilter(l); setPage(0); }} className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${levelFilter === l ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{l}</button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-400">共 {total} 位客户</span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {['客户', '联系方式', '地区', '订单数', '累计消费', '会员等级', '状态', '最近下单', '操作'].map((c) => (
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
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Users size={28} className="mx-auto mb-2 text-slate-200" />
                    暂无客户数据
                  </td>
                </tr>
              ) : (
                customers.map((c, idx) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${avatarColors[idx % avatarColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {getInitials(c.name || c.email)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800 whitespace-nowrap">{c.name || '未设置姓名'}</div>
                          <div className="text-[10px] text-slate-400">{c.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1 text-slate-500"><Mail size={10} />{c.email}</div>
                        {c.phone && <div className="flex items-center gap-1 text-slate-400"><Phone size={10} />{c.phone}</div>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-slate-500"><MapPin size={10} />{c.country || '—'}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{c.order_count}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">¥{Number(c.total_spend).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelColor[c.member_level] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{c.member_level}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor[c.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(c.last_order_at)}</td>
                    <td className="px-4 py-3">
                      <button className="text-blue-600 hover:text-blue-700 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">查看</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">共 {total} 位客户</span>
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
