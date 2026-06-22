import { supabase } from './supabase';
import { getSessionUser } from './authService';

export type PaymentProviderId =
  | 'dev_card'
  | 'stripe'
  | 'paypal'
  | 'cod';

export type PaymentEnvironment = 'test' | 'live';

export interface PaymentProviderConfig {
  id: PaymentProviderId;
  enabled: boolean;
  environment: PaymentEnvironment;
  label: string;
  settlementCurrency: string;
  publicKey: string;
  clientId: string;
  merchantId: string;
  appId: string;
  gatewayMerchantId: string;
  webhookUrl: string;
  secretKeyRef: string;
  webhookSecretRef: string;
  certificateRef: string;
  countries: string;
  maxAmount: string;
  notes: string;
  updatedAt?: string;
}

export interface PaymentSettings {
  providers: PaymentProviderConfig[];
  updatedAt?: string;
}

export type StorefrontPaymentMethod = 'card' | 'stripe' | 'paypal' | 'cod';

export interface StorefrontPaymentOption {
  id: StorefrontPaymentMethod;
  providerId: PaymentProviderId;
  label: string;
  notice: string;
}

export type PaymentSecretName =
  | 'stripe_secret_key'
  | 'stripe_webhook_secret'
  | 'paypal_client_secret'
  | 'paypal_webhook_id';

export interface PaymentSecretField {
  providerId: PaymentProviderId;
  secretName: PaymentSecretName;
  label: string;
  placeholder: string;
}

export interface PaymentSecretStatus {
  providerId: PaymentProviderId;
  secretName: PaymentSecretName;
  exists: boolean;
  maskedHint: string;
  updatedAt: string | null;
}

export type PaymentProviderFieldKey =
  | 'settlementCurrency'
  | 'publicKey'
  | 'clientId'
  | 'merchantId'
  | 'appId'
  | 'gatewayMerchantId'
  | 'webhookUrl'
  | 'secretKeyRef'
  | 'webhookSecretRef'
  | 'certificateRef'
  | 'countries'
  | 'maxAmount'
  | 'notes';

export interface PaymentProviderField {
  key: PaymentProviderFieldKey;
  label: string;
  placeholder: string;
  required?: boolean;
  type?: 'text' | 'url' | 'number' | 'textarea';
}

export interface PaymentProviderMeta {
  id: PaymentProviderId;
  title: string;
  desc: string;
  badge: string;
  docsHint: string;
  fields: PaymentProviderField[];
}

type SettingsData = Record<string, unknown> & {
  paymentSettings?: Partial<PaymentSettings>;
};

