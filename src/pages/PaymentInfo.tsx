import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  KeyRound,
  ReceiptText,
  Save,
  Settings,
  Shield,
  X,
  XCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminSwitch from '../components/AdminSwitch';
import {
  fetchPaymentSettings,
  fetchPaymentSecretStatus,
  getMissingPaymentFields,
  isPaymentProviderConfigured,
  mergePaymentSettings,
  PAYMENT_PROVIDER_META,
  PAYMENT_SECRET_FIELDS,
  savePaymentSettings,
  saveProviderSecrets,
  type PaymentProviderConfig,
  type PaymentProviderField,
  type PaymentProviderFieldKey,
  type PaymentProviderId,
  type PaymentSecretName,
  type PaymentSecretStatus,
  type PaymentSettings,
} from '../lib/paymentSettings';

interface DBPayment {
  id: string;
  order_id: string;
  payment_method: string;
  status: string;
  amount: number;
  card_last4: string | null;
  card_holder_name: string | null;
  transaction_id: string | null;
  gateway_response: Record<string, unknown> | null;
  created_at: string;
  order_number?: string;
  user_email?: string;
}

interface PaymentTrendPoint {
  day: string;
  amount: number;
  count: number;
}

interface PaymentStats {
  totalVol: number;
  successVol: number;
  successRate: number;
  failedCount: number;
  pendingCount: number;
  refundedCount: number;
  trend: PaymentTrendPoint[];
}

type PaymentTab = 'overview' | 'records' | 'config';

const tabs: Array<{ id: PaymentTab; label: string; desc: string; icon: React.ElementType }> = [
  { id: 'overview', label: '支付概览', desc: '支付流水统计', icon: ReceiptText },
  { id: 'records', label: '支付记录', desc: '真实交易流水和订单关联', icon: CreditCard },
  { id: 'config', label: '支付配置', desc: '真实支付渠道接入配置', icon: Settings },
];

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

const paymentMethodMap: Record<string, string> = {
  card: '信用卡/借记卡',
  dev_card: '开发测试卡支付',
  stripe: 'Stripe 银行卡',
  paypal: 'PayPal',
  cod: '货到付款',
};

const PAYMENT_SELECT = 'id, order_id, payment_method, status, amount, card_last4, card_holder_name, transaction_id, gateway_response, created_at';
const PAGE_SIZE = 15;
const hiddenConfigFieldKeys = new Set<PaymentProviderFieldKey>(['secretKeyRef', 'webhookSecretRef', 'certificateRef']);

const emptyStats: PaymentStats = {
  totalVol: 0,
  successVol: 0,
  successRate: 0,
  failedCount: 0,
  pendingCount: 0,
  refundedCount: 0,
  trend: [],
};

function paymentMethodLabel(method: string) {
  return paymentMethodMap[method] ?? method;
}

function formatTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatMoney(value: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function maskCard(last4: string | null) {
  return last4 ? `**** **** **** ${last4}` : '-';
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((key) => csvEscape(row[key])).join(',')),
  ].join('\n');
}

function downloadText(fileName: string, text: string, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function hydratePayments(rows: DBPayment[]): Promise<DBPayment[]> {
  if (rows.length === 0) return rows;

  type OrderLite = { id: string; order_number: string; user_id: string | null };
  type UserLite = { id: string; email: string };

  const orderIds = [...new Set(rows.map((payment) => payment.order_id).filter(Boolean))];
  if (orderIds.length === 0) return rows;

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, user_id')
    .in('id', orderIds);

  const orderRows = (orders ?? []) as OrderLite[];
  const orderMap = new Map(orderRows.map((order) => [order.id, order]));
  const userIds = [...new Set(orderRows.map((order) => order.user_id).filter(Boolean))] as string[];
  let userMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .in('id', userIds);
    userMap = new Map(((users ?? []) as UserLite[]).map((user) => [user.id, user.email]));
  }

  return rows.map((payment) => {
    const order = orderMap.get(payment.order_id);
    return {
      ...payment,
      order_number: order?.order_number,
      user_email: order?.user_id ? userMap.get(order.user_id) ?? '' : '',
    };
  });
}

