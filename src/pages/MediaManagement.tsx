import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Cloud,
  Database,
  Image,
  Link,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  createExternalMediaAsset,
  DEFAULT_MEDIA_CONFIG,
  fetchMediaSettings,
  formatMediaSize,
  removeMediaAsset,
  saveMediaSettings,
  uploadMediaFile,
  type MediaAsset,
  type MediaProvider,
  type MediaSettingsData,
  type MediaStorageConfig,
  type MediaUsage,
} from '../lib/mediaService';

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30';

const usageOptions: Array<{ value: MediaUsage; label: string }> = [
  { value: 'products', label: '商品图片' },
  { value: 'brand', label: '品牌素材' },
  { value: 'content', label: '内容/CMS' },
  { value: 'other', label: '其它' },
];

const providerOptions: Array<{ value: MediaProvider; label: string; desc: string; icon: React.ElementType }> = [
  { value: 'supabase', label: 'Supabase Storage', desc: '适合当前项目直接上传', icon: Database },
  { value: 'r2', label: 'Cloudflare R2', desc: '通过 Worker/代理端点上传', icon: Cloud },
];

function providerLabel(provider: MediaAsset['provider']) {
  if (provider === 'supabase') return 'Supabase';
  if (provider === 'r2') return 'R2';
  return '外部链接';
}

function usageLabel(usage: MediaUsage) {
  return usageOptions.find((option) => option.value === usage)?.label ?? usage;
}