export const PAYMENT_PROVIDER_META: Record<PaymentProviderId, PaymentProviderMeta> = {
  dev_card: {
    id: 'dev_card',
    title: '开发测试卡支付',
    desc: '本地开发和演示用，不调用真实支付网关。',
    badge: 'DEV',
    docsHint: '测试卡号继续可用，支付流水写入本项目 payments 表。',
    fields: [
      { key: 'notes', label: '内部备注', placeholder: '例如：仅允许开发、演示环境使用', type: 'textarea' },
    ],
  },
  stripe: {
    id: 'stripe',
    title: 'Stripe 银行卡',
    desc: '用于银行卡、Link 以及可由 Stripe 承载的钱包支付。',
    badge: 'Cards',
    docsHint: 'Secret key 和 webhook signing secret 在下方密钥区保存，后台加密存储。',
    fields: [
      { key: 'settlementCurrency', label: '结算币种', placeholder: 'USD / EUR / CNY', required: true },
      { key: 'publicKey', label: 'Publishable key', placeholder: 'pk_test_... / pk_live_...', required: true },
      { key: 'secretKeyRef', label: 'Secret key 环境变量', placeholder: 'STRIPE_SECRET_KEY', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://example.com/api/payments/stripe/webhook', required: true, type: 'url' },
      { key: 'webhookSecretRef', label: 'Webhook secret 环境变量', placeholder: 'STRIPE_WEBHOOK_SECRET', required: true },
      { key: 'notes', label: '内部备注', placeholder: '例如：生产环境使用 Stripe Checkout', type: 'textarea' },
    ],
  },
  paypal: {
    id: 'paypal',
    title: 'PayPal',
    desc: 'PayPal Checkout / REST API 应用配置。',
    badge: 'Wallet',
    docsHint: 'Client secret 和 Webhook ID 在下方密钥区保存，后台加密存储。',
    fields: [
      { key: 'settlementCurrency', label: '结算币种', placeholder: 'USD / EUR / CNY', required: true },
      { key: 'clientId', label: 'Client ID', placeholder: 'PayPal app client ID', required: true },
      { key: 'secretKeyRef', label: 'Client secret 环境变量', placeholder: 'PAYPAL_CLIENT_SECRET', required: true },
      { key: 'webhookUrl', label: 'Webhook URL', placeholder: 'https://example.com/api/payments/paypal/webhook', required: true, type: 'url' },
      { key: 'webhookSecretRef', label: 'Webhook ID / Secret 引用', placeholder: 'PAYPAL_WEBHOOK_ID' },
      { key: 'notes', label: '内部备注', placeholder: '例如：使用 PayPal Orders API', type: 'textarea' },
    ],
  },
  cod: {
    id: 'cod',
    title: '货到付款',
    desc: '无需网关，但需要运营人工确认收款。',
    badge: 'Manual',
    docsHint: '订单创建后支付状态保持待处理，后台确认收款后再改为已支付。',
    fields: [
      { key: 'countries', label: '可用国家/地区', placeholder: 'CN' },
      { key: 'maxAmount', label: '最高订单金额', placeholder: '2000', type: 'number' },
      { key: 'notes', label: '内部备注', placeholder: '例如：仅限中国大陆，超过金额自动转风险订单', type: 'textarea' },
    ],
  },
};

export const PAYMENT_SECRET_FIELDS: PaymentSecretField[] = [
  {
    providerId: 'stripe',
    secretName: 'stripe_secret_key',
    label: 'Stripe Secret Key',
    placeholder: 'sk_test_... / sk_live_...',
  },
  {
    providerId: 'stripe',
    secretName: 'stripe_webhook_secret',
    label: 'Stripe Webhook Secret',
    placeholder: 'whsec_...',
  },
  {
    providerId: 'paypal',
    secretName: 'paypal_client_secret',
    label: 'PayPal Client Secret',
    placeholder: 'PayPal App Secret',
  },
  {
    providerId: 'paypal',
    secretName: 'paypal_webhook_id',
    label: 'PayPal Webhook ID',
    placeholder: 'Webhook ID',
  },
];

const hiddenConfigFields = new Set<PaymentProviderFieldKey>(['secretKeyRef', 'webhookSecretRef', 'certificateRef']);

export const DEFAULT_PAYMENT_PROVIDERS: PaymentProviderConfig[] = [
  {
    id: 'dev_card',
    enabled: true,
    environment: 'test',
    label: PAYMENT_PROVIDER_META.dev_card.title,
    settlementCurrency: 'USD',
    publicKey: '',
    clientId: '',
    merchantId: '',
    appId: '',
    gatewayMerchantId: '',
    webhookUrl: '',
    secretKeyRef: '',
    webhookSecretRef: '',
    certificateRef: '',
    countries: '',
    maxAmount: '',
    notes: '开发测试支付方式保留，用于本地演示与验收。',
  },
  ...(['stripe', 'paypal'] as PaymentProviderId[]).map((id) => ({
    id,
    enabled: false,
    environment: 'test' as PaymentEnvironment,
    label: PAYMENT_PROVIDER_META[id].title,
    settlementCurrency: 'USD',
    publicKey: '',
    clientId: '',
    merchantId: '',
    appId: '',
    gatewayMerchantId: '',
    webhookUrl: '',
    secretKeyRef: '',
    webhookSecretRef: '',
    certificateRef: '',
    countries: '',
    maxAmount: '',
    notes: '',
  })),
  {
    id: 'cod',
    enabled: true,
    environment: 'test',
    label: PAYMENT_PROVIDER_META.cod.title,
    settlementCurrency: 'USD',
    publicKey: '',
    clientId: '',
    merchantId: '',
    appId: '',
    gatewayMerchantId: '',
    webhookUrl: '',
    secretKeyRef: '',
    webhookSecretRef: '',
    certificateRef: '',
    countries: 'CN',
    maxAmount: '2000',
    notes: '需后台人工确认收款。',
  },
];

export function mergePaymentSettings(saved?: Partial<PaymentSettings>): PaymentSettings {
  const savedProviders = new Map((saved?.providers ?? []).map((provider) => [provider.id, provider]));
  return {
    providers: DEFAULT_PAYMENT_PROVIDERS.map((provider) => ({
      ...provider,
      ...savedProviders.get(provider.id),
      id: provider.id,
      label: PAYMENT_PROVIDER_META[provider.id].title,
    })),
    updatedAt: saved?.updatedAt,
  };
}

export function isPaymentProviderConfigured(provider: PaymentProviderConfig) {
  if (provider.id === 'dev_card' || provider.id === 'cod') return true;
  const fields = PAYMENT_PROVIDER_META[provider.id].fields.filter((field) => field.required && !hiddenConfigFields.has(field.key));
  return fields.every((field) => String(provider[field.key] ?? '').trim().length > 0);
}

export function getMissingPaymentFields(provider: PaymentProviderConfig) {
  return PAYMENT_PROVIDER_META[provider.id].fields
    .filter((field) => field.required && !hiddenConfigFields.has(field.key) && !String(provider[field.key] ?? '').trim())
    .map((field) => field.label);
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const { data, error } = await supabase.functions.invoke('payment-admin', {
    body: {
      action: 'get',
      adminUserId: sessionUser.id,
      adminSessionToken: sessionUser.session_token,
    },
  });

  const response = data as { paymentSettings?: Partial<PaymentSettings>; error?: string } | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '读取支付配置失败');
  return mergePaymentSettings(response?.paymentSettings);
}

