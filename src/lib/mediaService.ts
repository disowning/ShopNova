import { supabase } from './supabase';
import { fetchAdminSettings, saveAdminSettings } from './settingsService';

export type MediaProvider = 'supabase' | 'r2';
export type MediaUsage = 'products' | 'brand' | 'content' | 'other';

export interface MediaAsset {
  id: string;
  url: string;
  name: string;
  provider: MediaProvider | 'external';
  bucket?: string | null;
  path: string;
  contentType: string;
  size: number;
  usage: MediaUsage;
  altText: string;
  createdAt: string;
}

export interface MediaStorageConfig {
  activeProvider: MediaProvider;
  supabase: {
    bucket: string;
    folder: string;
    publicBaseUrl: string;
  };
  r2: {
    uploadEndpoint: string;
    publicBaseUrl: string;
    authToken: string;
    folder: string;
  };
}

export type MediaSettingsData = Record<string, unknown> & {
  mediaConfig?: Partial<MediaStorageConfig>;
  mediaAssets?: MediaAsset[];
};

interface DBMediaAsset {
  id: string;
  url: string;
  name: string;
  provider: MediaAsset['provider'];
  bucket: string | null;
  path: string;
  content_type: string;
  size: number;
  usage: MediaUsage;
  alt_text: string;
  created_at: string;
}

interface UploadMetadata {
  usage: MediaUsage;
  altText: string;
}

interface R2UploadResponse {
  url?: string;
  publicUrl?: string;
  path?: string;
  key?: string;
  name?: string;
  contentType?: string;
  size?: number;
}

interface UploadedMediaFile {
  path: string;
  url: string;
  bucket?: string | null;
  name?: string;
  contentType?: string;
  size?: number;
}

export const DEFAULT_MEDIA_CONFIG: MediaStorageConfig = {
  activeProvider: 'supabase',
  supabase: {
    bucket: 'shopnova-media',
    folder: 'products',
    publicBaseUrl: '',
  },
  r2: {
    uploadEndpoint: '',
    publicBaseUrl: '',
    authToken: '',
    folder: 'products',
  },
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanFolder(value: string, fallback: string) {
  const cleaned = value
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]+/g, '-')
    .replace(/\/+/g, '/');
  return cleaned || fallback;
}

function joinUrl(baseUrl: string, path: string) {
  const base = baseUrl.replace(/\/+$/g, '');
  const cleanPath = path.replace(/^\/+/g, '');
  return `${base}/${cleanPath}`;
}

function getFileExtension(fileName: string, contentType: string) {
  const fromName = fileName.split('.').pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  return 'jpg';
}

function buildStoragePath(file: File, folder: string) {
  const extension = getFileExtension(file.name, file.type);
  const baseName = file.name
    .replace(/\.[^.]+$/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'image';
  return `${cleanFolder(folder, 'products')}/${Date.now()}-${crypto.randomUUID()}-${baseName}.${extension}`;
}

function assertImageFile(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('只能上传图片文件。');
  if (file.size > 10 * 1024 * 1024) throw new Error('单张图片不能超过 10MB。');
}

function toMediaAsset(row: DBMediaAsset): MediaAsset {
  return {
    id: row.id,
    url: row.url,
    name: row.name,
    provider: row.provider,
    bucket: row.bucket,
    path: row.path,
    contentType: row.content_type,
    size: Number(row.size) || 0,
    usage: row.usage,
    altText: row.alt_text,
    createdAt: row.created_at,
  };
}

function toMediaAssetRow(asset: MediaAsset) {
  return {
    id: asset.id,
    url: asset.url,
    name: asset.name,
    provider: asset.provider,
    bucket: asset.bucket ?? null,
    path: asset.path,
    content_type: asset.contentType,
    size: asset.size,
    usage: asset.usage,
    alt_text: asset.altText,
    created_at: asset.createdAt,
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
}

async function fetchMediaAssetsFromTable(): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('media_assets')
    .select('id, url, name, provider, bucket, path, content_type, size, usage, alt_text, created_at')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.message.includes('media_assets')) return [];
    throw new Error(`读取素材库失败：${error.message}`);
  }

  return ((data ?? []) as DBMediaAsset[]).map(toMediaAsset);
}

async function upsertMediaAssets(mediaAssets: MediaAsset[]) {
  if (mediaAssets.length === 0) return;

  const { error } = await supabase
    .from('media_assets')
    .upsert(mediaAssets.map(toMediaAssetRow), { onConflict: 'id' });

  if (error) throw new Error(`保存素材库失败：${error.message}`);
}

export function mergeMediaConfig(saved?: Partial<MediaStorageConfig>): MediaStorageConfig {
  return {
    activeProvider: saved?.activeProvider === 'r2' ? 'r2' : 'supabase',
    supabase: {
      ...DEFAULT_MEDIA_CONFIG.supabase,
      ...saved?.supabase,
      bucket: cleanText(saved?.supabase?.bucket) || DEFAULT_MEDIA_CONFIG.supabase.bucket,
      folder: cleanFolder(cleanText(saved?.supabase?.folder), DEFAULT_MEDIA_CONFIG.supabase.folder),
      publicBaseUrl: cleanText(saved?.supabase?.publicBaseUrl),
    },
    r2: {
      ...DEFAULT_MEDIA_CONFIG.r2,
      ...saved?.r2,
      uploadEndpoint: cleanText(saved?.r2?.uploadEndpoint),
      publicBaseUrl: cleanText(saved?.r2?.publicBaseUrl),
      authToken: cleanText(saved?.r2?.authToken),
      folder: cleanFolder(cleanText(saved?.r2?.folder), DEFAULT_MEDIA_CONFIG.r2.folder),
    },
  };
}

