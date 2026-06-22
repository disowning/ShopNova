import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  Download,
  FileJson,
  FileText,
  Package,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  Store,
  Upload,
} from 'lucide-react';
import type { Locale } from '../i18n';
import {
  loadAiTranslationConfig,
  saveAiTranslationConfig,
  translateBatchPackageWithAi,
  translatePackageWithAi,
  validateAiTranslationConfig,
  type AiTranslationConfig,
} from '../lib/aiTranslationService';
import {
  exportTranslationBatchPackage,
  exportTranslationPackage,
  getTranslationStats,
  importTranslationPackage,
  type TranslationExportOptions,
  type TranslationExportMode,
  type TranslationPackage,
} from '../lib/translationService';

type TranslationSection = 'catalog' | 'ui' | 'store' | 'pages' | 'cms';

interface Stats {
  total: number;
  translated: number;
  outdated: number;
  missing: number;
}

type TranslationTask = {
  id: string;
  section: TranslationSection;
  title: string;
  path: string;
  status: 'available' | 'planned';
  desc: string;
  examples: string[];
  updatedAt: string;
  exportOptions: Omit<TranslationExportOptions, 'targetLocale' | 'sourceLocale' | 'mode'>;
};

type AiPresetRegion = 'domestic' | 'overseas';

type AiProviderPreset = {
  id: string;
  region: AiPresetRegion;
  label: string;
  provider: string;
  model: string;
  endpoint: string;
  note: string;
};

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'zh-TW', label: '繁體中文' },
];

const allLocaleOptions: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文（源文案）' },
  ...localeOptions,
];

const contentLocaleOptions: { value: Locale; label: string }[] = localeOptions;

const modeOptions: { value: TranslationExportMode; label: string; desc: string }[] = [
  { value: 'missing_or_outdated', label: '待翻译和已过期', desc: '日常最常用，只导出需要处理的内容' },
  { value: 'missing', label: '仅未翻译', desc: '只导出目标语言为空的字段' },
  { value: 'outdated', label: '仅已过期', desc: '只导出中文已改动的字段' },
  { value: 'all', label: '全部内容', desc: '完整备份或全量重翻时使用' },
];

const aiProviderPresets: AiProviderPreset[] = [
  {
    id: 'deepseek-flash',
    region: 'domestic',
    label: 'DeepSeek Flash',
    provider: 'DeepSeek',
    model: 'deepseek-v4-flash',
    endpoint: 'https://api.deepseek.com/chat/completions',
    note: '国内常用，成本友好',
  },
  {
    id: 'qwen-plus',
    region: 'domestic',
    label: 'Qwen Plus',
    provider: '阿里云百炼',
    model: 'qwen-plus',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    note: '中文和电商文案稳定',
  },
  {
    id: 'kimi',
    region: 'domestic',
    label: 'Kimi',
    provider: 'Moonshot',
    model: 'kimi-k2.6',
    endpoint: 'https://api.moonshot.ai/v1/chat/completions',
    note: '长文本处理能力强',
  },
  {
    id: 'glm-flash',
    region: 'domestic',
    label: 'GLM Flash',
    provider: '智谱 GLM',
    model: 'glm-4-flash',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    note: '中文场景备选',
  },
  {
    id: 'qianfan',
    region: 'domestic',
    label: '千帆 Chat',
    provider: '百度千帆',
    model: 'deepseek-v3.2',
    endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
    note: '百度云千帆通道',
  },
  {
    id: 'doubao',
    region: 'domestic',
    label: '豆包 Seed',
    provider: '火山方舟',
    model: 'doubao-seed-1-6-251015',
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    note: '火山方舟 API',
  },
  {
    id: 'hunyuan',
    region: 'domestic',
    label: '混元 Standard',
    provider: '腾讯混元',
    model: 'hunyuan-standard',
    endpoint: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
    note: '腾讯云兼容接口',
  },
  {
    id: 'minimax',
    region: 'domestic',
    label: 'MiniMax M2.7',
    provider: 'MiniMax',
    model: 'MiniMax-M2.7',
    endpoint: 'https://api.minimax.io/v1/chat/completions',
    note: '长上下文模型',
  },
  {
    id: 'openai-4o-mini',
    region: 'overseas',
    label: 'GPT-4o mini',
    provider: 'OpenAI',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    note: '默认海外通用',
  },
  {
    id: 'openai-41-mini',
    region: 'overseas',
    label: 'GPT-4.1 mini',
    provider: 'OpenAI',
    model: 'gpt-4.1-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    note: '翻译质量更稳',
  },
  {
    id: 'gemini-flash',
    region: 'overseas',
    label: 'Gemini Flash',
    provider: 'Google',
    model: 'gemini-2.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    note: 'Google OpenAI 兼容',
  },
  {
    id: 'openrouter-claude',
    region: 'overseas',
    label: 'Claude Sonnet',
    provider: 'OpenRouter',
    model: 'anthropic/claude-sonnet-4.5',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    note: 'Claude 走 OpenRouter',
  },
  {
    id: 'mistral-small',
    region: 'overseas',
    label: 'Mistral Small',
    provider: 'Mistral AI',
    model: 'mistral-small-latest',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    note: '欧洲主流平台',
  },
  {
    id: 'groq-llama',
    region: 'overseas',
    label: 'Groq Llama',
    provider: 'Groq',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    note: '速度快，适合批量',
  },
  {
    id: 'xai-grok',
    region: 'overseas',
    label: 'Grok',
    provider: 'xAI',
    model: 'grok-4.3',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    note: 'xAI 官方接口',
  },
  {
    id: 'together-llama',
    region: 'overseas',
    label: 'Together Llama',
    provider: 'Together AI',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    endpoint: 'https://api.together.xyz/v1/chat/completions',
    note: '开源模型聚合',
  },
];

