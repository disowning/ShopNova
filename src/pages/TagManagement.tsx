import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, AlertCircle, Tag, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DBTag {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string;
  status: 'active' | 'inactive';
  created_at: string;
}

const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 focus:bg-white transition-all';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-600">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const COLOR_PRESETS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
  '#14b8a6', '#a855f7', '#d946ef', '#0ea5e9', '#64748b',
];

function TagFormModal({ tag, onSave, onClose }: { tag: DBTag | null; onSave: () => void; onClose: () => void }) {
  const isEdit = !!tag;
  const [form, setForm] = useState({
    name: tag?.name ?? '',
    slug: tag?.slug ?? '',
    color: tag?.color ?? '#3b82f6',
    description: tag?.description ?? '',
    status: (tag?.status ?? 'active') as 'active' | 'inactive',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('标签名称不能为空'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[\s\W]+/g, '-'),
      color: form.color,
      description: form.description.trim(),
      status: form.status,
      updated_at: new Date().toISOString(),
    };

    const { error: err } = isEdit
      ? await supabase.from('product_tags').update(payload).eq('id', tag!.id)
      : await supabase.from('product_tags').insert(payload);

    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{isEdit ? '编辑标签' : '新增标签'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle size={14} />{error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="标签名称" required>
              <input value={form.name} onChange={(e) => set('name')(e.target.value)} className={inputCls} placeholder="请输入标签名" />
            </Field>
            <Field label="Slug">
              <input value={form.slug} onChange={(e) => set('slug')(e.target.value)} className={inputCls} placeholder="auto-generated" />
            </Field>
          </div>

          <Field label="标签颜色">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set('color')(c)}
                    className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set('color')(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-slate-200"
                />
                <input value={form.color} onChange={(e) => set('color')(e.target.value)} className={`${inputCls} flex-1`} placeholder="#3b82f6" />
              </div>
            </div>
          </Field>

          <Field label="描述">
            <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} className={`${inputCls} resize-none h-16`} placeholder="标签用途说明（可选）" />
          </Field>

          <Field label="状态">
            <select value={form.status} onChange={(e) => set('status')(e.target.value as 'active' | 'inactive')} className={inputCls}>
              <option value="active">启用</option>
              <option value="inactive">停用</option>
            </select>
          </Field>

          {/* Preview */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-4">
            <span className="text-xs text-slate-400 mr-1">预览：</span>
            <span
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: form.color }}
            >
              <Tag size={10} />
              {form.name || '标签名称'}
            </span>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              取消
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              {saving ? '保存中…' : '保存标签'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TagManagement() {
  const [tags, setTags] = useState<DBTag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editTag, setEditTag] = useState<DBTag | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('product_tags')
      .select('id, name, slug, color, description, status, created_at', { count: 'exact' })
      .is('deleted_at', null)
      .order('name');

    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`);

    const { data, count } = await q;
    setTags((data ?? []) as DBTag[]);
    setTotal(count ?? 0);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const handleDelete = async (id: string) => {
    await supabase.from('product_tag_relations').delete().eq('tag_id', id);
    await supabase.from('product_tags').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleteConfirm(null);
    fetchTags();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">标签管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理商品标签，用于分类与促销活动</p>
        </div>
        <button
          onClick={() => { setEditTag(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={13} /> 新增标签
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索标签..."
            className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400"
          />
        </div>
        <span className="ml-auto text-xs text-slate-400">共 {total} 个标签</span>
      </div>

      {/* Tag grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-slate-100" />
                <div className="h-4 bg-slate-100 rounded w-20" />
              </div>
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-16 text-center shadow-sm">
          <Tag size={32} className="mx-auto mb-3 text-slate-200" />
          <div className="text-sm font-semibold text-slate-600 mb-1">暂无标签</div>
          <div className="text-xs text-slate-400">点击右上角"新增标签"创建第一个标签</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {tags.map((tag) => (
            <div key={tag.id} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm group hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="font-bold text-sm text-slate-800 truncate">{tag.name}</span>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditTag(tag); setModalOpen(true); }} className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 text-blue-600">
                    <Pencil size={11} />
                  </button>
                  <button onClick={() => setDeleteConfirm(tag.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>

              {tag.description && <p className="text-[11px] text-slate-400 mb-3 truncate">{tag.description}</p>}

              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  <Tag size={8} />
                  {tag.name}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  tag.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                  {tag.status === 'active' ? '启用' : '停用'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <TagFormModal
          tag={editTag}
          onSave={fetchTags}
          onClose={() => { setModalOpen(false); setEditTag(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">确认删除标签？</h3>
            <p className="text-sm text-slate-500 text-center mb-6">删除后，绑定该标签的商品关联也将移除</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