export async function savePaymentSettings(settings: PaymentSettings) {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const nextPaymentSettings: PaymentSettings = {
    providers: settings.providers.map((provider) => ({
      ...provider,
      updatedAt: new Date().toISOString(),
    })),
    updatedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase.functions.invoke('payment-admin', {
    body: {
      action: 'save',
      adminUserId: sessionUser.id,
      adminSessionToken: sessionUser.session_token,
      paymentSettings: nextPaymentSettings,
    },
  });

  const response = data as { error?: string } | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '保存支付配置失败');
}

export async function fetchPublicPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('providers, updated_at')
    .eq('id', 'default')
    .maybeSingle();

  if (!error && data) {
    return mergePaymentSettings({
      providers: data.providers as PaymentProviderConfig[],
      updatedAt: data.updated_at,
    });
  }

  const { data: legacyData } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const settingsData = (legacyData?.settings_data ?? {}) as SettingsData;
  return mergePaymentSettings(settingsData.paymentSettings);
}

export function buildStorefrontPaymentOptions(settings: PaymentSettings): StorefrontPaymentOption[] {
  const providers = new Map(settings.providers.map((provider) => [provider.id, provider]));
  const devCard = providers.get('dev_card');
  const stripe = providers.get('stripe');
  const paypal = providers.get('paypal');
  const cod = providers.get('cod');
  const options: StorefrontPaymentOption[] = [];

  if (!devCard || devCard.enabled) {
    options.push({
      id: 'card',
      providerId: 'dev_card',
      label: PAYMENT_PROVIDER_META.dev_card.title,
      notice: '这是开发测试支付方式，可输入测试卡号 4242 4242 4242 4242，不会调用真实支付网关。',
    });
  }

  if (stripe?.enabled && isPaymentProviderConfigured(stripe)) {
    options.push({
      id: 'stripe',
      providerId: 'stripe',
      label: PAYMENT_PROVIDER_META.stripe.title,
      notice: '将跳转到 Stripe 安全支付页完成真实扣款，支付成功后由 Webhook 更新订单。',
    });
  }

  if (paypal?.enabled && isPaymentProviderConfigured(paypal)) {
    options.push({
      id: 'paypal',
      providerId: 'paypal',
      label: PAYMENT_PROVIDER_META.paypal.title,
      notice: '将跳转到 PayPal 完成授权与扣款，支付成功后回写订单状态。',
    });
  }

  if (cod?.enabled) {
    options.push({
      id: 'cod',
      providerId: 'cod',
      label: PAYMENT_PROVIDER_META.cod.title,
      notice: cod.notes || PAYMENT_PROVIDER_META.cod.docsHint,
    });
  }

  return options;
}

export async function fetchStorefrontPaymentOptions(): Promise<StorefrontPaymentOption[]> {
  const settings = await fetchPublicPaymentSettings();
  return buildStorefrontPaymentOptions(settings);
}

export async function fetchPaymentSecretStatus(): Promise<PaymentSecretStatus[]> {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');
  const { data, error } = await supabase.functions.invoke('payment-secrets', {
    body: {
      action: 'status',
      adminUserId: sessionUser.id,
      adminSessionToken: sessionUser.session_token,
    },
  });
  if (error) throw new Error(formatPaymentSecretsFunctionError(error, '读取支付密钥状态失败'));
  return ((data as { secrets?: PaymentSecretStatus[] })?.secrets ?? []) as PaymentSecretStatus[];
}

export async function saveProviderSecrets(
  providerId: PaymentProviderId,
  secrets: Partial<Record<PaymentSecretName, string>>,
  adminPassword: string,
): Promise<PaymentSecretStatus[]> {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');
  const { data, error } = await supabase.functions.invoke('payment-secrets', {
    body: {
      action: 'save',
      adminUserId: sessionUser.id,
      adminSessionToken: sessionUser.session_token,
      adminPassword,
      providerId,
      secrets,
    },
  });
  if (error) throw new Error(formatPaymentSecretsFunctionError(error, '保存支付密钥失败'));
  return ((data as { secrets?: PaymentSecretStatus[] })?.secrets ?? []) as PaymentSecretStatus[];
}

function formatPaymentSecretsFunctionError(error: { message?: string }, fallback: string) {
  const message = error.message || '';
  if (message.includes('Failed to send a request to the Edge Function') || message.includes('FunctionsFetchError')) {
    return '支付密钥后端函数 payment-secrets 暂不可用。请先部署 Supabase Edge Function：payment-secrets。';
  }
  if (message.includes('not found') || message.includes('404')) {
    return '未找到支付密钥后端函数 payment-secrets，请先部署该 Supabase Edge Function。';
  }
  return message || fallback;
}