const aiPresetGroups: Array<{ region: AiPresetRegion; title: string; desc: string }> = [
  { region: 'domestic', title: '国内模型', desc: '适合国内网络和中文电商文案' },
  { region: 'overseas', title: '海外主流', desc: '适合国际模型或海外 API Key' },
];

const sections: Array<{ id: TranslationSection; title: string; desc: string; icon: React.ElementType }> = [
  { id: 'catalog', title: '商品内容', desc: '商品、分类、标签', icon: Package },
  { id: 'ui', title: '界面文案', desc: '按钮、菜单、提示语', icon: Settings2 },
  { id: 'store', title: '站点配置', desc: '品牌、联系、公告', icon: Store },
  { id: 'pages', title: '页面内容', desc: '关于、政策、FAQ', icon: FileText },
  { id: 'cms', title: 'CMS 内容', desc: '内容管理页面文案', icon: FileJson },
];

const tasks: TranslationTask[] = [
  {
    id: 'catalog-products',
    section: 'catalog',
    title: '商品翻译',
    path: 'catalog/products',
    status: 'available',
    desc: '商品标题、描述、规格、卖点和 SEO 文案。',
    examples: ['商品标题', '商品描述', '商品卖点', 'SEO 描述'],
    updatedAt: '2026-05-24',
    exportOptions: { includeProducts: true, includeCategories: false, includeTags: false },
  },
  {
    id: 'catalog-taxonomy',
    section: 'catalog',
    title: '分类与标签',
    path: 'catalog/taxonomy',
    status: 'available',
    desc: '商品分类名称、标签名称和筛选项文案。',
    examples: ['分类名称', '标签名称', '筛选项', '集合说明'],
    updatedAt: '2026-05-24',
    exportOptions: { includeProducts: false, includeCategories: true, includeTags: true },
  },
  {
    id: 'ui-common',
    section: 'ui',
    title: '通用界面文案',
    path: 'ui/common',
    status: 'available',
    desc: '按钮、菜单、空状态、加载提示、账号和首页组件文案。',
    examples: ['立即购买', '加入购物车', '订单管理', '支付失败'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includeUi: true,
      uiSections: ['common', 'login', 'register', 'account', 'product', 'benefit', 'listing', 'newArrivals', 'categories', 'flashSale', 'review', 'newsletter'],
    },
  },
  {
    id: 'ui-checkout',
    section: 'ui',
    title: '结账流程文案',
    path: 'ui/checkout',
    status: 'available',
    desc: '购物车、优惠券、配送、支付和订单确认文案。',
    examples: ['优惠码', '配送方式', '订单摘要', '提交订单'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includeUi: true,
      uiSections: ['cart', 'checkout', 'order', 'orderSummary'],
    },
  },
  {
    id: 'store-profile',
    section: 'store',
    title: '站点基础资料',
    path: 'store/profile',
    status: 'available',
    desc: '店铺名称、公告、页脚简介、联系信息和品牌说明。',
    examples: ['店铺名称', '客服邮箱', '顶部公告', '页脚简介'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includeStore: true,
      storeSections: ['profile', 'navigation', 'announcement', 'footer'],
    },
  },
  {
    id: 'pages-service',
    section: 'pages',
    title: '客服页面',
    path: 'pages/service',
    status: 'available',
    desc: '订单查询、退换货政策、物流说明和 FAQ。',
    examples: ['订单查询', '退换货政策', '物流说明', 'FAQ'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includePages: true,
      pageSections: ['customerService'],
    },
  },
  {
    id: 'pages-about',
    section: 'pages',
    title: '关于我们页面',
    path: 'pages/about',
    status: 'available',
    desc: '品牌故事、招聘、媒体合作和关于页面通用文案。',
    examples: ['品牌故事', '联系我们', '招聘', '媒体合作'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includePages: true,
      pageSections: ['aboutPages'],
    },
  },
  {
    id: 'pages-legal',
    section: 'pages',
    title: '政策条款',
    path: 'pages/legal',
    status: 'available',
    desc: '隐私政策、服务条款和 Cookie 设置说明。',
    examples: ['隐私政策', '服务条款', 'Cookie 设置'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includePages: true,
      pageSections: ['legal', 'cookie'],
    },
  },
  {
    id: 'cms-home',
    section: 'cms',
    title: '首页 CMS 内容',
    path: 'cms/home',
    status: 'available',
    desc: '内容管理里的首页首屏、权益、订阅和营销模块文案。',
    examples: ['首页首屏', '首页权益区', '订阅模块', '营销模块'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includeCms: true,
      cmsGroups: ['home'],
    },
  },
  {
    id: 'cms-pages',
    section: 'cms',
    title: '页面 CMS 内容',
    path: 'cms/pages',
    status: 'available',
    desc: '内容管理里的客服、关于、政策和营销预留内容。',
    examples: ['客服内容', '关于我们', '政策说明', '信任背书'],
    updatedAt: '2026-05-24',
    exportOptions: {
      includeProducts: false,
      includeCategories: false,
      includeTags: false,
      includeCms: true,
      cmsGroups: ['service', 'about', 'policy', 'marketing'],
    },
  },
];

