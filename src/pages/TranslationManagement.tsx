import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileJson, Languages, RefreshCw, Upload } from 'lucide-react';
import type { Locale } from '../i18n';
import {
  exportTranslationPackage,
  getTranslationStats,
  importTranslationPackage,
  type TranslationExportMode,
  type TranslationPackage,
} from '../lib/translationService';

const localeOptions: { value: Locale; label: string }[] = [
  { value: 'en-US', label: 'English' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'zh-TW', label: '繁體中文' },
];

const contentLocaleOptions: { value: Locale; label: string }[] = [
  { value: 'zh-CN', label: '简体中文（源文案）' },
  ...localeOptions,
];

const modeOptions: { value: TranslationExportMode; label: string; desc: string }[] = [
  { value: 'missing_or_outdated', label: '待翻译和已过期', desc: '日常最常用，只导出需要处理的内容' },
  { value: 'missing', label: '仅未翻译', desc: '只导出目标语言为空的字段' },
  { value: 'outdated', label: '仅已过期', desc: '只导出中文已改动的字段' },
  { value: 'all', label: '全部内容', desc: '完整备份或全量重翻时使用' },
];

type TranslationSection = 'catalog' | 'ui' | 'store' | 'pages';

const sectionTabs: Array<{
  value: TranslationSection;
  label: string;
  desc: string;
  status: 'available' | 'planned';
}> = [
  { value: 'catalog', label: '商品翻译', desc: '商品、分类、标签', status: 'available' },
  { value: 'ui', label: '系统文案', desc: '按钮、菜单、提示语', status: 'available' },
  { value: 'store', label: '店铺资料', desc: '品牌、联系方式、公告', status: 'available' },
  { value: 'pages', label: '页面内容', desc: '关于、政策、FAQ', status: 'available' },
];

const sectionGuides: Record<Exclude<TranslationSection, 'catalog'>, {
  title: string;
  body: string;
  examples: string[];
  currentMethod: string;
}> = {
  ui: {
    title: '系统文案',
    body: '用于管理按钮、菜单、表单、状态和提示语。为了不影响现有用户端显示，当前仍由语言包和源码里的 i18n 文案控制。',
    examples: ['立即购买', '加入购物车', '订单管理', '请输入邮箱', '支付失败'],
    currentMethod: '当前维护方式：src/i18n/locales/*.json',
  },
  store: {
    title: '店铺资料',
    body: '用于管理店铺名称、客服邮箱、电话、地址、公告和页脚简介。它和店铺设置相关，但不应该覆盖按钮或菜单文案。',
    examples: ['店铺名称', '客服邮箱', '客服电话', '店铺公告', '页脚简介'],
    currentMethod: '当前维护方式：设置页的店铺配置和源码默认值',
  },
  pages: {
    title: '页面内容',
    body: '用于管理关于我们、联系我们、退换货政策、物流说明、FAQ、隐私政策和服务条款等长内容。',
    examples: ['关于我们', '退换货政策', '物流说明', 'FAQ', '隐私政策'],
    currentMethod: '当前维护方式：源码页面和语言包内容',
  },
};

interface Stats {
  total: number;
  translated: number;
  outdated: number;
  missing: number;
}

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
    (pack.items.pages?.length ?? 0)
  );
}

