import { useState, useEffect, useCallback } from 'react';
import { Search, Mail, Phone, MapPin, ShoppingBag, Users, Crown, TrendingUp, ChevronLeft, ChevronRight, Eye, RefreshCw, X, UserPlus, ExternalLink, SlidersHorizontal, Pencil, KeyRound, Trash2, Ban, RotateCcw } from 'lucide-react';
import {
  createCustomerAdmin,
  deleteCustomerAdmin,
  fetchCustomerOrders,
  fetchCustomerRulesAdmin,
  fetchCustomerStats,
  listCustomers,
  resetCustomerPasswordAdmin,
  saveCustomerRulesAdmin,
  syncCustomerSummariesAdmin,
  updateCustomerAdmin,
  updateCustomerStatusAdmin,
  type CustomerOrder,
  type CustomerStats,
  type DBCustomer,
} from '../lib/customerAdminService';
import {
  DEFAULT_CUSTOMER_RULES,
  type CustomerRules,
} from '../lib/customerRules';

interface NewCustomerForm {
  name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  status: string;
}

interface CustomerEditForm {
  name: string;
  email: string;
  phone: string;
  country: string;
  status: string;
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

function formatMoney(value: number) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

const PAGE_SIZE = 15;
const CUSTOMER_STATUSES = ['活跃', '待验证', '已封禁'];
const DEFAULT_NEW_CUSTOMER: NewCustomerForm = {
  name: '',
  email: '',
  phone: '',
  country: '',
  password: '123456',
  status: '活跃',
};
const DEFAULT_EDIT_CUSTOMER: CustomerEditForm = {
  name: '',
  email: '',
  phone: '',
  country: '',
  status: '活跃',
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CustomerManagement({ onSelectOrder }: { onSelectOrder?: (orderId: string) => void }) {
  const [customers, setCustomers] = useState<DBCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('全部');
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState<CustomerStats>({ total: 0, active: 0, vip: 0, revenue: 0 });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<DBCustomer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState<NewCustomerForm>(DEFAULT_NEW_CUSTOMER);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editCustomer, setEditCustomer] = useState<DBCustomer | null>(null);
  const [editForm, setEditForm] = useState<CustomerEditForm>(DEFAULT_EDIT_CUSTOMER);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetCustomer, setResetCustomer] = useState<DBCustomer | null>(null);
  const [resetPassword, setResetPassword] = useState('123456');
  const [resetLoading, setResetLoading] = useState(false);
  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [customerRules, setCustomerRules] = useState<CustomerRules>(DEFAULT_CUSTOMER_RULES);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCustomers({
        search,
        level: levelFilter,
        page,
        pageSize: PAGE_SIZE,
      });
      const rows = result.customers.map((customer) => ({
        ...customer,
        status: customer.status || '活跃',
        member_level: customer.member_level || '新用户',
      }));
      setCustomers(rows);
      setTotal(result.total);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '读取客户列表失败' });
      setCustomers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    let ignore = false;

    async function loadCustomerRules() {
      try {
        const result = await fetchCustomerRulesAdmin();
        if (ignore) return;
        setCustomerRules(result.customerRules);
      } catch (error) {
        if (!ignore) {
          setMessage({ type: 'error', text: error instanceof Error ? error.message : '读取客户会员规则失败' });
        }
      }
    }

    loadCustomerRules();
    return () => {
      ignore = true;
    };
  }, []);

  const levels = ['全部', '高级VIP', 'VIP', '普通', '新用户'];
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const patchCustomerInState = (customerId: string, patch: Partial<DBCustomer>) => {
    setCustomers((prev) => prev.map((customer) => (
      customer.id === customerId ? { ...customer, ...patch } : customer
    )));
    setSelectedCustomer((prev) => (prev?.id === customerId ? { ...prev, ...patch } : prev));
    setEditCustomer((prev) => (prev?.id === customerId ? { ...prev, ...patch } : prev));
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const result = await fetchCustomerStats();
        if (!ignore) setStats(result.stats);
      } catch {
        if (!ignore) setStats({ total: 0, active: 0, vip: 0, revenue: 0 });
      }
    })();
    return () => {
      ignore = true;
    };
  }, [customers]);

  const openCustomerDetail = async (customer: DBCustomer) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setDetailLoading(true);
    setMessage(null);

    try {
      const result = await fetchCustomerOrders(customer.id);
      setCustomerOrders(result.orders);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '读取客户订单失败' });
      setCustomerOrders([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const syncCustomerSummaries = async () => {
    setSyncing(true);
    setMessage(null);

    try {
      const result = await syncCustomerSummariesAdmin();
      if (result.updatedCount === 0) {
        setMessage({ type: 'info', text: '当前没有注册客户可同步。' });
        return;
      }

      setMessage({ type: 'success', text: `已同步 ${result.updatedCount} 位注册客户的已支付订单统计。` });
      await fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '同步客户统计失败' });
    } finally {
      setSyncing(false);
    }
  };

  const updateNewCustomer = <K extends keyof NewCustomerForm>(key: K, value: NewCustomerForm[K]) => {
    setNewCustomer((prev) => ({ ...prev, [key]: value }));
  };

  const createCustomer = async () => {
    const email = newCustomer.email.trim().toLowerCase();
    const name = newCustomer.name.trim();
    const password = newCustomer.password.trim();

    if (!email) {
      setMessage({ type: 'error', text: '请填写客户邮箱。' });
      return;
    }
    if (!password || password.length < 6) {
      setMessage({ type: 'error', text: '请填写至少 6 位登录密码。' });
      return;
    }

    setAddLoading(true);
    setMessage(null);

    try {
      await createCustomerAdmin({
        email,
        password,
        name,
        phone: newCustomer.phone.trim(),
        country: newCustomer.country.trim(),
        status: newCustomer.status,
      });

      setMessage({ type: 'success', text: '客户已新增，可以用邮箱和密码登录用户端。' });
      setAddOpen(false);
      setNewCustomer(DEFAULT_NEW_CUSTOMER);
      setPage(0);
      await fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '新增客户失败' });
    } finally {
      setAddLoading(false);
    }
  };

  const updateEditCustomer = <K extends keyof CustomerEditForm>(key: K, value: CustomerEditForm[K]) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const openEditCustomer = (customer: DBCustomer) => {
    setEditCustomer(customer);
    setEditForm({
      name: customer.name ?? '',
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      country: customer.country ?? '',
      status: CUSTOMER_STATUSES.includes(customer.status) ? customer.status : '活跃',
    });
    setEditOpen(true);
    setMessage(null);
  };

  const saveEditedCustomer = async () => {
    if (!editCustomer) return;

    const email = editForm.email.trim().toLowerCase();
    if (!email) {
      setMessage({ type: 'error', text: '请填写客户邮箱。' });
      return;
    }
    if (!isValidEmail(email)) {
      setMessage({ type: 'error', text: '客户邮箱格式不正确。' });
      return;
    }

    setEditLoading(true);
    setMessage(null);

    try {
      const result = await updateCustomerAdmin({
        customerId: editCustomer.id,
        name: editForm.name.trim(),
        email,
        phone: editForm.phone.trim(),
        country: editForm.country.trim(),
        status: editForm.status,
      });

      patchCustomerInState(editCustomer.id, result.customer);
      setEditOpen(false);
      setEditCustomer(null);
      setMessage({ type: 'success', text: '客户资料已更新。' });
      await fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '更新客户失败' });
    } finally {
      setEditLoading(false);
    }
  };

  const openResetPassword = (customer: DBCustomer) => {
    setResetCustomer(customer);
    setResetPassword('123456');
    setResetOpen(true);
    setMessage(null);
  };

  const resetCustomerPassword = async () => {
    if (!resetCustomer) return;
    const password = resetPassword.trim();
    if (password.length < 6) {
      setMessage({ type: 'error', text: '新密码至少需要 6 位。' });
      return;
    }

    setResetLoading(true);
    setMessage(null);

    try {
      await resetCustomerPasswordAdmin(resetCustomer.id, password);

      setResetOpen(false);
      setResetCustomer(null);
      setResetPassword('123456');
      setMessage({ type: 'success', text: `已重置 ${resetCustomer.email} 的登录密码。` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '重置密码失败' });
    } finally {
      setResetLoading(false);
    }
  };

  const updateCustomerStatus = async (customer: DBCustomer, nextStatus: string) => {
    if (customer.status === nextStatus) return;
    if (nextStatus === '已封禁' && !window.confirm(`确认封禁 ${customer.email}？封禁后该客户不能登录前台。`)) {
      return;
    }

    setStatusLoadingId(customer.id);
    setMessage(null);

    try {
      const result = await updateCustomerStatusAdmin(customer.id, nextStatus);

      patchCustomerInState(customer.id, result.customer);
      setMessage({
        type: 'success',
        text: nextStatus === '已封禁'
          ? '客户已封禁，前台邮箱登录和 Google 登录都会被阻止。'
          : '客户已恢复，可以正常登录前台。',
      });
      await fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '更新客户状态失败' });
    } finally {
      setStatusLoadingId(null);
    }
  };

  const deleteCustomer = async (customer: DBCustomer) => {
    if (!window.confirm(`确认删除 ${customer.email}？删除后客户会从列表隐藏，历史订单仍会保留。`)) {
      return;
    }

    setDeleteLoadingId(customer.id);
    setMessage(null);

    try {
      await deleteCustomerAdmin(customer.id);

      setCustomers((prev) => prev.filter((item) => item.id !== customer.id));
      setTotal((prev) => Math.max(0, prev - 1));
      setSelectedCustomer((prev) => (prev?.id === customer.id ? null : prev));
      setEditOpen(false);
      setEditCustomer(null);
      setMessage({ type: 'success', text: '客户账号已删除，历史订单已保留。' });
      await fetchCustomers();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '删除客户失败' });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const updateCustomerRule = (key: keyof CustomerRules, value: string) => {
    const next = Math.max(0, Number(value) || 0);
    setCustomerRules((prev) => ({ ...prev, [key]: next }));
    setMessage(null);
  };

  const saveMembershipRules = async () => {
    if (customerRules.highVipSpendThreshold < customerRules.vipSpendThreshold) {
      setMessage({ type: 'error', text: '高级 VIP 消费门槛不能低于 VIP 消费门槛。' });
      return;
    }
    if (customerRules.highVipOrderThreshold < customerRules.vipOrderThreshold) {
      setMessage({ type: 'error', text: '高级 VIP 订单门槛不能低于 VIP 订单门槛。' });
      return;
    }

    setRulesSaving(true);
    setMessage(null);

    try {
      const result = await saveCustomerRulesAdmin(customerRules);
      setCustomerRules(result.customerRules);
      await syncCustomerSummaries();
      setRulesOpen(false);
      setMessage({ type: 'success', text: '会员规则已保存，并已按新规则刷新客户等级。' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存会员规则失败' });
    } finally {
      setRulesSaving(false);
    }
  };

  const customerInputClass = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">客户管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理注册买家信息、消费记录与会员等级；游客订单不计入注册客户列表。</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void syncCustomerSummaries()}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            同步历史统计
          </button>
          <button
            onClick={() => {
              setRulesOpen(true);
              setMessage(null);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <SlidersHorizontal size={13} />
            会员规则
          </button>
          <button
            onClick={() => {
              setNewCustomer(DEFAULT_NEW_CUSTOMER);
              setAddOpen(true);
              setMessage(null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            <UserPlus size={13} />
            新增客户
          </button>
        </div>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : message.type === 'info'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: '总客户数', value: stats.total, sub: '注册用户', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '活跃客户', value: stats.active, sub: '近30天有订单', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'VIP 客户', value: stats.vip, sub: '高价值用户', icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '客户总消费', value: stats.revenue >= 10000 ? `$${(stats.revenue / 10000).toFixed(1)}万` : `$${stats.revenue.toLocaleString()}`, sub: '累计收入贡献', icon: ShoppingBag, color: 'text-rose-600', bg: 'bg-rose-50' },
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
                    <td className="px-4 py-3 font-semibold text-slate-700">{Number(c.order_count ?? 0)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">${Number(c.total_spend ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelColor[c.member_level] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>{c.member_level}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusColor[c.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{formatDate(c.last_order_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openCustomerDetail(c)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={12} />
                        查看
                      </button>
                      <button
                        onClick={() => openEditCustomer(c)}
                        className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
                      >
                        <Pencil size={12} />
                        编辑
                      </button>
                      <button
                        onClick={() => openResetPassword(c)}
                        className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-700"
                      >
                        <KeyRound size={12} />
                        密码
                      </button>
                      <button
                        onClick={() => void updateCustomerStatus(c, c.status === '已封禁' ? '活跃' : '已封禁')}
                        disabled={statusLoadingId === c.id}
                        className={`ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold transition-colors disabled:opacity-60 ${
                          c.status === '已封禁'
                            ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
                            : 'text-red-600 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        {statusLoadingId === c.id ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : c.status === '已封禁' ? (
                          <RotateCcw size={12} />
                        ) : (
                          <Ban size={12} />
                        )}
                        {c.status === '已封禁' ? '恢复' : '封禁'}
                      </button>
                      <button
                        onClick={() => void deleteCustomer(c)}
                        disabled={deleteLoadingId === c.id}
                        className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                      >
                        {deleteLoadingId === c.id ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        删除
                      </button>
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

      {rulesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveMembershipRules();
            }}
            className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">会员等级规则</h3>
                <p className="mt-0.5 text-xs text-slate-400">客户达到消费金额或订单数量任一条件，就会升级到对应等级。</p>
              </div>
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {message?.type === 'error' && (
              <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message.text}
              </div>
            )}

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">1</span>
                  <div>
                    <div className="text-sm font-bold text-slate-800">VIP</div>
                    <div className="text-[11px] text-slate-500">满足任一条件即可升级</div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">累计消费达到</span>
                    <input
                      type="number"
                      min={0}
                      value={customerRules.vipSpendThreshold}
                      onChange={(event) => updateCustomerRule('vipSpendThreshold', event.target.value)}
                      className={customerInputClass}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">订单数量达到</span>
                    <input
                      type="number"
                      min={0}
                      value={customerRules.vipOrderThreshold}
                      onChange={(event) => updateCustomerRule('vipOrderThreshold', event.target.value)}
                      className={customerInputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-100 text-xs font-black text-amber-700">2</span>
                  <div>
                    <div className="text-sm font-bold text-slate-800">高级 VIP</div>
                    <div className="text-[11px] text-slate-500">高级门槛应高于 VIP 门槛</div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">累计消费达到</span>
                    <input
                      type="number"
                      min={0}
                      value={customerRules.highVipSpendThreshold}
                      onChange={(event) => updateCustomerRule('highVipSpendThreshold', event.target.value)}
                      className={customerInputClass}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-600">订单数量达到</span>
                    <input
                      type="number"
                      min={0}
                      value={customerRules.highVipOrderThreshold}
                      onChange={(event) => updateCustomerRule('highVipOrderThreshold', event.target.value)}
                      className={customerInputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                保存后会自动重新同步所有注册客户等级；以后新订单也会按这套规则计算。
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={rulesSaving || syncing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                <SlidersHorizontal size={14} />
                {rulesSaving || syncing ? '保存中...' : '保存规则'}
              </button>
            </div>
          </form>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void createCustomer();
            }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">新增客户</h3>
                <p className="mt-0.5 text-xs text-slate-400">创建注册买家账号，后续订单会自动累计到该客户。</p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {message?.type === 'error' && (
              <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message.text}
              </div>
            )}

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">客户姓名</span>
                <input
                  value={newCustomer.name}
                  onChange={(event) => updateNewCustomer('name', event.target.value)}
                  className={customerInputClass}
                  placeholder="例如：Alex Chen"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">邮箱</span>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(event) => updateNewCustomer('email', event.target.value)}
                  className={customerInputClass}
                  placeholder="customer@example.com"
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">电话</span>
                <input
                  value={newCustomer.phone}
                  onChange={(event) => updateNewCustomer('phone', event.target.value)}
                  className={customerInputClass}
                  placeholder="可选"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">国家 / 地区</span>
                <input
                  value={newCustomer.country}
                  onChange={(event) => updateNewCustomer('country', event.target.value)}
                  className={customerInputClass}
                  placeholder="例如：United States"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">初始密码</span>
                <input
                  type="text"
                  value={newCustomer.password}
                  onChange={(event) => updateNewCustomer('password', event.target.value)}
                  className={customerInputClass}
                  minLength={6}
                  required
                />
              </label>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                新客户默认是新用户；有订单后会按会员规则自动升级。
              </div>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">账号状态</span>
                <select
                  value={newCustomer.status}
                  onChange={(event) => updateNewCustomer('status', event.target.value)}
                  className={customerInputClass}
                >
                  {CUSTOMER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 sm:col-span-2">
                当前项目登录逻辑使用后台自定义用户表；这里新增后，客户可用邮箱和初始密码登录用户端。
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:opacity-60"
              >
                <UserPlus size={14} />
                {addLoading ? '保存中...' : '保存客户'}
              </button>
            </div>
          </form>
        </div>
      )}

      {editOpen && editCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveEditedCustomer();
            }}
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">编辑客户</h3>
                <p className="mt-0.5 text-xs text-slate-400">{editCustomer.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {message?.type === 'error' && (
              <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message.text}
              </div>
            )}

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">客户姓名</span>
                <input
                  value={editForm.name}
                  onChange={(event) => updateEditCustomer('name', event.target.value)}
                  className={customerInputClass}
                  placeholder="例如：Alex Chen"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">邮箱</span>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(event) => updateEditCustomer('email', event.target.value)}
                  className={customerInputClass}
                  placeholder="customer@example.com"
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">电话</span>
                <input
                  value={editForm.phone}
                  onChange={(event) => updateEditCustomer('phone', event.target.value)}
                  className={customerInputClass}
                  placeholder="可选"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">国家 / 地区</span>
                <input
                  value={editForm.country}
                  onChange={(event) => updateEditCustomer('country', event.target.value)}
                  className={customerInputClass}
                  placeholder="例如：United States"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-slate-600">账号状态</span>
                <select
                  value={editForm.status}
                  onChange={(event) => updateEditCustomer('status', event.target.value)}
                  className={customerInputClass}
                >
                  {CUSTOMER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 sm:col-span-2">
                状态改为“已封禁”后，客户前台邮箱登录和 Google 登录都会被拒绝。
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => void deleteCustomer(editCustomer)}
                disabled={deleteLoadingId === editCustomer.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
              >
                {deleteLoadingId === editCustomer.id ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                删除客户
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 disabled:opacity-60"
                >
                  <Pencil size={14} />
                  {editLoading ? '保存中...' : '保存修改'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {resetOpen && resetCustomer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void resetCustomerPassword();
            }}
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">重置客户密码</h3>
                <p className="mt-0.5 text-xs text-slate-400">{resetCustomer.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            {message?.type === 'error' && (
              <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message.text}
              </div>
            )}

            <div className="space-y-4 p-5">
              <label className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-600">新密码</span>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  className={customerInputClass}
                  minLength={6}
                  required
                />
              </label>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                保存后，客户可直接用这个新密码登录前台。
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setResetOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={resetLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-400 disabled:opacity-60"
              >
                <KeyRound size={14} />
                {resetLoading ? '保存中...' : '确认重置'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedCustomer.name || '未设置姓名'}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{selectedCustomer.email}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => openEditCustomer(selectedCustomer)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                >
                  <Pencil size={13} />
                  编辑
                </button>
                <button
                  onClick={() => openResetPassword(selectedCustomer)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <KeyRound size={13} />
                  重置密码
                </button>
                <button
                  onClick={() => void updateCustomerStatus(selectedCustomer, selectedCustomer.status === '已封禁' ? '活跃' : '已封禁')}
                  disabled={statusLoadingId === selectedCustomer.id}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                    selectedCustomer.status === '已封禁'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  }`}
                >
                  {statusLoadingId === selectedCustomer.id ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : selectedCustomer.status === '已封禁' ? (
                    <RotateCcw size={13} />
                  ) : (
                    <Ban size={13} />
                  )}
                  {selectedCustomer.status === '已封禁' ? '恢复' : '封禁'}
                </button>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: '订单数', value: Number(selectedCustomer.order_count ?? 0) },
                  { label: '累计消费', value: formatMoney(selectedCustomer.total_spend) },
                  { label: '会员等级', value: selectedCustomer.member_level },
                  { label: '最近下单', value: formatDate(selectedCustomer.last_order_at) },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-sm font-black text-slate-900">{item.value}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">联系方式</div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><Mail size={14} />{selectedCustomer.email}</div>
                    <div className="flex items-center gap-2"><Phone size={14} />{selectedCustomer.phone || '未填写电话'}</div>
                    <div className="flex items-center gap-2"><MapPin size={14} />{selectedCustomer.country || '未填写地区'}</div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">账号状态</div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div>注册时间：{formatDate(selectedCustomer.created_at)}</div>
                    <div>
                      状态：
                      <span className={`ml-2 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusColor[selectedCustomer.status] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        {selectedCustomer.status}
                      </span>
                    </div>
                    <div>客户 ID：{selectedCustomer.id.slice(0, 8)}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-slate-800">最近订单</div>
                    <div className="text-[11px] text-slate-400">最多显示最近 20 笔注册用户订单</div>
                  </div>
                  {detailLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {detailLoading ? (
                    <div className="space-y-2 p-4">
                      {[...Array(4)].map((_, index) => (
                        <div key={index} className="h-10 rounded-lg bg-slate-100 animate-pulse" />
                      ))}
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-400">暂无注册订单</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          {['订单号', '金额', '订单状态', '支付状态', '下单时间', '收件人', '操作'].map((column) => (
                            <th key={column} className="px-4 py-2 text-left font-semibold">{column}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {customerOrders.map((order) => (
                          <tr key={order.id} className="border-t border-slate-100">
                            <td className="px-4 py-2 font-semibold text-slate-700">{order.order_number}</td>
                            <td className="px-4 py-2 font-bold text-slate-900">{formatMoney(order.total_amount)}</td>
                            <td className="px-4 py-2 text-slate-500">{order.status}</td>
                            <td className="px-4 py-2 text-slate-500">{order.payment_status}</td>
                            <td className="px-4 py-2 text-slate-400">{formatDate(order.created_at)}</td>
                            <td className="px-4 py-2 text-slate-500">{order.shipping_addresses?.recipient_name || '—'}</td>
                            <td className="px-4 py-2">
                              <button
                                onClick={() => {
                                  onSelectOrder?.(order.id);
                                  setSelectedCustomer(null);
                                }}
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                              >
                                <ExternalLink size={12} />
                                打开订单
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
