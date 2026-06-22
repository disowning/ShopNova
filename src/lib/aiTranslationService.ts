import type { Locale } from '../i18n';
import { supabase } from './supabase';
import type {
  TranslationBatchPackage,
  TranslationExportMode,
  TranslationPackage,
  TranslationPackageItem,
} from './translationService';

export interface AiTranslationConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  temperature: number;
  batchSize: number;
}

export interface AiTranslationRunResult {
  pack: TranslationPackage;
  translatedFields: number;
  totalFields: number;
}

export interface AiTranslationBatchRunResult {
  batch: TranslationBatchPackage;
  translatedFields: number;
  totalFields: number;
}

export interface AiConfigValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  suggestedEndpoint?: string;
  providerLabel: string;
}

type TranslationItemGroup = keyof TranslationPackage['items'];

interface TranslationFieldRef {
  id: string;
  group: TranslationItemGroup;
  itemId: string;
  field: string;
  label: string;
  source: string;
  currentTarget: string;
}

interface ChatCompletionResponse {
  content?: string;
  error?: {
    message?: string;
  };
}

const STORAGE_KEY = 'shopnova-ai-translation-config';
const ITEM_GROUPS = ['products', 'categories', 'tags', 'ui', 'store', 'pages', 'cms'] as const satisfies readonly TranslationItemGroup[];
const LOCALE_NAMES: Record<Locale, string> = {
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  'en-US': 'English',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
};

export const DEFAULT_AI_TRANSLATION_CONFIG: AiTranslationConfig = {
  endpoint: 'https://api.openai.com/v1/chat/completions',
  model: 'gpt-4o-mini',
  apiKey: '',
  temperature: 0.2,
  batchSize: 30,
};

const CHAT_COMPLETIONS_PATH = '/chat/completions';
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODELS = new Set(['deepseek-v4-flash', 'deepseek-v4-pro', 'deepseek-chat', 'deepseek-reasoner']);

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function normalizeAiTranslationConfig(value: Partial<AiTranslationConfig> = {}): AiTranslationConfig {
  return {
    endpoint: typeof value.endpoint === 'string' ? value.endpoint.trim() : DEFAULT_AI_TRANSLATION_CONFIG.endpoint,
    model: typeof value.model === 'string' ? value.model.trim() : DEFAULT_AI_TRANSLATION_CONFIG.model,
    apiKey: typeof value.apiKey === 'string' ? value.apiKey.trim() : '',
    temperature: clampNumber(value.temperature, DEFAULT_AI_TRANSLATION_CONFIG.temperature, 0, 1),
    batchSize: Math.round(clampNumber(value.batchSize, DEFAULT_AI_TRANSLATION_CONFIG.batchSize, 5, 100)),
  };
}

export function loadAiTranslationConfig(): AiTranslationConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_TRANSLATION_CONFIG;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_AI_TRANSLATION_CONFIG;
    return normalizeAiTranslationConfig(JSON.parse(raw) as Partial<AiTranslationConfig>);
  } catch {
    return DEFAULT_AI_TRANSLATION_CONFIG;
  }
}

export function saveAiTranslationConfig(config: Partial<AiTranslationConfig>): AiTranslationConfig {
  const next = normalizeAiTranslationConfig(config);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, apiKey: '' }));
  }
  return next;
}

function getProviderLabel(url: URL | null) {
  if (!url) return '未知服务';
  const host = url.hostname.toLowerCase();
  if (host === 'api.deepseek.com') return 'DeepSeek';
  if (host === 'api.openai.com') return 'OpenAI';
  if (host === 'dashscope.aliyuncs.com' || host === 'dashscope-intl.aliyuncs.com') return '阿里云百炼 / Qwen';
  if (host === 'api.moonshot.ai') return 'Moonshot / Kimi';
  if (host === 'open.bigmodel.cn') return '智谱 GLM';
  if (host === 'qianfan.baidubce.com' || host === 'api.baiduqianfan.ai') return '百度千帆';
  if (host === 'ark.cn-beijing.volces.com') return '火山方舟 / 豆包';
  if (host === 'api.hunyuan.cloud.tencent.com') return '腾讯混元';
  if (host === 'api.minimax.io') return 'MiniMax';
  if (host === 'generativelanguage.googleapis.com') return 'Google Gemini';
  if (host === 'api.mistral.ai') return 'Mistral AI';
  if (host === 'api.groq.com') return 'Groq';
  if (host === 'api.x.ai') return 'xAI';
  if (host === 'api.together.xyz') return 'Together AI';
  if (host.includes('openrouter.ai')) return 'OpenRouter';
  if (host === 'localhost' || host === '127.0.0.1') return '本地代理';
  return 'OpenAI 兼容服务';
}

function isLocalEndpoint(url: URL | null) {
  if (!url) return false;
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1';
}