export default function TranslationManagement() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [activeSection, setActiveSection] = useState<TranslationSection>('catalog');
  const [targetLocale, setTargetLocale] = useState<Locale>('en-US');
  const [mode, setMode] = useState<TranslationExportMode>('missing_or_outdated');
  const [includeProducts, setIncludeProducts] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeTags, setIncludeTags] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const availableLocaleOptions = activeSection === 'catalog' ? localeOptions : contentLocaleOptions;

  const getActiveExportOptions = useCallback(() => {
    if (activeSection === 'ui') {
      return { includeProducts: false, includeCategories: false, includeTags: false, includeUi: true, includeStore: false, includePages: false };
    }
    if (activeSection === 'store') {
      return { includeProducts: false, includeCategories: false, includeTags: false, includeUi: false, includeStore: true, includePages: false };
    }
    if (activeSection === 'pages') {
      return { includeProducts: false, includeCategories: false, includeTags: false, includeUi: false, includeStore: false, includePages: true };
    }
    return { includeProducts, includeCategories, includeTags, includeUi: false, includeStore: false, includePages: false };
  }, [activeSection, includeCategories, includeProducts, includeTags]);

  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      setStats(await getTranslationStats(targetLocale, getActiveExportOptions()));
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
    if (activeSection === 'catalog' && targetLocale === 'zh-CN') {
      setTargetLocale('en-US');
    }
  }, [activeSection, targetLocale]);

  const handleExport = async () => {
    if (activeSection === 'catalog' && !includeProducts && !includeCategories && !includeTags) {
      setMessage({ type: 'error', text: '请至少选择一种导出内容。' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const pack = await exportTranslationPackage({
        targetLocale,
        ...getActiveExportOptions(),
        mode,
      });
      const fileName = `shopnova-${activeSection}-translations-${targetLocale}.json`;
      downloadJson(fileName, pack);
      setMessage({ type: 'success', text: `已导出 ${countPackageItems(pack)} 条内容到 ${fileName}。` });
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
      const pack = JSON.parse(text) as TranslationPackage;
      const result = await importTranslationPackage(pack);
      setTargetLocale(pack.targetLocale);
      setMessage({ type: 'success', text: `导入成功，写入 ${result.imported} 个翻译字段。` });
      await refreshStats();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '导入失败，请检查 JSON 文件格式。' });
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const completion = stats && stats.total > 0 ? Math.round((stats.translated / stats.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">翻译管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">导出一个目标语言包，AI 批量翻译后再导入数据库。</p>
        </div>
        <button
          onClick={refreshStats}
          disabled={statsLoading}
          className="flex items-center gap-1.5 text-xs text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={13} className={statsLoading ? 'animate-spin' : ''} />
          刷新状态
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {sectionTabs.map((tab) => {
          const active = activeSection === tab.value;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveSection(tab.value)}
              className={`text-left rounded-xl border p-4 shadow-sm transition-all ${
                active
                  ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10'
                  : 'bg-white border-slate-200/80 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold ${active ? 'text-blue-800' : 'text-slate-800'}`}>{tab.label}</span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  tab.status === 'available'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  可导入导出
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{tab.desc}</div>
            </button>
          );
        })}
      </div>

      {activeSection !== 'catalog' && (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">{sectionGuides[activeSection].title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">可导出 JSON 给 AI 翻译后导入；导入后只写入翻译表，不改变用户端当前显示逻辑。</p>
          </div>
          <div className="p-5 grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="text-sm text-slate-600 leading-relaxed">{sectionGuides[activeSection].body}</p>
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
                {sectionGuides[activeSection].currentMethod}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold text-slate-500 mb-2">示例内容</div>
              <div className="flex flex-wrap gap-2">
                {sectionGuides[activeSection].examples.map((example) => (
                  <span key={example} className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full">
                    {example}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: '总字段', value: stats?.total ?? 0, color: 'text-slate-800', bg: 'bg-slate-100' },
          { label: '已翻译', value: stats?.translated ?? 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: '未翻译', value: stats?.missing ?? 0, color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: '已过期', value: stats?.outdated ?? 0, color: 'text-red-700', bg: 'bg-red-50' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
              <Languages size={16} className={card.color} />
            </div>
            <div className={`text-xl font-black ${card.color}`}>{card.value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">语言包</h3>
            <p className="text-xs text-slate-400 mt-0.5">一个目标语言导出一个 JSON 文件，不按商品拆文件夹。</p>
          </div>
          <div className="text-xs font-semibold text-slate-500">完成度 {completion}%</div>
        </div>

        <div className="p-5 grid lg:grid-cols-3 gap-5">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">源语言</label>
              <input
                value="zh-CN 简体中文"
                disabled
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-100 text-slate-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">目标语言</label>
              <select
                value={targetLocale}
                onChange={(event) => setTargetLocale(event.target.value as Locale)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {availableLocaleOptions.map((locale) => (
                  <option key={locale.value} value={locale.value}>{locale.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">导出范围</label>
              {activeSection === 'catalog' ? (
                <div className="space-y-2 rounded-xl border border-slate-200 p-3">
                  {[
                    { checked: includeProducts, set: setIncludeProducts, label: '商品' },
                    { checked: includeCategories, set: setIncludeCategories, label: '分类' },
                    { checked: includeTags, set: setIncludeTags, label: '标签' },
                  ].map((item) => (
                    <label key={item.label} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(event) => item.set(event.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600"
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-sm font-semibold text-slate-700">
                    {sectionTabs.find((tab) => tab.value === activeSection)?.label}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    当前分类会整体导出，不会混入其他分类内容。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1.5">导出模式</label>
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as TranslationExportMode)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {modeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1.5">{modeOptions.find((option) => option.value === mode)?.desc}</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {loading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
            导出 JSON
          </button>

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
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-60 transition-colors"
          >
            <Upload size={15} />
            导入 JSON
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-400 ml-auto">
            <FileJson size={14} />
            AI 只需要填写每条内容里的 target 字段
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-5 text-slate-300 text-xs leading-relaxed">
        <div className="font-bold text-white mb-2">推荐流程</div>
        <div>1. 选择目标语言和导出模式，导出一个 JSON 文件。</div>
        <div>2. 把 JSON 给 AI，让它保持结构不变，只填写 target 里的空值。</div>
        <div>3. 导入翻译后的 JSON，系统会写入数据库翻译表。</div>
        <div>4. 前台切换语言时，有翻译就显示翻译；没有翻译就显示中文原文。</div>
      </div>
    </div>
  );
}
