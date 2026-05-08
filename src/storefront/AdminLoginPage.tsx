import { useState } from 'react';
import { Eye, EyeOff, Shield, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { login } from '../lib/authService';
import { useAuth } from './AuthContext';
import { useStore } from './StoreContext';

interface Props {
  onAdminLogin?: () => void;
}

export default function AdminLoginPage({ onAdminLogin }: Props) {
  const { setUser } = useAuth();
  const { navigate } = useStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('请填写邮箱和密码'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await login({ email, password });
      if (user.role !== 'admin') {
        throw new Error('此账号没有管理员权限');
      }
      setUser(user);
      onAdminLogin?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-900/40">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">管理后台</h1>
          <p className="text-slate-400 text-sm mt-1">ShopNova Admin — 仅限授权人员访问</p>
        </div>

        {/* Card */}
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 shadow-2xl">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 text-xs text-amber-300">
            <span className="font-bold">测试管理员账号：</span>
            <span className="font-mono"> admin@test.com / 123456</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="admin@example.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-300">密码</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="请输入密码"
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-500 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              {loading ? '验证中…' : '进入管理后台'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate({ type: 'home' })}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← 返回商城首页
          </button>
        </div>
      </div>
    </div>
  );
}