function suggestChatCompletionsEndpoint(url: URL) {
  if (url.hostname.toLowerCase() === 'api.deepseek.com') return DEEPSEEK_ENDPOINT;

  const next = new URL(url.toString());
  const path = next.pathname.replace(/\/+$/, '');
  if (path.endsWith('/v1')) {
    next.pathname = `${path}${CHAT_COMPLETIONS_PATH}`;
  } else if (!path.endsWith(CHAT_COMPLETIONS_PATH)) {
    next.pathname = `${path}${CHAT_COMPLETIONS_PATH}`.replace(/\/{2,}/g, '/');
  }
  next.search = '';
  next.hash = '';
  return next.toString();
}

export function validateAiTranslationConfig(configInput: Partial<AiTranslationConfig>): AiConfigValidationResult {
  const config = normalizeAiTranslationConfig(configInput);
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsedUrl: URL | null = null;
  let suggestedEndpoint: string | undefined;

  if (!config.endpoint) {
    errors.push('请先填写 AI 接口地址。');
  } else {
    try {
      parsedUrl = new URL(config.endpoint);
    } catch {
      errors.push('AI 接口地址格式不正确，请填写完整 URL，例如 https://api.deepseek.com/chat/completions。');
    }
  }

  const providerLabel = getProviderLabel(parsedUrl);

  if (parsedUrl) {
    const path = parsedUrl.pathname.replace(/\/+$/, '').toLowerCase();
    const isDeepSeek = parsedUrl.hostname.toLowerCase() === 'api.deepseek.com';
    const isAnthropicPath = path.includes('/anthropic');

    if (parsedUrl.protocol !== 'https:' && !isLocalEndpoint(parsedUrl)) {
      warnings.push('生产环境建议使用 HTTPS 接口地址。');
    }

    if (isAnthropicPath) {
      errors.push('当前 AI 翻译使用 OpenAI Chat Completions 格式，不能填 Anthropic 接口地址。DeepSeek 请改成 https://api.deepseek.com/chat/completions。');
      suggestedEndpoint = isDeepSeek ? DEEPSEEK_ENDPOINT : suggestChatCompletionsEndpoint(parsedUrl);
    } else if (!path.endsWith(CHAT_COMPLETIONS_PATH)) {
      suggestedEndpoint = suggestChatCompletionsEndpoint(parsedUrl);
      errors.push(`接口地址需要填写完整的 Chat Completions 请求地址，不能只填 base_url。建议使用：${suggestedEndpoint}`);
    }

    if (isDeepSeek) {
      if (!DEEPSEEK_MODELS.has(config.model)) {
        warnings.push('DeepSeek 当前常用模型是 deepseek-v4-flash 或 deepseek-v4-pro，请确认模型名称是否可用。');
      }
      if (config.model === 'deepseek-chat' || config.model === 'deepseek-reasoner') {
        warnings.push('deepseek-chat 和 deepseek-reasoner 是兼容旧名称，后续可能废弃，建议改用 deepseek-v4-flash 或 deepseek-v4-pro。');
      }
    }
  }

  if (!config.model) errors.push('请先填写 AI 模型名称。');
  if (config.apiKey) {
    warnings.push('API Key 只会用于本次浏览器会话，不会保存到本地。生产建议配置 Supabase Secret：AI_TRANSLATION_API_KEY。');
  } else if (!isLocalEndpoint(parsedUrl)) {
    warnings.push('未填写 API Key 时会使用 Supabase Secret：AI_TRANSLATION_API_KEY。');
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    suggestedEndpoint,
    providerLabel,
  };
}

function assertAiConfig(config: AiTranslationConfig) {
  const validation = validateAiTranslationConfig(config);
  if (!validation.ok) throw new Error(`AI 配置校验未通过：${validation.errors.join(' ')}`);
}

function shouldTranslateField(status: TranslationPackageItem['status'][string] | undefined, mode: TranslationExportMode) {
  if (mode === 'all') return true;
  if (mode === 'missing') return status === 'missing';
  if (mode === 'outdated') return status === 'outdated';
  return status === 'missing' || status === 'outdated';
}

function cloneItems(items: TranslationPackageItem[] | undefined) {
  return (items ?? []).map((item) => ({
    ...item,
    source: { ...item.source },
    target: { ...item.target },
    sourceHash: { ...item.sourceHash },
    status: { ...item.status },
  }));
}

function clonePackage(pack: TranslationPackage): TranslationPackage {
  return {
    ...pack,
    exportedAt: new Date().toISOString(),
    items: {
      products: cloneItems(pack.items.products),
      categories: cloneItems(pack.items.categories),
      tags: cloneItems(pack.items.tags),
      ui: cloneItems(pack.items.ui),
      store: cloneItems(pack.items.store),
      pages: cloneItems(pack.items.pages),
      cms: cloneItems(pack.items.cms),
    },
  };
}