export async function fetchMediaSettings() {
  const result = await fetchAdminSettings<MediaSettingsData>();
  const settingsData = result.settingsData as MediaSettingsData;
  const mediaAssets = await fetchMediaAssetsFromTable();
  return {
    rawSettings: settingsData,
    mediaConfig: mergeMediaConfig(settingsData.mediaConfig),
    mediaAssets: mediaAssets.length > 0
      ? mediaAssets
      : Array.isArray(settingsData.mediaAssets) ? settingsData.mediaAssets : [],
  };
}

export async function saveMediaSettings(
  rawSettings: MediaSettingsData,
  mediaConfig: MediaStorageConfig,
  mediaAssets: MediaAsset[],
) {
  const nextSettings: MediaSettingsData = {
    ...rawSettings,
    mediaConfig,
  };
  delete nextSettings.mediaAssets;
  await saveAdminSettings(nextSettings);
  await upsertMediaAssets(mediaAssets);
  return nextSettings;
}

async function uploadToSupabase(file: File, config: MediaStorageConfig): Promise<UploadedMediaFile> {
  const bucket = config.supabase.bucket.trim();
  if (!bucket) throw new Error('请先填写 Supabase bucket。');

  const path = buildStoragePath(file, config.supabase.folder);
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw new Error(`Supabase 上传失败：${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return {
    path,
    bucket,
    url: config.supabase.publicBaseUrl ? joinUrl(config.supabase.publicBaseUrl, path) : data.publicUrl,
  };
}

async function uploadToR2(file: File, config: MediaStorageConfig): Promise<UploadedMediaFile> {
  const endpoint = config.r2.uploadEndpoint.trim();
  if (!endpoint) throw new Error('请先填写 R2 上传代理地址。');

  const path = buildStoragePath(file, config.r2.folder);
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  formData.append('folder', config.r2.folder);

  const headers: Record<string, string> = {};
  if (config.r2.authToken) headers.Authorization = `Bearer ${config.r2.authToken}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`R2 上传失败：${text.slice(0, 240) || `HTTP ${response.status}`}`);
  }

  let payload: R2UploadResponse | null = null;
  try {
    payload = JSON.parse(text) as R2UploadResponse;
  } catch {
    payload = text.trim().startsWith('http') ? { url: text.trim(), path } : null;
  }

  const nextPath = payload?.path || payload?.key || path;
  const url = payload?.url || payload?.publicUrl || (config.r2.publicBaseUrl ? joinUrl(config.r2.publicBaseUrl, nextPath) : '');
  if (!url) throw new Error('R2 上传成功但没有返回图片 URL，请检查代理返回格式。');

  return {
    path: nextPath,
    url,
    name: payload?.name,
    contentType: payload?.contentType,
    size: payload?.size,
  };
}

export async function uploadMediaFile(
  file: File,
  config: MediaStorageConfig,
  metadata: UploadMetadata,
): Promise<MediaAsset> {
  assertImageFile(file);
  const provider = config.activeProvider;
  const uploaded = provider === 'supabase'
    ? await uploadToSupabase(file, config)
    : await uploadToR2(file, config);

  return {
    id: crypto.randomUUID(),
    url: uploaded.url,
    name: uploaded.name || file.name,
    provider,
    bucket: uploaded.bucket ?? null,
    path: uploaded.path,
    contentType: uploaded.contentType || file.type || 'image/*',
    size: uploaded.size || file.size,
    usage: metadata.usage,
    altText: metadata.altText.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function createExternalMediaAsset(url: string, metadata: UploadMetadata): MediaAsset {
  const cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) throw new Error('请输入 http 或 https 图片链接。');

  return {
    id: crypto.randomUUID(),
    url: cleanUrl,
    name: cleanUrl.split('/').pop()?.split('?')[0] || 'external-image',
    provider: 'external',
    bucket: null,
    path: cleanUrl,
    contentType: 'image/*',
    size: 0,
    usage: metadata.usage,
    altText: metadata.altText.trim(),
    createdAt: new Date().toISOString(),
  };
}

export async function removeMediaAsset(asset: MediaAsset) {
  if (asset.provider === 'supabase' && asset.path) {
    const bucket = asset.bucket || DEFAULT_MEDIA_CONFIG.supabase.bucket;
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .remove([asset.path]);

    if (storageError) throw new Error(`删除 Supabase 图片失败：${storageError.message}`);
  }

  const { error } = await supabase
    .from('media_assets')
    .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', asset.id);

  if (error) throw new Error(`移除素材记录失败：${error.message}`);
}

export function formatMediaSize(size: number) {
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}
