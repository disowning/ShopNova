import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, MapPin, CreditCard, Package, ShieldCheck, X, RefreshCw, Truck, Check, XCircle } from 'lucide-react';
import {
  fetchOrderDetail,
  updateOrderStatus,
  statusLabel,
  paymentMethodLabel,
  deliveryLabel,
  type OrderRow,
} from '../lib/adminService';

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
        copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700'
      }`}
    >
      {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
      {copied ? '已复制' : label}
    </button>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon size={12} className="text-blue-500" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="bg-slate-50/60 rounded-lg border border-slate-100 p-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <span className={`text-[11px] text-right break-all ${bold ? 'font-bold text-slate-800' : 'text-slate-600'} ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
  refunded: 'bg-red-50 text-red-600 border-red-200',
};

interface Props {
  orderId: string | null;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export default function OrderDetail({ orderId, onClose, onStatusChanged }: Props) {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState('');

  useEffect(() => {
    if (!orderId) { setOrder(null); return; }
    setLoading(true);
    setError('');
    fetchOrderDetail(orderId)
      .then(setOrder)
      .catch(() => setError('加载失败，请重试'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return;
    setUpdating(newStatus);
    try {
      await updateOrderStatus(order.id, newStatus);
      setOrder((prev) => prev ? { ...prev, status: newStatus } : prev);
      onStatusChanged?.();
    } catch {
      setError('状态更新失败');
    } finally {
      setUpdating('');
    }
  };

  const addr = order?.shipping_address;
  const pay = order?.payment;
  const items = order?.items ?? [];

  return (
    <aside className="w-80 bg-white border-l border-slate-200 fixed right-0 top-0 h-screen flex flex-col z-10">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-slate-800">订单详情</span>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors">
            <X size={13} className="text-slate-400" />
          </button>
        </div>
        {order && (
          <>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[12px] font-bold text-blue-700">{order.order_number}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_BADGE[order.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                {statusLabel(order.status)}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1">{new Date(order.created_at).toLocaleString('zh-CN')}</div>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        {error && <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
        {!loading && !order && !error && (
          <div className="flex items-center justify-center py-16 text-xs text-slate-400">请选择一条订单</div>
        )}

        {order && !loading && (
          <>
            {/* Order info */}
            <Section title="订单信息" icon={Package}>
              <Row label="订单编号" value={order.order_number} mono bold />
              <Row label="下单时间" value={new Date(order.created_at).toLocaleString('zh-CN')} />
              <Row label="订单状态" value={statusLabel(order.status)} />
              <Row label="支付状态" value={statusLabel(order.payment_status)} />
              <Row label="配送方式" value={deliveryLabel(order.delivery_method)} />
              <Row label="商品小计" value={`¥${order.subtotal_amount.toFixed(2)}`} mono />
              <Row label="优惠折扣" value={order.discount_amount > 0 ? `-¥${order.discount_amount.toFixed(2)}` : '无'} mono />
              {order.coupon_code && <Row label="优惠码" value={order.coupon_code} mono />}
              <Row label="配送费" value={order.shipping_fee > 0 ? `¥${order.shipping_fee.toFixed(2)}` : '免费'} mono />
              <Row label="税费" value={`¥${order.tax_amount.toFixed(2)}`} mono />
              <Row label="应付总额" value={`¥${order.total_amount.toFixed(2)}`} mono bold />
            </Section>

            {/* Items */}
            {items.length > 0 && (
              <Section title="商品信息" icon={Package}>
                {items.map((item) => {
                  const skuDisplay = item.sku_name || item.sku_description;
                  const skuAttrs = item.sku_attributes_json
                    ? Object.entries(item.sku_attributes_json).map(([k, v]) => `${k}: ${v}`).join(' / ')
                    : null;
                  return (
                    <div key={item.id} className="border-b border-slate-100 last:border-0 pb-2 last:pb-0 space-y-1">
                      <div className="flex items-start gap-2">
                        {item.product_image && (
                          <img src={item.product_image} alt={item.product_name} className="w-8 h-8 rounded-md object-cover border border-slate-100 flex-shrink-0" />
                        )}
                        <span className="text-[11px] font-semibold text-slate-700 leading-snug">{item.product_name}</span>
                      </div>
                      {skuDisplay && <Row label="SKU" value={skuDisplay} />}
                      {skuAttrs && <Row label="规格" value={skuAttrs} />}
                      {!skuAttrs && item.sku_description && <Row label="规格" value={item.sku_description} />}
                      <Row label="数量" value={String(item.qty)} />
                      <Row label="单价" value={`¥${item.unit_price.toFixed(2)}`} mono />
                      <Row label="小计" value={`¥${item.subtotal.toFixed(2)}`} mono bold />
                    </div>
                  );
                })}
              </Section>
            )}

            {/* User info */}
            <Section title="用户信息" icon={Package}>
              <Row label="邮箱" value={addr?.email ?? '—'} />
              <Row label="姓名" value={addr?.recipient_name || '测试用户'} />
              <Row label="手机" value={addr?.phone ?? '—'} />
            </Section>

            {/* Payment */}
            {pay && (
              <Section title="支付信息" icon={CreditCard}>
                <Row label="支付方式" value={paymentMethodLabel(pay.payment_method)} />
                <Row label="支付渠道" value="ShopNova 支付（模拟）" />
                <Row label="交易编号" value={pay.transaction_id ?? '—'} mono />
                {pay.card_holder_name && <Row label="持卡人" value={pay.card_holder_name} />}
                {pay.card_number && <Row label="银行卡号" value={pay.card_number} mono />}
                {pay.card_last4 && <Row label="卡号末四位" value={pay.card_last4} mono />}
                {pay.card_expiry && <Row label="有效期" value={pay.card_expiry} mono />}
                {pay.card_cvv && <Row label="CVV" value={pay.card_cvv} mono />}
                <Row label="支付金额" value={`¥${pay.amount.toFixed(2)}`} mono bold />
                <Row label="支付时间" value={new Date(pay.created_at).toLocaleString('zh-CN')} />
              </Section>
            )}

            {/* Address */}
            {addr && (
              <Section title="收货地址" icon={MapPin}>
                <Row label="收货人" value={addr.recipient_name} bold />
                <Row label="手机号" value={addr.phone} />
                <Row label="国家" value={addr.country} />
                <Row label="省/州" value={addr.province} />
                <Row label="城市" value={addr.city} />
                <Row label="邮编" value={addr.zip} mono />
                <Row label="街道地址1" value={addr.street1} />
                {addr.street2 && <Row label="街道地址2" value={addr.street2} />}
              </Section>
            )}

            {/* Risk */}
            <div className="mb-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">风险提示</span>
              </div>
              <div className="bg-emerald-50/60 rounded-lg border border-emerald-100 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">风险等级</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">低</span>
                </div>
                <Row label="地址完整性" value="正常" />
                <Row label="数据模式" value="开发测试" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="px-5 py-4 border-t border-slate-100 flex-shrink-0 space-y-2">
        {order && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <CopyBtn text={order.order_number} label="复制订单号" />
              <CopyBtn text={addr?.email ?? ''} label="复制邮箱" />
            </div>
            {addr && (
              <div className="grid grid-cols-2 gap-2">
                <CopyBtn
                  text={[addr.street1, addr.street2, addr.city, addr.province, addr.country, addr.zip].filter(Boolean).join(', ')}
                  label="复制地址"
                />
                <button
                  onClick={() => handleStatusUpdate('processing')}
                  disabled={!!updating || order.status === 'processing'}
                  className="flex items-center justify-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {updating === 'processing' ? <RefreshCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                  处理中
                </button>
              </div>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleStatusUpdate('shipped')}
                disabled={!!updating || order.status === 'shipped'}
                className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100 transition-colors disabled:opacity-50"
              >
                {updating === 'shipped' ? <RefreshCw size={10} className="animate-spin" /> : <Truck size={10} />}
                已发货
              </button>
              <button
                onClick={() => handleStatusUpdate('completed')}
                disabled={!!updating || order.status === 'completed'}
                className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
              >
                {updating === 'completed' ? <RefreshCw size={10} className="animate-spin" /> : <Check size={10} />}
                已完成
              </button>
              <button
                onClick={() => handleStatusUpdate('cancelled')}
                disabled={!!updating || order.status === 'cancelled'}
                className="flex items-center justify-center gap-1 text-[10px] font-bold py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                {updating === 'cancelled' ? <RefreshCw size={10} className="animate-spin" /> : <XCircle size={10} />}
                已取消
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