function downloadJson(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function countPackageItems(pack: TranslationPackage) {
  return (
    pack.items.products.length +
    pack.items.categories.length +
    pack.items.tags.length +
    (pack.items.ui?.length ?? 0) +
    (pack.items.store?.length ?? 0) +
    (pack.items.pages?.length ?? 0) +
    (pack.items.cms?.length ?? 0)
  );
}

function countPackagesItems(packs: TranslationPackage[]) {
  return packs.reduce((sum, pack) => sum + countPackageItems(pack), 0);
}

function getLocaleLabel(locale: Locale, options: { value: Locale; label: string }[]) {
  return options.find((option) => option.value === locale)?.label ?? locale;
}

function getScopeLabels(options: TranslationTask['exportOptions']) {
  const labels: string[] = [];
  if (options.includeProducts) labels.push('商品');
  if (options.includeCategories) labels.push('分类');
  if (options.includeTags) labels.push('标签');
  if (options.uiSections?.length) labels.push(...options.uiSections.map((section) => `界面：${section}`));
  if (options.storeSections?.length) labels.push(...options.storeSections.map((section) => `站点：${section}`));
  if (options.pageSections?.length) labels.push(...options.pageSections.map((section) => `页面：${section}`));
  if (options.cmsGroups?.length) labels.push(...options.cmsGroups.map((group) => `CMS：${group}`));
  return labels;
}

export default function TranslationManagement() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [activeSection, setActiveSection] = useState<TranslationSection>('catalog');
  const [activeTaskId, setActiveTaskId] = useState('catalog-products');
  const [targetLocale, setTargetLocale] = useState<Locale>('en-US');
  const [selectedLocales, setSelectedLocales] = useState<Locale[]>(['en-US']);
  const [mode, setMode] = useState<TranslationExportMode>('missing_or_outdated');
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiTranslating, setAiTranslating] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiTranslationConfig>(() => loadAiTranslationConfig());
  const [aiDraft, setAiDraft] = useState<AiTranslationConfig>(() => loadAiTranslationConfig());
  const aiConfigValidation = useMemo(() => validateAiTranslationConfig(aiDraft), [aiDraft]);
  const activeAiPreset = useMemo(
    () => aiProviderPresets.find((preset) => preset.endpoint === aiDraft.endpoint && preset.model === aiDraft.model),
    [aiDraft.endpoint, aiDraft.model],
  );
  const selectedPresetRegion = activeAiPreset?.region ?? 'domestic';
  const visibleAiPresets = useMemo(
    () => aiProviderPresets.filter((preset) => preset.region === selectedPresetRegion),
    [selectedPresetRegion],
  );

  const activeSectionMeta = sections.find((section) => section.id === activeSection) ?? sections[0];
  const ActiveIcon = activeSectionMeta.icon;
  const sectionTasks = useMemo(() => tasks.filter((task) => task.section === activeSection), [activeSection]);
  const activeTask = sectionTasks.find((task) => task.id === activeTaskId) ?? sectionTasks[0] ?? tasks[0];
  const availableLocaleOptions = activeSection === 'catalog' ? localeOptions : contentLocaleOptions;
  const selectedExportLocales = useMemo(() => {
    const allowedLocales = new Set(availableLocaleOptions.map((option) => option.value));
    return selectedLocales.filter((locale) => allowedLocales.has(locale));
  }, [availableLocaleOptions, selectedLocales]);
  const completion = stats && stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;
  const progressTone = statsLoading
    ? 'from-blue-400 to-cyan-400'
    : completion >= 90
      ? 'from-emerald-500 to-teal-400'
      : completion >= 50
        ? 'from-blue-600 to-indigo-500'
        : completion > 0
          ? 'from-amber-500 to-orange-400'
          : 'from-slate-300 to-slate-300';
  const progressLabel = statsLoading
    ? '正在刷新'
    : stats && stats.total > 0
      ? `已翻译 ${stats.translated}/${stats.total}`
      : '暂无可统计字段';
  const busy = loading || aiTranslating;

  const getActiveExportOptions = useCallback(() => activeTask.exportOptions, [activeTask]);

  const refreshStats = useCallback(async (locale = targetLocale) => {
    setStatsLoading(true);
    try {
      setStats(await getTranslationStats(locale, getActiveExportOptions()));
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '读取翻译状态失败' });
    } finally {
      setStatsLoading(false);
    }
  }, [getActiveExportOptions, targetLocale]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    const allowedOptions = activeSection === 'catalog' ? localeOptions : contentLocaleOptions;
    const allowedLocales = new Set(allowedOptions.map((option) => option.value));
    const fallbackLocale = allowedOptions[0]?.value ?? 'en-US';

    if (!allowedLocales.has(targetLocale)) setTargetLocale(fallbackLocale);

    setSelectedLocales((prev) => {
      const next = prev.filter((locale) => allowedLocales.has(locale));
      if (next.length > 0) return next;
      return [allowedLocales.has(targetLocale) ? targetLocale : fallbackLocale];
    });
  }, [activeSection, targetLocale]);

  const handleSectionChange = (section: TranslationSection) => {
    setActiveSection(section);
    setActiveTaskId(tasks.find((task) => task.section === section)?.id ?? tasks[0].id);
  };

  const toggleExportLocale = (locale: Locale) => {
    if (!selectedLocales.includes(locale)) {
      setTargetLocale(locale);
      setSelectedLocales((prev) => [...prev, locale]);
      return;
    }

    if (selectedLocales.length === 1) {
      setTargetLocale(locale);
      return;
    }

    const next = selectedLocales.filter((item) => item !== locale);
    setSelectedLocales(next);
    if (targetLocale === locale) setTargetLocale(next[0] ?? locale);
  };

  const handleSaveAiConfig = () => {
    if (!aiConfigValidation.ok) {
      setAiPanelOpen(true);
      setMessage({ type: 'error', text: `AI 配置校验未通过：${aiConfigValidation.errors[0]}` });
      return;
    }

    const next = saveAiTranslationConfig(aiDraft);
    setAiConfig(next);
    setAiDraft(next);
    setMessage({
      type: aiConfigValidation.warnings.length > 0 ? 'info' : 'success',
      text: aiConfigValidation.warnings.length > 0
        ? `AI 配置已保存，但请注意：${aiConfigValidation.warnings[0]}`
        : 'AI 配置校验通过，接口和模型已保存；API Key 不会保存到浏览器。',
    });
  };

  const handleValidateAiConfig = () => {
    setAiPanelOpen(true);
    if (!aiConfigValidation.ok) {
      setMessage({ type: 'error', text: `AI 配置校验未通过：${aiConfigValidation.errors[0]}` });
      return;
    }

    setMessage({
      type: aiConfigValidation.warnings.length > 0 ? 'info' : 'success',
      text: aiConfigValidation.warnings.length > 0
        ? `AI 配置格式可用，但请注意：${aiConfigValidation.warnings[0]}`
        : `AI 配置校验通过，当前识别为 ${aiConfigValidation.providerLabel}。`,
    });
  };

  const applyAiPreset = (preset: AiProviderPreset) => {
    setAiDraft((prev) => ({ ...prev, endpoint: preset.endpoint, model: preset.model }));
    setAiPanelOpen(true);
    setMessage({
      type: 'info',
      text: `已选择 ${preset.provider} / ${preset.model}。生产环境请配置 Supabase Secret：AI_TRANSLATION_API_KEY；模型名称仍可手动修改。`,
    });
  };

  const handleCustomAiPreset = () => {
    setAiPanelOpen(true);
    setMessage({
      type: 'info',
      text: '已切换到自定义 / 中转站模式，请手动填写中转站的完整 Chat Completions 地址和模型名称。',
    });
  };

  const handleAiTranslate = async () => {
    setLoading(true);
    setAiTranslating(true);
    setMessage(null);

    try {
      const aiLocales = selectedExportLocales.filter((locale) => locale !== 'zh-CN');
      if (aiLocales.length === 0) {
        setMessage({ type: 'error', text: 'AI 翻译请选择非中文目标语言，源语言不用翻译。' });
        return;
      }

      if (!aiConfigValidation.ok) {
        setAiPanelOpen(true);
        setMessage({ type: 'error', text: `AI 配置校验未通过：${aiConfigValidation.errors[0]}` });
        return;
      }

      const aiLocaleNamesText = aiLocales.map((locale) => getLocaleLabel(locale, availableLocaleOptions)).join('、');
      const confirmed = window.confirm(`AI 翻译会直接写入当前翻译库。\n目标语言：${aiLocaleNamesText}\n建议翻译后到前台检查显示效果。\n\n是否继续？`);
      if (!confirmed) {
        setMessage({ type: 'info', text: '已取消 AI 翻译，未写入任何内容。' });
        return;
      }

      const config = saveAiTranslationConfig(aiDraft);
      setAiConfig(config);
      setAiDraft(config);

      if (aiLocales.length > 1) {
        const batch = await exportTranslationBatchPackage({
          targetLocales: aiLocales,
          ...getActiveExportOptions(),
          mode,
        });
        const itemCount = countPackagesItems(batch.packages);
        if (itemCount === 0) {
          setMessage({ type: 'error', text: '当前任务没有需要 AI 翻译的内容，请换一个导出模式或检查内容是否已经翻译完整。' });
          return;
        }

        const translated = await translateBatchPackageWithAi(batch, config);
        if (translated.totalFields === 0) {
          setMessage({ type: 'error', text: '当前任务没有匹配导出模式的待翻译字段。' });
          return;
        }

        const result = await importTranslationPackage(translated.batch);
        setTargetLocale(aiLocales[0]);
        setSelectedLocales(aiLocales);
        setMessage({
          type: 'success',
          text: `AI 已翻译 ${aiLocaleNamesText}，写入 ${result.imported} 个字段（AI 返回 ${translated.translatedFields}/${translated.totalFields} 个）。前台切换到对应语言后会优先显示这些译文。`,
        });
        await refreshStats(aiLocales[0]);
        return;
      }

      const exportLocale = aiLocales[0];
      const pack = await exportTranslationPackage({
        targetLocale: exportLocale,
        ...getActiveExportOptions(),
        mode,
      });
      const itemCount = countPackageItems(pack);
      if (itemCount === 0) {
        setMessage({ type: 'error', text: '当前任务没有需要 AI 翻译的内容，请换一个导出模式或检查内容是否已经翻译完整。' });
        return;
      }

      const translated = await translatePackageWithAi(pack, config);
      if (translated.totalFields === 0) {
        setMessage({ type: 'error', text: '当前任务没有匹配导出模式的待翻译字段。' });
        return;
      }

      const result = await importTranslationPackage(translated.pack);
      setTargetLocale(exportLocale);
      setSelectedLocales([exportLocale]);
      setMessage({
        type: 'success',
        text: `AI 已翻译 ${getLocaleLabel(exportLocale, availableLocaleOptions)}，写入 ${result.imported} 个字段（AI 返回 ${translated.translatedFields}/${translated.totalFields} 个）。前台切换到 ${getLocaleLabel(exportLocale, availableLocaleOptions)} 后会优先显示这些译文。`,
      });
      await refreshStats(exportLocale);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'AI 翻译失败' });
    } finally {
      setLoading(false);
      setAiTranslating(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setMessage(null);
    try {
      if (selectedExportLocales.length === 0) {
        setMessage({ type: 'error', text: '请至少选择一个目标语言。' });
        return;
      }

      if (selectedExportLocales.length > 1) {
        const batch = await exportTranslationBatchPackage({
          targetLocales: selectedExportLocales,
          ...getActiveExportOptions(),
          mode,
        });
        const itemCount = countPackagesItems(batch.packages);
        if (itemCount === 0) {
          setMessage({ type: 'error', text: '当前任务在已选语言里没有可导出的内容，请换一个导出模式或检查内容是否已经翻译完整。' });
          return;
        }

        const localeSuffix = selectedExportLocales.join('-');
        const fileName = `shopnova-${activeTask.id}-batch-${localeSuffix}.json`;
        downloadJson(fileName, batch);
        const localeNamesText = selectedExportLocales.map((locale) => getLocaleLabel(locale, availableLocaleOptions)).join('、');
        setMessage({ type: 'success', text: `已批量导出 ${batch.packages.length} 个语言包（${localeNamesText}），共 ${itemCount} 条内容到 ${fileName}。` });
        return;
      }

      const exportLocale = selectedExportLocales[0];
      const pack = await exportTranslationPackage({
        targetLocale: exportLocale,
        ...getActiveExportOptions(),
        mode,
      });
      const itemCount = countPackageItems(pack);
      if (itemCount === 0) {
        setMessage({ type: 'error', text: '当前任务没有可导出的内容，请换一个导出模式或检查内容是否已经翻译完整。' });
        return;
      }

      const fileName = `shopnova-${activeTask.id}-${exportLocale}.json`;
      downloadJson(fileName, pack);
      setMessage({ type: 'success', text: `已导出 ${getLocaleLabel(exportLocale, availableLocaleOptions)} 的 ${itemCount} 条内容到 ${fileName}。` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '导出失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setLoading(true);
    setMessage(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as unknown;
      const result = await importTranslationPackage(payload);
      const importedLocales = result.locales ?? [];
      const allowedLocaleSet = new Set(availableLocaleOptions.map((option) => option.value));
      const selectableLocales = importedLocales.filter((locale) => allowedLocaleSet.has(locale));
      const nextLocale = selectableLocales[0];
      if (nextLocale) {
        setTargetLocale(nextLocale);
        setSelectedLocales(selectableLocales);
      }
      const localeNamesText = importedLocales.map((locale) => getLocaleLabel(locale, allLocaleOptions)).join('、') || '目标语言';
      const effectText = importedLocales.length > 1
        ? '前台切换到对应语言后会优先显示这些译文。'
        : `前台切换到 ${localeNamesText} 后会优先显示这些译文。`;
      setMessage({
        type: 'success',
        text: `已导入 ${localeNamesText}，共写入 ${result.imported} 个字段。${effectText}${result.skipped ? ` 跳过 ${result.skipped} 个空 target。` : ''}`,
      });
      await refreshStats(nextLocale);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '导入失败，请检查 JSON 文件格式。' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">翻译管理</h2>
          <p className="mt-0.5 text-xs text-slate-400">统一管理商品、界面、站点配置和页面内容的多语言包。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => refreshStats()}
            disabled={statsLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
            刷新状态
          </button>
          <button
            onClick={() => setAiPanelOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            <Settings2 size={13} />
            AI 设置
          </button>
          <button
            onClick={handleValidateAiConfig}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
          >
            <CheckCircle2 size={13} />
            校验配置
          </button>
          <button
            onClick={handleAiTranslate}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {aiTranslating ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
            AI 一键翻译
          </button>
          <button
            onClick={handleExport}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            {selectedExportLocales.length > 1 ? '批量导出 JSON' : '导出 JSON'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : message.type === 'info'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto pb-1">
        <div className="grid h-[calc(100vh-168px)] min-h-[620px] min-w-[1180px] grid-cols-[220px_300px_minmax(0,1fr)_280px] gap-4">
          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-bold text-slate-500">翻译分组</div>
            </div>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = section.id === activeSection;
                const count = tasks.filter((task) => task.section === section.id).length;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      active ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-transparent text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={16} className={active ? 'text-blue-600' : 'text-slate-400'} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{section.title}</div>
                      <div className="truncate text-[11px] text-slate-400">{section.desc}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <aside className="flex min-h-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                <ActiveIcon size={15} className="text-blue-600" />
                {activeSectionMeta.title}
              </div>
              <div className="mt-0.5 text-[11px] text-slate-400">{sectionTasks.length} 个翻译任务</div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
              {sectionTasks.map((task) => {
                const active = task.id === activeTask.id;
                return (
                  <button
                    key={task.id}
                    onClick={() => setActiveTaskId(task.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-all ${
                      active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-800">{task.title}</div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400">{task.path}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        task.status === 'available'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-100 text-slate-500'
                      }`}>
                        {task.status === 'available' ? '可导出' : '占位'}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{task.desc}</p>
                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <CalendarClock size={12} />
                      {task.updatedAt}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">{activeTask.title}</h3>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                    {selectedExportLocales.length > 1 ? `${selectedExportLocales.length} 个语言` : targetLocale}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{activeTask.desc}</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) handleImportFile(file);
                  }}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-60"
                >
                  <Upload size={13} />
                  导入
                </button>
                <button
                  onClick={handleAiTranslate}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {aiTranslating ? <RefreshCw size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  AI 翻译
                </button>
                <button
                  onClick={handleExport}
                  disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  <Save size={13} />
                  {selectedExportLocales.length > 1 ? '批量导出' : '导出'}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="grid gap-5">
                <section>
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">语言包设置</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">源语言</label>
                      <input value="zh-CN 简体中文（源文案，不作为目标语言）" disabled className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">目标语言 / 当前统计语言</label>
                      <select
                        value={targetLocale}
                        onChange={(event) => {
                          const locale = event.target.value as Locale;
                          setTargetLocale(locale);
                          setSelectedLocales((prev) => prev.includes(locale) ? prev : [...prev, locale]);
                        }}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {availableLocaleOptions.map((locale) => (
                          <option key={locale.value} value={locale.value}>{locale.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">导出模式</label>
                      <select
                        value={mode}
                        onChange={(event) => setMode(event.target.value as TranslationExportMode)}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        {modeOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="text-xs font-semibold text-slate-600">目标翻译语言</label>
                      <span className="text-[11px] text-slate-400">已选 {selectedExportLocales.length} 个</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {availableLocaleOptions.map((locale) => {
                        const checked = selectedExportLocales.includes(locale.value);
                        return (
                          <label
                            key={locale.value}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                              checked ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleExportLocale(locale.value)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600"
                            />
                            <span className="min-w-0 flex-1 truncate">{locale.label}</span>
                            <span className="font-mono text-[10px] text-slate-400">{locale.value}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{modeOptions.find((option) => option.value === mode)?.desc}</p>
                </section>

                {aiPanelOpen && (
                  <section>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">AI 模型配置</div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                        当前模型：{aiConfig.model || '未配置'}
                      </span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <label className="text-xs font-semibold text-slate-600">模型预设</label>
                            <span className="text-[11px] text-slate-400">选择后自动填接口地址和模型名，生产 Key 放 Supabase Secrets</span>
                          </div>
                          <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                            <select
                              value={selectedPresetRegion}
                              onChange={(event) => {
                                const region = event.target.value as AiPresetRegion;
                                const firstPreset = aiProviderPresets.find((preset) => preset.region === region);
                                if (firstPreset) applyAiPreset(firstPreset);
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              {aiPresetGroups.map((group) => (
                                <option key={group.region} value={group.region}>
                                  {group.title}
                                </option>
                              ))}
                            </select>
                            <select
                              value={activeAiPreset?.id ?? ''}
                              onChange={(event) => {
                                if (event.target.value === 'custom') {
                                  handleCustomAiPreset();
                                  return;
                                }
                                const preset = aiProviderPresets.find((item) => item.id === event.target.value);
                                if (preset) applyAiPreset(preset);
                              }}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                            >
                              <option value="custom">自定义 / 中转站</option>
                              {!activeAiPreset && <option value="">当前手动配置 / 未匹配预设</option>}
                              {visibleAiPresets.map((preset) => (
                                <option key={preset.id} value={preset.id}>
                                  {preset.label} - {preset.provider} / {preset.model}
                                </option>
                              ))}
                            </select>
                          </div>
                          <p className="mt-2 truncate text-xs text-slate-400" title={activeAiPreset?.endpoint ?? aiDraft.endpoint}>
                            {activeAiPreset
                              ? `${activeAiPreset.note}，接口：${activeAiPreset.endpoint}`
                              : '当前为自定义 / 中转站配置，请填写完整 Chat Completions 地址，例如 https://你的中转站/v1/chat/completions。'}
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">接口地址</label>
                          <input
                            value={aiDraft.endpoint}
                            onChange={(event) => setAiDraft((prev) => ({ ...prev, endpoint: event.target.value }))}
                            placeholder="https://api.openai.com/v1/chat/completions"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">模型名称</label>
                          <input
                            value={aiDraft.model}
                            onChange={(event) => setAiDraft((prev) => ({ ...prev, model: event.target.value }))}
                            placeholder="gpt-4o-mini"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">API Key</label>
                          <input
                            type="password"
                            value={aiDraft.apiKey}
                            onChange={(event) => setAiDraft((prev) => ({ ...prev, apiKey: event.target.value }))}
                            placeholder="后端代理可留空"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">每批字段数</label>
                          <input
                            type="number"
                            min={5}
                            max={100}
                            value={aiDraft.batchSize}
                            onChange={(event) => setAiDraft((prev) => ({ ...prev, batchSize: Number(event.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-semibold text-slate-600">温度</label>
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={aiDraft.temperature}
                            onChange={(event) => setAiDraft((prev) => ({ ...prev, temperature: Number(event.target.value) }))}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          />
                        </div>
                      </div>
                      <div className={`mt-4 rounded-lg border px-3 py-2 text-xs leading-5 ${
                        aiConfigValidation.ok
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold">
                            {aiConfigValidation.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                            {aiConfigValidation.ok ? `配置格式正常（${aiConfigValidation.providerLabel}）` : '配置需要修正'}
                          </div>
                          {aiConfigValidation.suggestedEndpoint && (
                            <button
                              type="button"
                              onClick={() => setAiDraft((prev) => ({ ...prev, endpoint: aiConfigValidation.suggestedEndpoint ?? prev.endpoint }))}
                              className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
                            >
                              使用建议地址
                            </button>
                          )}
                        </div>
                        {aiConfigValidation.errors.length > 0 && (
                          <div className="mt-1">{aiConfigValidation.errors[0]}</div>
                        )}
                        {aiConfigValidation.errors.length === 0 && aiConfigValidation.warnings.length > 0 && (
                          <div className="mt-1">{aiConfigValidation.warnings[0]}</div>
                        )}
                        {aiConfigValidation.errors.length === 0 && aiConfigValidation.warnings.length === 0 && (
                          <div className="mt-1">保存或开始翻译前会再次校验，避免把 base_url 或 Anthropic 地址当成请求地址。</div>
                        )}
                      </div>
                      <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-5 text-slate-500">
                          这里要填完整请求地址，不是 base_url；也可以先选上面的预设再按需微调。生产 API Key 请放 Supabase Secret：AI_TRANSLATION_API_KEY；这里填写的 Key 只用于本次会话，不会保存。
                        </p>
                        <button
                          onClick={handleSaveAiConfig}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          <Save size={13} />
                          保存 AI 配置
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">当前任务范围</div>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    {getScopeLabels(activeTask.exportOptions).map((label) => (
                      <span key={label} className="rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold text-blue-700">
                        {label}
                      </span>
                    ))}
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-500">示例字段</div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <FileJson size={14} />
                      AI 只需要填写 target 字段
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {activeTask.examples.map((example, index) => (
                      <div key={example} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">{index + 1}</div>
                          <div className="text-sm font-bold text-slate-800">{example}</div>
                        </div>
                        <div className="grid gap-2">
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">source: 中文原文占位</div>
                          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-400">target: 待翻译</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </main>

          <aside className="min-h-0 space-y-4 overflow-y-auto">
            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">翻译进度</div>
              <div className="mt-4">
                <div className="flex items-end justify-between">
                  <div className="text-3xl font-black text-slate-900 tabular-nums">{completion}%</div>
                  <div className="text-right text-xs text-slate-400">
                    <div>{getLocaleLabel(targetLocale, availableLocaleOptions)}</div>
                    <div className="mt-0.5">{progressLabel}</div>
                  </div>
                </div>
                <div
                  className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-valuenow={completion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${progressTone} transition-[width] duration-700 ease-out ${statsLoading ? 'animate-pulse' : ''}`}
                    style={{ width: `${completion}%`, minWidth: completion > 0 ? 10 : 0 }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>未翻译 {stats?.missing ?? 0}</span>
                  <span>已过期 {stats?.outdated ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '总字段', value: stats?.total ?? 0, color: 'text-slate-800' },
                { label: '已翻译', value: stats?.translated ?? 0, color: 'text-emerald-700' },
                { label: '未翻译', value: stats?.missing ?? 0, color: 'text-amber-700' },
                { label: '已过期', value: stats?.outdated ?? 0, color: 'text-red-700' },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{card.label}</div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">发布检查</div>
              <div className="mt-4 space-y-3">
                {['导出语言已选择', '导出范围已确认', 'JSON 可导入导出', '待人工校对'].map((item, index) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-slate-600">
                    <BadgeCheck size={15} className={index < 3 ? 'text-emerald-500' : 'text-slate-300'} />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900 p-5 text-xs leading-6 text-slate-300">
              <div className="mb-2 font-bold text-white">推荐流程</div>
              <div>1. 选择分组、任务和一个或多个目标语言。</div>
              <div>2. 使用 AI 一键翻译，或导出 JSON 给外部翻译。</div>
              <div>3. 外部翻译完成后再导入单语言或批量 JSON。</div>
              <div>4. 前台切换语言时优先显示译文。</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
