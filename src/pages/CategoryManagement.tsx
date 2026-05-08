import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, X, Save, AlertCircle, FolderOpen, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DBCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  gradient: string;
  description: string;
  sort_order: number;
  status: 'active' | 'inactive';
  parent_id: string | null;
  count: number;
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

const GRADIENT_OPTIONS = [
  { label: '蓝色', value: 'from-blue-400 to-blue-600' },
  { label: '绿色', value: 'from-emerald-400 to-emerald-600' },
  { label: '橙色', value: 'from-orange-400 to-orange-600' },
  { label: '玫红', value: 'from-rose-400 to-rose-600' },
  { label: '天蓝', value: 'from-sky-400 to-sky-600' },
  { label: '琥珀', value: 'from-amber-400 to-amber-600' },
  { label: '青色', value: 'from-teal-400 to-teal-600' },
  { label: '石板', value: 'from-slate-400 to-slate-600' },
];

function CategoryFormModal({
  category, allCategories, onSave, onClose,
}: {
  category: DBCategory | null;
  allCategories: DBCategory[];
  onSave: () => void;
  onClose: () => void;
}) {
  const isEdit = !!category;
  const [form, setForm] = useState({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    icon: category?.icon ?? '📦',
    gradient: category?.gradient ?? 'from-blue-400 to-blue-600',
    description: category?.description ?? '',
    sort_order: String(category?.sort_order ?? '0'),
    status: (category?.status ?? 'active') as 'active' | 'inactive',
    parent_id: category?.parent_id ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form) => (v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('分类名称不能为空'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || form.name.trim().toLowerCase().replace(/[\s\W]+/g, '-'),
      icon: form.icon.trim() || '📦',
      gradient: form.gradient,
      description: form.description.trim(),
      sort_order: Number(form.sort_order) || 0,
      status: form.status,
      parent_id: form.parent_id || null,
      updated_at: new Date().toISOString(),
    };

    const { error: err } = isEdit
      ? await supabase.from('product_categories').update(payload).eq('id', category!.id)
      : await supabase.from('product_categories').insert(payload);

    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
    onClose();
  };

  const parentOptions = allCategories.filter((c) => c.id !== category?.id && !c.parent_id);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-900">{isEdit ? '编辑分类' : '新增分类'}</h3>
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
            <Field label="分类名称" required>
              <input value={form.name} onChange={(e) => set('name')(e.target.value)} className={inputCls} placeholder="请输入分类名称" />
            </Field>
            <Field label="Slug">
              <input value={form.slug} onChange={(e) => set('slug')(e.target.value)} className={inputCls} placeholder="auto-generated" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="图标 (Emoji)">
              <input value={form.icon} onChange={(e) => set('icon')(e.target.value)} className={inputCls} placeholder="📦" />
            </Field>
            <Field label="父分类">
              <select value={form.parent_id} onChange={(e) => set('parent_id')(e.target.value)} className={inputCls}>
                <option value="">无（顶级分类）</option>
                {parentOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="渐变色">
            <div className="flex flex-wrap gap-2">
              {GRADIENT_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => set('gradient')(g.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${form.gradient === g.value ? 'border-blue-600' : 'border-transparent hover:border-slate-300'}`}
                >
                  <span className={`w-4 h-4 rounded bg-gradient-to-br ${g.value}`} />
                  {g.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="描述">
            <textarea value={form.description} onChange={(e) => set('description')(e.target.value)} className={`${inputCls} resize-none h-16`} placeholder="分类描述（可选）" />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="排序">
              <input type="number" value={form.sort_order} onChange={(e) => set('sort_order')(e.target.value)} className={inputCls} placeholder="0" min="0" />
            </Field>
            <Field label="状态">
              <select value={form.status} onChange={(e) => set('status')(e.target.value as 'active' | 'inactive')} className={inputCls}>
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </Field>
          </div>

          {/* Preview */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${form.gradient} flex items-center justify-center text-xl shadow`}>
              {form.icon || '📦'}
            </div>
            <div>
              <div className="font-bold text-slate-800">{form.name || '分类名称'}</div>
              <div className="text-xs text-slate-400">{form.description || '分类描述'}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              取消
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
              {saving ? '保存中…' : '保存分类'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

export default function CategoryManagement() {
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [editCat, setEditCat] = useState<DBCategory | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('product_categories')
      .select('id, name, slug, icon, gradient, description, sort_order, status, parent_id, count, created_at', { count: 'exact' })
      .is('deleted_at', null)
      .order('sort_order')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.trim()) q = q.ilike('name', `%${search.trim()}%`);

    const { data, count: totalCount } = await q;
    const cats = (data ?? []) as DBCategory[];

    // Compute real product count per category
    if (cats.length > 0) {
      const { data: countData } = await supabase
        .from('products')
        .select('category_id')
        .eq('status', 'active')
        .is('deleted_at', null);
      if (countData) {
        const countMap: Record<string, number> = {};
        countData.forEach((p) => { countMap[p.category_id] = (countMap[p.category_id] || 0) + 1; });
        cats.forEach((c) => { c.count = countMap[c.id] ?? 0; });
      }
    }

    setCategories(cats);
    setTotal(totalCount ?? 0);
    setLoading(false);
  }, [search, page]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const handleDelete = async (id: string) => {
    await supabase.from('product_categories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
    setDeleteConfirm(null);
    fetchCategories();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">分类管理</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理商品分类层级与展示信息</p>
        </div>
        <button
          onClick={() => { setEditCat(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 text-xs text-white bg-blue-600 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={13} /> 新增分类
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '分类总数', value: total, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '启用中', value: categories.filter((c) => c.status === 'active').length, icon: FolderOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '停用', value: categories.filter((c) => c.status === 'inactive').length, icon: FolderOpen, color: 'text-slate-400', bg: 'bg-slate-100' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
              <s.icon size={16} className={s.color} />
            </div>
            <div>
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm flex items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="搜索分类名称..."
            className="pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-slate-400"
          />
        </div>
        <span className="ml-auto text-xs text-slate-400">共 {total} 个</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-100">
                {['分类', '层级', '图标', '商品数', '排序', '状态', '操作'].map((c) => (
                  <th key={c} className="text-left px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <FolderOpen size={28} className="mx-auto mb-2 text-slate-200" />
                    没有找到分类
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cat.gradient || 'from-blue-400 to-blue-600'} flex items-center justify-center text-sm flex-shrink-0`}>
                          {cat.icon || '📦'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-800">{cat.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{cat.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cat.parent_id ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                        {cat.parent_id ? '子分类' : '顶级'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-lg">{cat.icon}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{cat.count ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500">{cat.sort_order}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cat.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {cat.status === 'active' ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditCat(cat); setModalOpen(true); }} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-600 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => setDeleteConfirm(cat.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400">共 {total} 个分类</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={13} />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => setPage(i)} className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold ${i === page ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <CategoryFormModal
          category={editCat}
          allCategories={categories}
          onSave={fetchCategories}
          onClose={() => { setModalOpen(false); setEditCat(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center mb-1">确认删除分类？</h3>
            <p className="text-sm text-slate-500 text-center mb-6">删除后，该分类下的商品不会受影响</p>
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