export default function MediaManagement() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rawSettings, setRawSettings] = useState<MediaSettingsData>({});
  const [mediaConfig, setMediaConfig] = useState<MediaStorageConfig>(() => DEFAULT_MEDIA_CONFIG);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [usage, setUsage] = useState<MediaUsage>('products');
  const [altText, setAltText] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<MediaAsset['provider'] | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeProviderMeta = providerOptions.find((option) => option.value === mediaConfig.activeProvider) ?? providerOptions[0];
  const ActiveProviderIcon = activeProviderMeta.icon;

  const filteredAssets = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return assets.filter((asset) => {
      const matchesProvider = providerFilter === 'all' || asset.provider === providerFilter;
      const matchesKeyword = !keyword || [asset.name, asset.url, asset.altText, asset.path]
        .some((value) => value.toLowerCase().includes(keyword));
      return matchesProvider && matchesKeyword;
    });
  }, [assets, providerFilter, search]);

  const loadSettings = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await fetchMediaSettings();
      setRawSettings(result.rawSettings);
      setMediaConfig(result.mediaConfig);
      setAssets(result.mediaAssets);
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '读取图片配置失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSupabaseConfig = (key: keyof MediaStorageConfig['supabase'], value: string) => {
    setMediaConfig((prev) => ({
      ...prev,
      supabase: {
        ...prev.supabase,
        [key]: value,
      },
    }));
  };

  const updateR2Config = (key: keyof MediaStorageConfig['r2'], value: string) => {
    setMediaConfig((prev) => ({
      ...prev,
      r2: {
        ...prev.r2,
        [key]: value,
      },
    }));
  };

  const handleSaveConfig = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const nextRaw = await saveMediaSettings(rawSettings, mediaConfig, assets);
      setRawSettings(nextRaw);
      setMessage({ type: 'success', text: '图片存储配置已保存。' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '保存图片配置失败' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setMessage({ type: 'error', text: '请先选择要上传的图片。' });
      return;
    }

    setUploading(true);
    setMessage(null);
    try {
      let nextAssets = [...assets];
      for (const file of selectedFiles) {
        const asset = await uploadMediaFile(file, mediaConfig, { usage, altText });
        nextAssets = [asset, ...nextAssets];
      }
      const nextRaw = await saveMediaSettings(rawSettings, mediaConfig, nextAssets);
      setRawSettings(nextRaw);
      setAssets(nextAssets);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage({ type: 'success', text: `上传完成，新增 ${selectedFiles.length} 张图片。` });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '上传图片失败' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddExternalUrl = async () => {
    setMessage(null);
    try {
      const asset = createExternalMediaAsset(externalUrl, { usage, altText });
      const nextAssets = [asset, ...assets];
      const nextRaw = await saveMediaSettings(rawSettings, mediaConfig, nextAssets);
      setRawSettings(nextRaw);
      setAssets(nextAssets);
      setExternalUrl('');
      setMessage({ type: 'success', text: '外部图片链接已加入素材库。' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '添加外部图片失败' });
    }
  };

  const handleRemoveAsset = async (assetId: string) => {
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) return;
    try {
      await removeMediaAsset(asset);
      setAssets((prev) => prev.filter((item) => item.id !== assetId));
      setMessage({ type: 'success', text: '已从素材库移除，已使用的商品图片链接不会自动清空。' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : '移除素材失败' });
    }
  };

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setMessage({ type: 'success', text: '图片链接已复制。' });
    } catch {
      setMessage({ type: 'error', text: '复制失败，请手动复制图片链接。' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">图片管理</h2>
          <p className="mt-0.5 text-xs text-slate-400">管理商品图、品牌图和内容素材，支持 Supabase Storage 与 Cloudflare R2。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Save size={13} />}
            保存配置
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {message.text}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ActiveProviderIcon size={16} className="text-blue-600" />
              <div>
                <div className="text-sm font-bold text-slate-800">图床配置</div>
                <div className="text-[11px] text-slate-400">当前：{activeProviderMeta.label}</div>
              </div>
            </div>

            <div className="grid gap-2">
              {providerOptions.map((provider) => {
                const Icon = provider.icon;
                const active = mediaConfig.activeProvider === provider.value;
                return (
                  <button
                    key={provider.value}
                    type="button"
                    onClick={() => setMediaConfig((prev) => ({ ...prev, activeProvider: provider.value }))}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                      active ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <Icon size={17} className={active ? 'text-blue-600' : 'text-slate-400'} />
                    <div>
                      <div className="text-sm font-bold text-slate-800">{provider.label}</div>
                      <div className="text-[11px] text-slate-400">{provider.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 space-y-4 border-t border-slate-100 pt-4">
              {mediaConfig.activeProvider === 'supabase' ? (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">Bucket</label>
                    <input
                      value={mediaConfig.supabase.bucket}
                      onChange={(event) => updateSupabaseConfig('bucket', event.target.value)}
                      className={inputCls}
                      placeholder="shopnova-media"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">目录</label>
                    <input
                      value={mediaConfig.supabase.folder}
                      onChange={(event) => updateSupabaseConfig('folder', event.target.value)}
                      className={inputCls}
                      placeholder="products"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">自定义 CDN 域名</label>
                    <input
                      value={mediaConfig.supabase.publicBaseUrl}
                      onChange={(event) => updateSupabaseConfig('publicBaseUrl', event.target.value)}
                      className={inputCls}
                      placeholder="可选，默认使用 Supabase public URL"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">R2 上传代理地址</label>
                    <input
                      value={mediaConfig.r2.uploadEndpoint}
                      onChange={(event) => updateR2Config('uploadEndpoint', event.target.value)}
                      className={inputCls}
                      placeholder="https://your-worker.example.com/upload"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">公开访问域名</label>
                    <input
                      value={mediaConfig.r2.publicBaseUrl}
                      onChange={(event) => updateR2Config('publicBaseUrl', event.target.value)}
                      className={inputCls}
                      placeholder="https://cdn.example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">目录</label>
                    <input
                      value={mediaConfig.r2.folder}
                      onChange={(event) => updateR2Config('folder', event.target.value)}
                      className={inputCls}
                      placeholder="products"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-600">代理访问 Token</label>
                    <input
                      type="password"
                      value={mediaConfig.r2.authToken}
                      onChange={(event) => updateR2Config('authToken', event.target.value)}
                      className={inputCls}
                      placeholder="可选，由 Worker 校验"
                    />
                  </div>
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700">
                    R2 密钥不能放前端。这里填写的是 Cloudflare Worker 或后端代理地址，代理负责真正写入 R2。
                  </p>
                </>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 text-sm font-bold text-slate-800">上传图片</div>
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-600 hover:bg-white"
              >
                <Upload size={17} />
                选择本地图片
              </button>
              {selectedFiles.length > 0 && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  已选择 {selectedFiles.length} 张：{selectedFiles.map((file) => file.name).join('、')}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">用途</label>
                  <select value={usage} onChange={(event) => setUsage(event.target.value as MediaUsage)} className={inputCls}>
                    {usageOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">默认说明</label>
                  <input value={altText} onChange={(event) => setAltText(event.target.value)} className={inputCls} placeholder="可选" />
                </div>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {uploading ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
                上传到 {activeProviderMeta.label}
              </button>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Link size={16} className="text-blue-600" />
              收录外部链接
            </div>
            <div className="space-y-3">
              <input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} className={inputCls} placeholder="https://example.com/image.jpg" />
              <button onClick={handleAddExternalUrl} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">
                加入素材库
              </button>
            </div>
          </section>
        </aside>

        <main className="min-w-0 rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-bold text-slate-800">素材库</div>
              <div className="mt-0.5 text-xs text-slate-400">共 {assets.length} 张，当前显示 {filteredAssets.length} 张</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="搜索文件名、链接、说明"
                />
              </div>
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value as MediaAsset['provider'] | 'all')}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="all">全部来源</option>
                <option value="supabase">Supabase</option>
                <option value="r2">R2</option>
                <option value="external">外部链接</option>
              </select>
            </div>
          </div>

          <div className="max-h-[calc(100vh-210px)] min-h-[520px] overflow-y-auto p-5">
            {filteredAssets.length === 0 ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center">
                <Image size={32} className="text-slate-300" />
                <div className="mt-3 text-sm font-bold text-slate-700">暂无图片素材</div>
                <div className="mt-1 text-xs text-slate-400">上传图片或收录外部链接后会显示在这里。</div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredAssets.map((asset) => (
                  <article key={asset.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="aspect-square bg-slate-100">
                      <img src={asset.url} alt={asset.altText || asset.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-3 p-3">
                      <div>
                        <div className="truncate text-sm font-bold text-slate-800" title={asset.name}>{asset.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{providerLabel(asset.provider)}</span>
                          <span>·</span>
                          <span>{usageLabel(asset.usage)}</span>
                          <span>·</span>
                          <span>{formatMediaSize(asset.size)}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleCopy(asset.url)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                        >
                          <Clipboard size={13} />
                          复制链接
                        </button>
                        <button
                          onClick={() => handleRemoveAsset(asset.id)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-red-100 px-2 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={13} />
                          移除
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
