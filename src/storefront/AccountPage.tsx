import { useState, useEffect } from 'react';
import { User, Package, MapPin, LogOut, ChevronRight, XCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';
import { supabase } from '../lib/supabase';
import { statusLabel, statusColor } from '../lib/adminService';
import { useT } from '../i18n';
import { useSiteSettings } from './SiteSettingsContext';

interface OrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  items: { product_name: string; product_image: string; qty: number }[];
}

interface OrderDetailRecord {
  order_number: string;
  status: string;
  created_at: string;
  subtotal_amount: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  order_items?: {
    id: string;
    product_image: string;
    product_name: string;
    sku_description: string;
    qty: number;
    unit_price: number;
    subtotal: number;
  }[];
  shipping_addresses?: {
    recipient_name: string;
    phone: string;
    province: string;
    city: string;
    street1: string;
    street2?: string;
  } | null;
}

function StatusBadge({ status }: { status: string }) {
  const color = statusColor(status);
  const label = statusLabel(status);
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border" style={{ color, borderColor: color + '40', backgroundColor: color + '15' }}>
      {label}
    </span>
  );
}

function OrderCard({ order, onClick }: { order: OrderSummary; onClick: () => void }) {
  const { t } = useT();
  const { text } = useSiteSettings();
  const firstItem = order.items[0];
  const currencySymbol = text('currencySymbol');
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-sm font-bold text-blue-700">{order.order_number}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {firstItem?.product_image && (
          <img src={firstItem.product_image} alt={firstItem.product_name} className="w-12 h-12 rounded-xl object-cover border border-slate-100 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-800 truncate">{firstItem?.product_name ?? '—'}</div>
          {order.items.length > 1 && <div className="text-xs text-slate-400">{t('order.itemsCount', { count: order.items.length })}</div>}
          <div className="text-xs text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleString('zh-CN')}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-base font-black text-slate-900">{currencySymbol}{order.total_amount.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { t } = useT();
  const { text } = useSiteSettings();
  const [order, setOrder] = useState<OrderDetailRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const currencySymbol = text('currencySymbol');

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, shipping_addresses(*), order_items(*), payments(*)')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data }) => { setOrder(data as OrderDetailRecord | null); setLoading(false); });
  }, [orderId]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <span className="font-bold text-slate-900">{t('order.detail')}</span>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <XCircle size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : !order ? (
          <div className="text-center py-12 text-slate-400">{t('order.notFound')}</div>
        ) : (
          <div className="px-6 py-5 space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-blue-700">{order.order_number}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString('zh-CN')}</div>

            {/* Items */}
            {((order.order_items || []) as { id: string; product_image: string; product_name: string; sku_description: string; qty: number; unit_price: number; subtotal: number }[]).map((item) => (
              <div key={item.id} className="flex gap-3 bg-slate-50 rounded-xl p-3">
                {item.product_image && <img src={item.product_image} alt={item.product_name} className="w-14 h-14 rounded-xl object-cover border border-slate-100 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{item.product_name}</div>
                  {item.sku_description && <div className="text-xs text-slate-400 mt-0.5">{item.sku_description}</div>}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-slate-500">× {item.qty}</span>
                    <span className="text-sm font-bold text-slate-800">{currencySymbol}{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Pricing */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">{t('order.productSubtotal')}</span><span>{currencySymbol}{order.subtotal_amount.toFixed(2)}</span></div>
              {order.discount_amount > 0 && <div className="flex justify-between text-emerald-600"><span>{t('order.discount')}</span><span>-{currencySymbol}{order.discount_amount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-slate-500">{t('order.shipping')}</span><span>{order.shipping_fee > 0 ? `${currencySymbol}${order.shipping_fee.toFixed(2)}` : t('common.free')}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2"><span>{t('order.totalPaid')}</span><span className="text-blue-700">{currencySymbol}{order.total_amount.toFixed(2)}</span></div>
            </div>

            {/* Address */}
            {order.shipping_addresses && (
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin size={11} />{t('order.shippingAddress')}</div>
                <div className="text-sm text-slate-700">
                  {order.shipping_addresses.recipient_name} · {order.shipping_addresses.phone}
                </div>
                <div className="text-sm text-slate-500">
                  {order.shipping_addresses.province} {order.shipping_addresses.city} {order.shipping_addresses.street1} {order.shipping_addresses.street2 ?? ''}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type Tab = 'overview' | 'orders';

export default function AccountPage() {
  const { t } = useT();
  const { user, logout } = useAuth();
  const { navigate, page } = useStore();
  const [tab, setTab] = useState<Tab>(() => page.type === 'account-orders' ? 'orders' : 'overview');
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate({ type: 'login' }); }
  }, [user, navigate]);

  useEffect(() => {
    if (page.type === 'account-orders') {
      setTab('orders');
    }
  }, [page.type]);

  useEffect(() => {
    if (tab === 'orders' && user) {
      setOrdersLoading(true);
      supabase
        .from('orders')
        .select('id, order_number, status, payment_status, total_amount, created_at, order_items(product_name, product_image, qty)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setOrders((data ?? []).map((o) => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            payment_status: o.payment_status,
            total_amount: o.total_amount,
            created_at: o.created_at,
            items: (o.order_items ?? []) as { product_name: string; product_image: string; qty: number }[],
          })));
          setOrdersLoading(false);
        });
    }
  }, [tab, user]);

  const handleLogout = () => {
    logout();
    navigate({ type: 'home' });
  };

  if (!user) return null;


  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <span className="text-white text-xs font-black">S</span>
            </div>
            <span className="font-black text-slate-900">Shop<span className="text-blue-600">Nova</span></span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            <LogOut size={14} />
            {t('common.logout')}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 mb-6 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -right-4 -bottom-12 w-56 h-56 bg-white/5 rounded-full" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-black">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xl font-black">{user.name}</div>
              <div className="text-blue-200 text-sm mt-0.5">{user.email}</div>
              {user.phone && <div className="text-blue-200 text-xs mt-0.5">{user.phone}</div>}
            </div>
            <div className="ml-auto">
              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${user.role === 'admin' ? 'bg-amber-400/20 text-amber-200 border border-amber-300/30' : 'bg-white/10 text-blue-100 border border-white/20'}`}>
                {user.role === 'admin' ? t('common.admin') : t('common.member')}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm mb-6">
          {([
            { key: 'overview', label: t('account.overview'), icon: User },
            { key: 'orders', label: t('account.orders'), icon: Package },
          ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === key ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
              {[
                { label: t('account.username'), value: user.name, icon: User },
                { label: t('account.email'), value: user.email, icon: User },
                { label: t('account.phone'), value: user.phone || t('account.notBound'), icon: User },
                { label: t('account.role'), value: user.role === 'admin' ? t('common.admin') : t('account.normalUser'), icon: User },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-4">
                  <span className="text-sm text-slate-500">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTab('orders')}
                className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-3 hover:border-blue-200 hover:shadow-sm transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <Package size={18} className="text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-slate-900 text-sm">{t('account.orders')}</div>
                  <div className="text-xs text-slate-400">{t('account.viewAllOrders')}</div>
                </div>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => {/* switch to admin mode handled via mode toggle */ }}
                  className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-5 flex items-center gap-3 hover:border-amber-200 hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                    <ShoppingBag size={18} className="text-amber-600" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-slate-900 text-sm">{t('account.adminPanel')}</div>
                    <div className="text-xs text-slate-400">{t('account.switchToAdmin')}</div>
                  </div>
                </button>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition-colors"
            >
              <LogOut size={15} />
              {t('common.logout')}
            </button>
          </div>
        )}

        {/* Orders tab */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {ordersLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Package size={28} className="text-slate-300" />
                </div>
                <div className="text-slate-700 font-semibold">{t('account.noOrders')}</div>
                <div className="text-sm text-slate-400">{t('account.noOrdersHint')}</div>
                <button
                  onClick={() => navigate({ type: 'listing' })}
                  className="mt-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
                >
                  {t('common.goShopping')}
                </button>
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard key={order.id} order={order} onClick={() => setSelectedOrderId(order.id)} />
              ))
            )}
          </div>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
}