function buildTrend(rows: Array<{ status: string; amount: number; created_at: string }>) {
  const start = new Date();
  start.setDate(start.getDate() - 13);
  start.setHours(0, 0, 0, 0);

  const dayMap = new Map<string, { amount: number; count: number; label: string }>();
  for (let i = 0; i < 14; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    dayMap.set(formatDateKey(day), { amount: 0, count: 0, label: formatDayLabel(day) });
  }

  rows.forEach((row) => {
    if (row.status !== 'success') return;
    const key = formatDateKey(new Date(row.created_at));
    const entry = dayMap.get(key);
    if (!entry) return;
    entry.amount += Number(row.amount) || 0;
    entry.count += 1;
  });

  return [...dayMap.values()].map((entry) => ({
    day: entry.label,
    amount: entry.amount,
    count: entry.count,
  }));
}

function PaymentTrend({ data }: { data: PaymentTrendPoint[] }) {
  const maxAmount = Math.max(...data.map((point) => point.amount), 1);

  return (
    <div className="mt-4">
      <div className="flex h-56 items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 pb-8 pt-4">
        {data.map((point) => {
          const height = point.amount > 0 ? Math.max((point.amount / maxAmount) * 100, 6) : 0;
          return (
            <div key={point.day} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[22px] rounded-t-md bg-gradient-to-b from-blue-500 to-blue-600 transition-all"
                style={{ height: `${height}%` }}
              />
              <div className="absolute bottom-[-22px] text-[9px] text-slate-400">{point.day}</div>
              <div className="pointer-events-none absolute bottom-full mb-2 hidden rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white shadow-lg group-hover:block">
                {formatMoney(point.amount)} / {point.count} 笔
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-right text-xs font-semibold text-slate-700 ${mono ? 'font-mono' : ''}`}>{value || '-'}</span>
    </div>
  );
}

function PaymentDetailModal({ payment, onClose }: { payment: DBPayment; onClose: () => void }) {
  const Icon = StatusIcon[payment.status] || CheckCircle;
  const gatewayText = payment.gateway_response ? JSON.stringify(payment.gateway_response, null, 2) : '';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-slate-900">支付详情</div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-400">{payment.transaction_id || payment.id}</div>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <div className="mb-4 flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle[payment.status] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
              <Icon size={12} />
              {statusMap[payment.status] || payment.status}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {formatMoney(Number(payment.amount))}
            </span>
          </div>
          <DetailRow label="关联订单" value={payment.order_number || payment.order_id} mono />
          <DetailRow label="客户" value={payment.user_email || payment.card_holder_name || '-'} />
          <DetailRow label="支付方式" value={paymentMethodLabel(payment.payment_method)} />
          <DetailRow label="卡号" value={maskCard(payment.card_last4)} mono />
          <DetailRow label="持卡人" value={payment.card_holder_name || '-'} />
          <DetailRow label="创建时间" value={formatTime(payment.created_at)} />
          {gatewayText && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">网关响应</div>
              <pre className="max-h-48 overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100">
                {gatewayText}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderFieldInput({
  field,
  provider,
  onChange,
}: {
  field: PaymentProviderField;
  provider: PaymentProviderConfig;
  onChange: (key: PaymentProviderFieldKey, value: string) => void;
}) {
  const value = String(provider[field.key] ?? '');
  const baseClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-300 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[11px] font-semibold text-slate-500">
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </span>
      {field.type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          rows={2}
          className={`${baseClass} resize-none`}
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          placeholder={field.placeholder}
          className={baseClass}
        />
      )}
    </label>
  );
}

function ProviderConfigCard({
  provider,
  onChange,
  secretDrafts,
  secretStatus,
  onSecretChange,
}: {
  provider: PaymentProviderConfig;
  onChange: (id: PaymentProviderId, patch: Partial<PaymentProviderConfig>) => void;
  secretDrafts: Partial<Record<PaymentSecretName, string>>;
  secretStatus: PaymentSecretStatus[];
  onSecretChange: (providerId: PaymentProviderId, secretName: PaymentSecretName, value: string) => void;
}) {
  const meta = PAYMENT_PROVIDER_META[provider.id];
  const configured = isPaymentProviderConfigured(provider);
  const missingFields = getMissingPaymentFields(provider);
  const isDevOnly = provider.id === 'dev_card';
  const isManual = provider.id === 'cod';
  const secretFields = PAYMENT_SECRET_FIELDS.filter((field) => field.providerId === provider.id);
  const missingSecrets = secretFields.filter((field) => (
    !secretStatus.some((status) => status.providerId === provider.id && status.secretName === field.secretName && status.exists)
  ));

  const statusText = !provider.enabled
    ? '未启用'
      : configured && missingSecrets.length === 0
        ? isDevOnly
          ? '开发测试可用'
          : isManual
            ? '人工收款可用'
            : '配置完整'
      : '缺少配置';

  const statusClass = !provider.enabled
    ? 'border-slate-200 bg-slate-50 text-slate-500'
    : configured && missingSecrets.length === 0
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{meta.title}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {meta.badge}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>
              {statusText}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{meta.desc}</p>
        </div>
        <AdminSwitch
          enabled={provider.enabled}
          onChange={() => onChange(provider.id, { enabled: !provider.enabled })}
          label={`${provider.label} 启用状态`}
        />
      </div>

      <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-[11px] leading-5 text-blue-700">
        {meta.docsHint}
      </div>

      {!isDevOnly && !isManual && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-semibold text-slate-500">环境</span>
            <select
              value={provider.environment}
              onChange={(event) => onChange(provider.id, { environment: event.target.value as PaymentProviderConfig['environment'] })}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="test">测试环境</option>
              <option value="live">生产环境</option>
            </select>
          </label>
          <ProviderFieldInput
            field={{ key: 'settlementCurrency', label: '默认币种', placeholder: 'USD / EUR / CNY', required: true }}
            provider={provider}
            onChange={(key, value) => onChange(provider.id, { [key]: value })}
          />
        </div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {meta.fields
          .filter((field) => !(field.key === 'settlementCurrency' && !isManual))
          .filter((field) => !hiddenConfigFieldKeys.has(field.key))
          .map((field) => (
            <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              <ProviderFieldInput
                field={field}
                provider={provider}
                onChange={(key, value) => onChange(provider.id, { [key]: value })}
              />
            </div>
          ))}
      </div>

      {secretFields.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">支付密钥</div>
          <div className="grid gap-3 md:grid-cols-2">
            {secretFields.map((field) => {
              const status = secretStatus.find((item) => item.providerId === provider.id && item.secretName === field.secretName);
              return (
                <label key={field.secretName} className="block">
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-500">
                    <span>{field.label}</span>
                    {status?.exists && (
                      <span className="font-mono text-[10px] text-emerald-600">已保存 {status.maskedHint}</span>
                    )}
                  </span>
                  <input
                    type="password"
                    value={secretDrafts[field.secretName] ?? ''}
                    onChange={(event) => onSecretChange(provider.id, field.secretName, event.target.value)}
                    placeholder={status?.exists ? '留空则保留已保存密钥' : field.placeholder}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 placeholder-slate-300 transition-colors focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-400">
            密钥会提交到后端函数加密保存，不会写入前端配置，也不会回显明文。
          </div>
        </div>
      )}

      {provider.enabled && (missingFields.length > 0 || missingSecrets.length > 0) && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
          还缺少：{[...missingFields, ...missingSecrets.map((field) => field.label)].join('、')}
        </div>
      )}
    </div>
  );
}

function PaymentConfigPanel({
  settings,
  loading,
  saving,
  secretStatusWarning,
  secretDrafts,
  secretStatus,
  onProviderChange,
  onSecretChange,
  onSave,
}: {
  settings: PaymentSettings;
  loading: boolean;
  saving: boolean;
  secretStatusWarning: string;
  secretDrafts: Partial<Record<PaymentProviderId, Partial<Record<PaymentSecretName, string>>>>;
  secretStatus: PaymentSecretStatus[];
  onProviderChange: (id: PaymentProviderId, patch: Partial<PaymentProviderConfig>) => void;
  onSecretChange: (providerId: PaymentProviderId, secretName: PaymentSecretName, value: string) => void;
  onSave: () => void;
}) {
  const enabledCount = settings.providers.filter((provider) => provider.enabled).length;
  const configuredCount = settings.providers.filter((provider) => (
    provider.enabled
    && isPaymentProviderConfigured(provider)
    && PAYMENT_SECRET_FIELDS
      .filter((field) => field.providerId === provider.id)
      .every((field) => secretStatus.some((status) => status.providerId === provider.id && status.secretName === field.secretName && status.exists))
  )).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <KeyRound size={16} className="text-blue-600" />
              支付渠道配置
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
              可配置真实支付服务商的公开参数和密钥。密钥会提交到后端函数加密保存，开发测试卡支付会继续保留。
            </p>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save size={13} />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-lg font-bold text-slate-800">{settings.providers.length}</div>
            <div className="text-[11px] text-slate-500">可配置渠道</div>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
            <div className="text-lg font-bold text-blue-700">{enabledCount}</div>
            <div className="text-[11px] text-blue-600">已启用渠道</div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
            <div className="text-lg font-bold text-emerald-700">{configuredCount}</div>
            <div className="text-[11px] text-emerald-600">配置完整渠道</div>
          </div>
        </div>
      </div>

      {secretStatusWarning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold">支付密钥状态暂时无法读取</div>
              <div className="mt-0.5">{secretStatusWarning}</div>
              <div className="mt-1 text-amber-700">普通支付流水、开发测试支付不受影响；真实 Stripe / PayPal 密钥保存需要该后端函数可用。</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {settings.providers.map((provider) => (
          <ProviderConfigCard
            key={provider.id}
            provider={provider}
            onChange={onProviderChange}
            secretDrafts={secretDrafts[provider.id] ?? {}}
            secretStatus={secretStatus}
            onSecretChange={onSecretChange}
          />
        ))}
      </div>
    </div>
  );
}

export default function PaymentInfo() {
  const [activeTab, setActiveTab] = useState<PaymentTab>('overview');
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<DBPayment | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState<PaymentStats>(emptyStats);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => mergePaymentSettings());
  const [secretDrafts, setSecretDrafts] = useState<Partial<Record<PaymentProviderId, Partial<Record<PaymentSecretName, string>>>>>({});
  const [secretStatus, setSecretStatus] = useState<PaymentSecretStatus[]>([]);
  const [secretStatusWarning, setSecretStatusWarning] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, count, error } = await supabase
        .from('payments')
        .select(PAYMENT_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (error) throw error;
      const paymentRows = await hydratePayments((data ?? []) as DBPayment[]);
      setPayments(paymentRows);
      setTotal(count ?? 0);
    } catch (error) {
      setPayments([]);
      setTotal(0);
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '支付记录加载失败' });
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    let ignore = false;

    async function loadPaymentSettings() {
      setSettingsLoading(true);
      setSecretStatusWarning('');
      try {
        const settings = await fetchPaymentSettings();
        if (!ignore) {
          setPaymentSettings(settings);
        }
      } catch (error) {
        if (!ignore) {
          setMessage({ type: 'error', text: error instanceof Error ? error.message : '支付配置加载失败' });
        }
      } finally {
        if (!ignore) setSettingsLoading(false);
      }

      try {
        const statuses = await fetchPaymentSecretStatus();
        if (!ignore) setSecretStatus(statuses);
      } catch (error) {
        if (!ignore) {
          setSecretStatus([]);
          setSecretStatusWarning(error instanceof Error ? error.message : '支付密钥后端函数暂不可用');
        }
      }
    }

    loadPaymentSettings();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadStats() {
      const { data } = await supabase
        .from('payments')
        .select('status, amount, created_at');

      if (ignore || !data) return;
      const rows = data as Array<{ status: string; amount: number; created_at: string }>;
      const successItems = rows.filter((payment) => payment.status === 'success');
      const totalVol = rows.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const successVol = successItems.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
      const successRate = rows.length > 0 ? (successItems.length / rows.length) * 100 : 0;

      setStats({
        totalVol,
        successVol,
        successRate,
        failedCount: rows.filter((payment) => payment.status === 'failed').length,
        pendingCount: rows.filter((payment) => payment.status === 'pending').length,
        refundedCount: rows.filter((payment) => payment.status === 'refunded').length,
        trend: buildTrend(rows),
      });
    }

    loadStats();
    return () => {
      ignore = true;
    };
  }, [payments]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeMeta = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const ActiveIcon = activeMeta.icon;

  const pageNumbers = useMemo(() => {
    return Array.from({ length: Math.min(totalPages, 7) }, (_, index) => {
      if (totalPages <= 7) return index;
      if (page <= 3) return index;
      if (page >= totalPages - 4) return totalPages - 7 + index;
      return page - 3 + index;
    });
  }, [page, totalPages]);

  const overviewCards = useMemo(() => ([
    { label: '交易总额', value: formatMoney(stats.totalVol), sub: '全部支付流水', icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '成功金额', value: formatMoney(stats.successVol), sub: `成功率 ${stats.successRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: '交易笔数', value: total.toLocaleString(), sub: '全部支付记录', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '异常/退款', value: (stats.failedCount + stats.refundedCount).toLocaleString(), sub: '失败和退款记录', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ]), [stats, total]);

  const anomalyRows = [
    { label: '待处理支付', value: stats.pendingCount, tone: 'text-blue-700 bg-blue-50 border-blue-100' },
    { label: '失败支付', value: stats.failedCount, tone: 'text-red-700 bg-red-50 border-red-100' },
    { label: '已退款支付', value: stats.refundedCount, tone: 'text-amber-700 bg-amber-50 border-amber-100' },
  ];

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(PAYMENT_SELECT)
        .order('created_at', { ascending: false })
        .range(0, 9999);

      if (error) throw error;
      const rows = await hydratePayments((data ?? []) as DBPayment[]);
      if (rows.length === 0) {
        setMessage({ type: 'error', text: '当前没有可导出的支付流水。' });
        return;
      }

      const csvRows = rows.map((payment) => ({
        交易号: payment.transaction_id || payment.id,
        关联订单: payment.order_number || payment.order_id,
        客户: payment.user_email || payment.card_holder_name || '',
        支付方式: paymentMethodLabel(payment.payment_method),
        卡号: maskCard(payment.card_last4),
        金额: Number(payment.amount).toFixed(2),
        状态: statusMap[payment.status] || payment.status,
        创建时间: formatTime(payment.created_at),
      }));

      downloadText(
        `shopnova-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        `\uFEFF${toCsv(csvRows)}`,
        'text/csv;charset=utf-8',
      );
      setMessage({ type: 'success', text: `已导出 ${rows.length} 笔支付流水。` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '导出流水失败' });
    } finally {
      setExporting(false);
    }
  };

  const handleProviderChange = (id: PaymentProviderId, patch: Partial<PaymentProviderConfig>) => {
    setPaymentSettings((current) => ({
      ...current,
      providers: current.providers.map((provider) => (
        provider.id === id ? { ...provider, ...patch } : provider
      )),
    }));
  };

  const handleSecretDraftChange = (providerId: PaymentProviderId, secretName: PaymentSecretName, value: string) => {
    setSecretDrafts((current) => ({
      ...current,
      [providerId]: {
        ...(current[providerId] ?? {}),
        [secretName]: value,
      },
    }));
  };

  const handleSavePaymentSettings = async () => {
    setSettingsSaving(true);
    setMessage(null);
    try {
      const secretPayloads = (Object.entries(secretDrafts) as Array<[PaymentProviderId, Partial<Record<PaymentSecretName, string>>]>)
        .filter(([, secrets]) => Object.values(secrets).some((value) => value?.trim()));
      const adminPassword = secretPayloads.length > 0
        ? window.prompt('请输入当前管理员密码，用于确认保存支付密钥。')
        : '';
      if (secretPayloads.length > 0 && !adminPassword?.trim()) {
        throw new Error('保存支付密钥需要管理员密码确认');
      }

      let latestSecretStatus: PaymentSecretStatus[] | null = null;
      for (const [providerId, secrets] of secretPayloads) {
        latestSecretStatus = await saveProviderSecrets(providerId, secrets, adminPassword ?? '');
      }
      if (latestSecretStatus) {
        setSecretStatus(latestSecretStatus);
        setSecretStatusWarning('');
      }

      await savePaymentSettings(paymentSettings);
      const next = mergePaymentSettings({
        ...paymentSettings,
        updatedAt: new Date().toISOString(),
      });
      setPaymentSettings(next);
      setSecretDrafts({});
      setMessage({
        type: 'success',
        text: secretPayloads.length > 0 ? '支付渠道配置已保存。密钥已由后端加密保存。' : '支付渠道配置已保存。',
      });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存支付配置失败' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const renderRecords = () => (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
        <span className="text-xs font-semibold text-slate-700">支付流水记录</span>
        <span className="text-xs text-slate-400">共 {total} 笔</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['交易号', '关联订单', '客户', '支付方式', '卡号', '金额', '状态', '时间', '操作'].map((column) => (
                <th key={column} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, row) => (
                <tr key={row} className="border-b border-slate-50">
                  {[...Array(9)].map((_, cell) => (
                    <td key={cell} className="px-4 py-3"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>
                  ))}
                </tr>
              ))
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  <CreditCard size={28} className="mx-auto mb-2 text-slate-200" />
                  暂无支付记录
                </td>
              </tr>
            ) : (
              payments.map((payment) => {
                const Icon = StatusIcon[payment.status] || CheckCircle;
                return (
                  <tr key={payment.id} className="border-b border-slate-50 transition-colors hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-blue-700">{payment.transaction_id || payment.id.slice(0, 8)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{payment.order_number || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{payment.user_email || payment.card_holder_name || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{paymentMethodLabel(payment.payment_method)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-500">{maskCard(payment.card_last4)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-800">{formatMoney(payment.amount)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusStyle[payment.status] || 'border-slate-200 bg-slate-100 text-slate-600'}`}>
                        <Icon size={10} />
                        {statusMap[payment.status] || payment.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{formatTime(payment.created_at)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Eye size={12} />
                        详情
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
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
          <span className="text-xs text-slate-400">第 {page + 1} / {totalPages} 页，共 {total} 笔支付</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft size={13} />
            </button>
            {pageNumbers.map((pageIndex) => (
              <button key={pageIndex} onClick={() => setPage(pageIndex)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${pageIndex === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {pageIndex + 1}
              </button>
            ))}
            <button onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">支付管理</h2>
          <p className="mt-0.5 text-xs text-slate-400">管理支付流水、真实支付渠道配置，并保留开发测试支付方式。</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || total === 0}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={12} />
          {exporting ? '导出中...' : '导出流水'}
        </button>
      </div>

      {message && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs font-bold text-slate-500">支付功能</div>
          </div>
          <div className="space-y-1 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                    isActive ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{tab.label}</div>
                    <div className="truncate text-[11px] text-slate-400">{tab.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div className="rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-2">
              <ActiveIcon size={17} className="text-blue-600" />
              <div>
                <div className="text-sm font-bold text-slate-800">{activeMeta.label}</div>
                <div className="mt-0.5 text-xs text-slate-400">{activeMeta.desc}</div>
              </div>
            </div>
          </div>

          {activeTab === 'overview' && (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {overviewCards.map((card) => (
                  <div key={card.label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${card.bg}`}>
                      <card.icon size={18} className={card.color} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-slate-800">{card.value}</div>
                      <div className="text-[11px] text-slate-500">{card.label}</div>
                      <div className="text-[10px] text-slate-400">{card.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-800">近 14 天成功支付趋势</div>
                  <PaymentTrend data={stats.trend} />
                </div>
                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="text-sm font-bold text-slate-800">支付状态复查</div>
                  <div className="mt-4 space-y-3">
                    {anomalyRows.some((row) => row.value > 0) ? anomalyRows.map((row) => (
                      <div key={row.label} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${row.tone}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={14} />
                          {row.label}
                        </div>
                        <span className="font-bold">{row.value}</span>
                      </div>
                    )) : (
                      <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <CheckCircle size={14} />
                        暂无需要复查的支付状态
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'records' && renderRecords()}

          {activeTab === 'config' && (
            <PaymentConfigPanel
              settings={paymentSettings}
              loading={settingsLoading}
              saving={settingsSaving}
              secretStatusWarning={secretStatusWarning}
              secretDrafts={secretDrafts}
              secretStatus={secretStatus}
              onProviderChange={handleProviderChange}
              onSecretChange={handleSecretDraftChange}
              onSave={handleSavePaymentSettings}
            />
          )}
        </main>
      </div>

      {selectedPayment && <PaymentDetailModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  );
}