function collectFields(pack: TranslationPackage): TranslationFieldRef[] {
  const fields: TranslationFieldRef[] = [];

  ITEM_GROUPS.forEach((group) => {
    (pack.items[group] ?? []).forEach((item) => {
      Object.entries(item.source).forEach(([field, source]) => {
        const sourceText = source.trim();
        if (!sourceText || !shouldTranslateField(item.status[field], pack.mode)) return;

        fields.push({
          id: `field_${fields.length + 1}`,
          group,
          itemId: item.id,
          field,
          label: item.label,
          source: sourceText,
          currentTarget: item.target[field] ?? '',
        });
      });
    });
  });

  return fields;
}

function chunkFields(fields: TranslationFieldRef[], size: number) {
  const chunks: TranslationFieldRef[][] = [];
  for (let index = 0; index < fields.length; index += size) {
    chunks.push(fields.slice(index, index + size));
  }
  return chunks;
}

function buildMessages(pack: TranslationPackage, fields: TranslationFieldRef[]) {
  const targetLanguage = LOCALE_NAMES[pack.targetLocale] ?? pack.targetLocale;
  const payload = {
    targetLocale: pack.targetLocale,
    targetLanguage,
    fields: fields.map((field) => ({
      id: field.id,
      label: field.label,
      field: field.field,
      source: field.source,
      currentTarget: field.currentTarget,
    })),
  };

  return [
    {
      role: 'system',
      content: [
        `Translate Simplified Chinese ecommerce copy into ${targetLanguage}.`,
        'Preserve placeholders, variables, URLs, emails, numbers, HTML tags, Markdown syntax, product codes, and line breaks.',
        'Return only JSON in this exact shape: {"translations":[{"id":"field_1","target":"translated text"}]}.',
        'Do not add comments, explanations, or extra keys.',
      ].join(' '),
    },
    {
      role: 'user',
      content: JSON.stringify(payload),
    },
  ];
}

function parseJsonFromText(text: string) {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.unshift(fenced[1].trim());

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error('AI 返回内容不是有效 JSON。');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseTranslations(content: string) {
  const parsed = parseJsonFromText(content);
  if (!isRecord(parsed) || !Array.isArray(parsed.translations)) {
    throw new Error('AI 返回 JSON 缺少 translations 数组。');
  }

  return parsed.translations.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== 'string') return [];
    const target = typeof item.target === 'string'
      ? item.target
      : typeof item.text === 'string'
        ? item.text
        : '';
    return target.trim() ? [{ id: item.id, target: target.trim() }] : [];
  });
}

async function requestAiTranslations(
  fields: TranslationFieldRef[],
  pack: TranslationPackage,
  config: AiTranslationConfig,
) {
  const { data, error } = await supabase.functions.invoke<ChatCompletionResponse>('ai-translate', {
    body: {
      endpoint: config.endpoint,
      model: config.model,
      temperature: config.temperature,
      messages: buildMessages(pack, fields),
      apiKey: config.apiKey || undefined,
    },
  });

  if (error || data?.error) {
    throw new Error(`AI 翻译请求失败：${data?.error?.message ?? error?.message ?? 'Edge Function 调用失败'}`);
  }

  const content = data?.content;
  if (!content) throw new Error('AI 接口没有返回翻译内容。');
  return parseTranslations(content);
}

export async function translatePackageWithAi(
  pack: TranslationPackage,
  configInput: Partial<AiTranslationConfig>,
): Promise<AiTranslationRunResult> {
  const config = normalizeAiTranslationConfig(configInput);
  assertAiConfig(config);

  if (pack.targetLocale === pack.sourceLocale) {
    throw new Error('AI 翻译请选择非源语言的目标语言。');
  }

  const nextPack = clonePackage(pack);
  const fields = collectFields(nextPack);
  const fieldById = new Map(fields.map((field) => [field.id, field]));
  const itemByKey = new Map<string, TranslationPackageItem>();

  ITEM_GROUPS.forEach((group) => {
    (nextPack.items[group] ?? []).forEach((item) => {
      itemByKey.set(`${group}:${item.id}`, item);
    });
  });

  let translatedFields = 0;
  for (const chunk of chunkFields(fields, config.batchSize)) {
    const translations = await requestAiTranslations(chunk, nextPack, config);
    translations.forEach((translation) => {
      const field = fieldById.get(translation.id);
      if (!field) return;
      const item = itemByKey.get(`${field.group}:${field.itemId}`);
      if (!item) return;
      item.target[field.field] = translation.target;
      item.status[field.field] = 'translated';
      translatedFields += 1;
    });
  }

  return {
    pack: nextPack,
    translatedFields,
    totalFields: fields.length,
  };
}

export async function translateBatchPackageWithAi(
  batch: TranslationBatchPackage,
  config: Partial<AiTranslationConfig>,
): Promise<AiTranslationBatchRunResult> {
  let translatedFields = 0;
  let totalFields = 0;
  const packages: TranslationPackage[] = [];

  for (const pack of batch.packages) {
    const result = await translatePackageWithAi(pack, config);
    packages.push(result.pack);
    translatedFields += result.translatedFields;
    totalFields += result.totalFields;
  }

  return {
    batch: {
      ...batch,
      exportedAt: new Date().toISOString(),
      packages,
    },
    translatedFields,
    totalFields,
  };
}
