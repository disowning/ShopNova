import { useEffect, useState } from 'react';
import { User, Bell, Shield, Globe, CreditCard, Webhook, ChevronRight, Save, Eye, EyeOff, Check } from 'lucide-react';
import {
  changeAdminPassword,
  fetchAdminSettings,
  saveAdminSettings,
  updateAdminProfile,
} from '../lib/settingsService';
import {
  DEFAULT_STORE_FORM,
  DEFAULT_STORE_SWITCHES,
  type StoreForm,
  type StoreSwitches,
} from '../lib/siteSettings';

type SettingsData = {
  profileForm: {
    name: string;
    email: string;
    phone: string;
    company: string;
    timezone: string;
    language: string;
  };
  notifs: {
    newOrder: boolean;
    riskAlert: boolean;
    paymentFail: boolean;
    dailyReport: boolean;
    weeklyReport: boolean;
  };
  security: {
    twoFactorEnabled: boolean;
    sessionDuration: string;
    ipWhitelist: boolean;
  };
  storeForm: StoreForm;
  storeSwitches: StoreSwitches;
  paymentRules: {
    maxSingleAmount: string;
    showGatewayFee: boolean;
  };
  webhook: {
    url: string;
    signingSecret: string;
    events: string[];
  };
};

type ProfileErrors = Partial<Record<keyof SettingsData['profileForm'], string>>;
type PasswordForm = { current: string; next: string; confirm: string };
type PasswordErrors = Partial<Record<keyof PasswordForm, string>>;

const defaultSettings: SettingsData = {
  profileForm: {
    name: '管理员',
    email: 'admin@shop.com',
    phone: '+86 138-0000-0001',
    company: 'ShopAdmin Inc.',
    timezone: 'Asia/Shanghai',
    language: '中文 (简体)',
  },
  notifs: {
    newOrder: true,
    riskAlert: true,
    paymentFail: true,
    dailyReport: false,
    weeklyReport: true,
  },
  security: {
    twoFactorEnabled: false,
    sessionDuration: '8 小时',
    ipWhitelist: false,
  },
  storeForm: DEFAULT_STORE_FORM,
  storeSwitches: DEFAULT_STORE_SWITCHES,
  paymentRules: {
    maxSingleAmount: '5000',
    showGatewayFee: true,
  },
  webhook: {
    url: 'https://api.your-system.com/webhooks/orders',
    signingSecret: 'whsec_****************************',
    events: ['order.created', 'order.paid', 'order.shipped', 'order.cancelled', 'payment.failed', 'refund.created'],
  },
};

function mergeSettings(saved?: Partial<SettingsData>): SettingsData {
  return {
    profileForm: { ...defaultSettings.profileForm, ...saved?.profileForm },
    notifs: { ...defaultSettings.notifs, ...saved?.notifs },
    security: { ...defaultSettings.security, ...saved?.security },
    storeForm: { ...defaultSettings.storeForm, ...saved?.storeForm },
    storeSwitches: { ...defaultSettings.storeSwitches, ...saved?.storeSwitches },
    paymentRules: { ...defaultSettings.paymentRules, ...saved?.paymentRules },
    webhook: {
      ...defaultSettings.webhook,
      ...saved?.webhook,
      events: saved?.webhook?.events ?? defaultSettings.webhook.events,
    },
  };
}

function validateProfile(profile: SettingsData['profileForm']): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!profile.name.trim()) errors.name = '请输入姓名';
  if (!profile.email.trim()) {
    errors.email = '请输入邮箱';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.email = '邮箱格式不正确';
  }
  if (!profile.phone.trim()) {
    errors.phone = '请输入手机号';
  } else if (!/^[+\d][\d\s-]{6,}$/.test(profile.phone)) {
    errors.phone = '手机号格式不正确';
  }
  if (!profile.company.trim()) errors.company = '请输入公司名称';
  return errors;
}

function validatePasswordForm(form: PasswordForm): PasswordErrors {
  const hasAnyPassword = Boolean(form.current || form.next || form.confirm);
  if (!hasAnyPassword) return {};

  const errors: PasswordErrors = {};
  if (!form.current) errors.current = '请输入当前密码';
  if (!form.next) {
    errors.next = '请输入新密码';
  } else if (form.next.length < 6) {
    errors.next = '新密码至少 6 位';
  }
  if (!form.confirm) {
    errors.confirm = '请确认新密码';
  } else if (form.next !== form.confirm) {
    errors.confirm = '两次新密码不一致';
  }
  return errors;
}

const tabs = [
  { id: 'profile', label: '个人信息', icon: User },
  { id: 'notifications', label: '通知设置', icon: Bell },
  { id: 'security', label: '安全设置', icon: Shield },
  { id: 'store', label: '店铺配置', icon: Globe },
  { id: 'payment', label: '支付配置', icon: CreditCard },
  { id: 'webhook', label: 'Webhook', icon: Webhook },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`}></span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">{title}</div>
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm divide-y divide-slate-100">
        {children}
      </div>
    </div>
  );
}

function FieldGrid({
  fields,
  values,
  onChange,
}: {
  fields: Array<{ label: string; key: keyof SettingsData['storeForm']; type?: 'text' | 'number' | 'url' }>;
  values: SettingsData['storeForm'];
  onChange: (key: keyof SettingsData['storeForm'], value: string) => void;
}) {
  return (
    <div className="px-5 py-5 grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">{field.label}</label>
          <input
            type={field.type ?? 'text'}
            value={values[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50"
          />
        </div>
      ))}
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {desc && <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsData>(() => defaultSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState<SettingsData>(() => defaultSettings);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [saveError, setSaveError] = useState('');

  const { profileForm, notifs, security, storeForm, storeSwitches, paymentRules, webhook } = settings;
  const hasPasswordInput = Boolean(passwordForm.current || passwordForm.next || passwordForm.confirm);
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(lastSavedSettings) || hasPasswordInput;

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setSaveError('');
      try {
        const result = await fetchAdminSettings<SettingsData>();
        if (ignore) return;
        const next = mergeSettings(result.settingsData);
        next.profileForm = {
          ...next.profileForm,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
        };
        setSettings(next);
        setLastSavedSettings(next);
      } catch (err) {
        if (!ignore) {
          setSaveError(err instanceof Error ? err.message : '读取后台设置失败');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, []);

  const updateSettings = <K extends keyof SettingsData>(section: K, value: Partial<SettingsData[K]>) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...value },
    }));
  };

  const updateProfileField = (key: keyof SettingsData['profileForm'], value: string) => {
    updateSettings('profileForm', { [key]: value } as Partial<SettingsData['profileForm']>);
    setProfileErrors((prev) => ({ ...prev, [key]: undefined }));
    setSaveError('');
  };

  const updateStoreField = (key: keyof SettingsData['storeForm'], value: string) => {
    updateSettings('storeForm', { [key]: value } as Partial<SettingsData['storeForm']>);
  };

  const updatePasswordField = (key: keyof PasswordForm, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [key]: value }));
    setPasswordErrors((prev) => ({ ...prev, [key]: undefined }));
    setSaveError('');
  };

  const handleSave = async () => {
    const errors = validateProfile(settings.profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaved(false);
      setSaveError('请先修正个人信息中的错误');
      setActiveTab('profile');
      return;
    }

    const passwordValidation = validatePasswordForm(passwordForm);
    setPasswordErrors(passwordValidation);
    if (Object.keys(passwordValidation).length > 0) {
      setSaved(false);
      setSaveError('请先修正安全设置中的错误');
      setActiveTab('security');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await updateAdminProfile({
        name: settings.profileForm.name,
        email: settings.profileForm.email,
        phone: settings.profileForm.phone,
      });
      await saveAdminSettings(settings);
      if (hasPasswordInput) {
        await changeAdminPassword({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
        });
        setPasswordForm({ current: '', next: '', confirm: '' });
      }
      setLastSavedSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaved(false);
      setSaveError(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">系统设置</h2>
          <p className="text-xs text-slate-400 mt-0.5">管理账户、通知、安全与集成配置</p>
          <div className="mt-2 h-5">
            {loading ? (
              <span className="text-xs text-slate-400">正在读取后端设置...</span>
            ) : saveError ? (
              <span className="text-xs font-semibold text-red-600">{saveError}</span>
            ) : hasUnsavedChanges ? (
              <span className="text-xs font-semibold text-amber-600">有未保存修改</span>
            ) : (
              <span className="text-xs text-slate-400">所有设置已保存</span>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg transition-all shadow-sm font-semibold ${
            loading || saving
              ? 'bg-slate-200 text-slate-400 cursor-wait'
              : saved
              ? 'bg-emerald-500 text-white'
              : hasUnsavedChanges
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-slate-200 text-slate-500'
          }`}
        >
          {saved ? <Check size={13} /> : <Save size={13} />}
          {saving ? '保存中...' : saved ? '已保存' : hasUnsavedChanges ? '保存修改' : '保存设置'}
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Sidebar */}
        <div className="w-full flex-shrink-0 lg:w-44">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium transition-colors border-b border-slate-50 last:border-0 ${activeTab === t.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="flex items-center gap-2">
                  <t.icon size={14} className={activeTab === t.id ? 'text-blue-600' : 'text-slate-400'} />
                  {t.label}
                </div>
                <ChevronRight size={12} className={activeTab === t.id ? 'text-blue-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile' && (
            <div>
              <Section title="基本信息">
                <div className="grid gap-5 px-5 py-5 xl:grid-cols-[260px_1fr]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-4 xl:flex-col xl:items-start">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                        {profileForm.name.trim().slice(0, 1).toUpperCase() || 'A'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{profileForm.name || '未填写姓名'}</div>
                        <div className="text-xs text-slate-500 mt-1 truncate">{profileForm.email || '未填写邮箱'}</div>
                        <button className="mt-4 text-xs text-blue-600 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-semibold">更换头像</button>
                        <div className="text-[11px] text-slate-400 mt-2">建议 128×128 PNG 或 JPG</div>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                        <div className="text-slate-400">角色</div>
                        <div className="font-semibold text-slate-800 mt-0.5">管理员</div>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
                        <div className="text-slate-400">状态</div>
                        <div className="font-semibold text-emerald-700 mt-0.5">正常</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: '姓名', key: 'name' },
                      { label: '邮箱', key: 'email' },
                      { label: '手机号', key: 'phone' },
                      { label: '公司名称', key: 'company' },
                    ].map((f) => (
                      <div key={f.key}>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                        <input
                          value={profileForm[f.key as keyof typeof profileForm]}
                          onChange={(e) => updateProfileField(f.key as keyof SettingsData['profileForm'], e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 ${
                            profileErrors[f.key as keyof SettingsData['profileForm']]
                              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-blue-400 focus:ring-blue-500/30'
                          }`}
                        />
                        {profileErrors[f.key as keyof SettingsData['profileForm']] && (
                          <div className="text-[11px] text-red-500 mt-1">{profileErrors[f.key as keyof SettingsData['profileForm']]}</div>
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">时区</label>
                      <select
                        value={profileForm.timezone}
                        onChange={(e) => updateSettings('profileForm', { timezone: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50"
                      >
                        <option>Asia/Shanghai (UTC+8)</option>
                        <option>America/New_York (UTC-5)</option>
                        <option>Europe/London (UTC+0)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">界面语言</label>
                      <select
                        value={profileForm.language}
                        onChange={(e) => updateSettings('profileForm', { language: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50"
                      >
                        <option>中文 (简体)</option>
                        <option>English</option>
                      </select>
                    </div>
                  </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {[
                        { label: '最近登录', value: '2026-05-07 11:32' },
                        { label: '登录 IP', value: '127.0.0.1' },
                        { label: '资料完整度', value: `${Object.values(profileForm).filter((value) => value.trim()).length}/6` },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="text-[11px] text-slate-400">{item.label}</div>
                          <div className="text-sm font-semibold text-slate-800 mt-1">{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-sm font-bold text-blue-900">通知设置</div>
                <div className="text-xs text-blue-700 mt-1">只保留后台常用提醒，关闭后对应事件不再显示提醒。</div>
              </div>
              <Section title="订单通知">
                <SettingRow label="新订单提醒" desc="有新订单时实时推送通知">
                  <Toggle enabled={notifs.newOrder} onChange={() => updateSettings('notifs', { newOrder: !notifs.newOrder })} />
                </SettingRow>
                <SettingRow label="支付失败提醒" desc="支付失败时立即通知">
                  <Toggle enabled={notifs.paymentFail} onChange={() => updateSettings('notifs', { paymentFail: !notifs.paymentFail })} />
                </SettingRow>
                <SettingRow label="风险订单告警" desc="触发风控规则时高优先级推送">
                  <Toggle enabled={notifs.riskAlert} onChange={() => updateSettings('notifs', { riskAlert: !notifs.riskAlert })} />
                </SettingRow>
              </Section>
              <Section title="报表通知">
                <SettingRow label="每日报表" desc="每天早上 9:00 发送日报摘要">
                  <Toggle enabled={notifs.dailyReport} onChange={() => updateSettings('notifs', { dailyReport: !notifs.dailyReport })} />
                </SettingRow>
                <SettingRow label="每周报表" desc="每周一发送上周数据汇总">
                  <Toggle enabled={notifs.weeklyReport} onChange={() => updateSettings('notifs', { weeklyReport: !notifs.weeklyReport })} />
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <Section title="登录安全">
                <SettingRow label="当前密码" desc="修改密码前需要验证">
                  <div className="relative w-full sm:w-56">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(e) => updatePasswordField('current', e.target.value)}
                      placeholder="填写当前密码"
                      className={`w-full pr-8 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 ${
                        passwordErrors.current
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-blue-500/30'
                      }`}
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {passwordErrors.current && <div className="text-[11px] text-red-500 mt-1">{passwordErrors.current}</div>}
                  </div>
                </SettingRow>
                <SettingRow label="新密码" desc="不修改密码时可留空">
                  <div className="relative w-full sm:w-56">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.next}
                      onChange={(e) => updatePasswordField('next', e.target.value)}
                      placeholder="至少 6 位"
                      className={`w-full pr-8 pl-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 ${
                        passwordErrors.next
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-blue-500/30'
                      }`}
                    />
                    <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {passwordErrors.next && <div className="text-[11px] text-red-500 mt-1">{passwordErrors.next}</div>}
                  </div>
                </SettingRow>
                <SettingRow label="确认新密码" desc="再次输入新密码">
                  <div className="w-full sm:w-56">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={(e) => updatePasswordField('confirm', e.target.value)}
                      placeholder="再次输入"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 bg-slate-50 ${
                        passwordErrors.confirm
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-blue-500/30'
                      }`}
                    />
                    {passwordErrors.confirm && <div className="text-[11px] text-red-500 mt-1">{passwordErrors.confirm}</div>}
                  </div>
                </SettingRow>
                <SettingRow label="双因素认证 (2FA)" desc="登录时需输入验证码">
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] border px-2 py-0.5 rounded-full font-semibold ${security.twoFactorEnabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {security.twoFactorEnabled ? '已启用' : '未启用'}
                    </span>
                    <button
                      onClick={() => updateSettings('security', { twoFactorEnabled: !security.twoFactorEnabled })}
                      className="text-xs text-blue-600 font-semibold hover:underline"
                    >
                      {security.twoFactorEnabled ? '关闭' : '立即开启'}
                    </button>
                  </div>
                </SettingRow>
                <SettingRow label="登录会话时长" desc="自动登出前的空闲时间">
                  <select
                    value={security.sessionDuration}
                    onChange={(e) => updateSettings('security', { sessionDuration: e.target.value })}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50"
                  >
                    <option>2 小时</option>
                    <option>8 小时</option>
                    <option>24 小时</option>
                    <option>永不</option>
                  </select>
                </SettingRow>
              </Section>
              <Section title="访问控制">
                <SettingRow label="IP 白名单" desc="仅允许指定 IP 地址登录">
                  <Toggle enabled={security.ipWhitelist} onChange={() => updateSettings('security', { ipWhitelist: !security.ipWhitelist })} />
                </SettingRow>
                <SettingRow label="登录日志" desc="记录所有登录记录与设备信息">
                  <button className="text-xs text-blue-600 font-semibold hover:underline">查看日志 →</button>
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === 'store' && (
            <div>
              <Section title="品牌基础">
                <FieldGrid
                  values={storeForm}
                  onChange={updateStoreField}
                  fields={[
                    { label: '店铺名称', key: 'storeName' },
                    { label: '店铺简称', key: 'storeShortName' },
                    { label: '品牌 Slogan', key: 'slogan' },
                    { label: '公司名称', key: 'companyName' },
                    { label: '店铺域名', key: 'domain' },
                    { label: 'Logo 图片 URL', key: 'logoUrl', type: 'url' },
                    { label: 'Favicon URL', key: 'faviconUrl', type: 'url' },
                  ]}
                />
              </Section>
              <Section title="页眉与公告">
                <FieldGrid
                  values={storeForm}
                  onChange={updateStoreField}
                  fields={[
                    { label: '顶部公告', key: 'announcementText' },
                    { label: '搜索框占位文案', key: 'searchPlaceholder' },
                  ]}
                />
                <SettingRow label="显示公告栏" desc="关闭后前台可以隐藏顶部公告栏">
                  <Toggle enabled={storeSwitches.showAnnouncement} onChange={() => updateSettings('storeSwitches', { showAnnouncement: !storeSwitches.showAnnouncement })} />
                </SettingRow>
                <SettingRow label="显示语言切换" desc="用于多语言站点交付">
                  <Toggle enabled={storeSwitches.showLanguageSwitch} onChange={() => updateSettings('storeSwitches', { showLanguageSwitch: !storeSwitches.showLanguageSwitch })} />
                </SettingRow>
              </Section>
              <Section title="联系信息">
                <FieldGrid
                  values={storeForm}
                  onChange={updateStoreField}
                  fields={[
                    { label: '客服邮箱', key: 'supportEmail' },
                    { label: '客服电话', key: 'supportPhone' },
                    { label: '公司地址', key: 'companyAddress' },
                    { label: '工作时间', key: 'workingHours' },
                    { label: '商务合作邮箱', key: 'businessEmail' },
                    { label: '媒体合作邮箱', key: 'mediaEmail' },
                  ]}
                />
              </Section>
              <Section title="页脚信息">
                <FieldGrid
                  values={storeForm}
                  onChange={updateStoreField}
                  fields={[
                    { label: '页脚简介', key: 'footerDescription' },
                    { label: '版权文字', key: 'copyrightText' },
                    { label: '备案号 / 许可证号', key: 'icpNumber' },
                    { label: 'X / Twitter 链接', key: 'socialX', type: 'url' },
                    { label: 'Instagram 链接', key: 'socialInstagram', type: 'url' },
                    { label: 'YouTube 链接', key: 'socialYoutube', type: 'url' },
                  ]}
                />
              </Section>
              <Section title="商业基础">
                <FieldGrid
                  values={storeForm}
                  onChange={updateStoreField}
                  fields={[
                    { label: '默认货币', key: 'defaultCurrency' },
                    { label: '货币符号', key: 'currencySymbol' },
                    { label: '默认语言', key: 'defaultLanguage' },
                    { label: '满免邮门槛', key: 'freeShippingThreshold', type: 'number' },
                    { label: '首单优惠比例', key: 'firstOrderDiscount', type: 'number' },
                  ]}
                />
                <SettingRow label="显示销量" desc="商品卡和详情页可用">
                  <Toggle enabled={storeSwitches.showSalesCount} onChange={() => updateSettings('storeSwitches', { showSalesCount: !storeSwitches.showSalesCount })} />
                </SettingRow>
                <SettingRow label="显示评价" desc="商品评分与评价数量可用">
                  <Toggle enabled={storeSwitches.showReviews} onChange={() => updateSettings('storeSwitches', { showReviews: !storeSwitches.showReviews })} />
                </SettingRow>
                <SettingRow label="风控自动拦截" desc="风险分 ≥90 自动拒绝交易">
                  <Toggle enabled={storeSwitches.riskAutoBlock} onChange={() => updateSettings('storeSwitches', { riskAutoBlock: !storeSwitches.riskAutoBlock })} />
                </SettingRow>
              </Section>
              <Section title="SEO 基础">
                <FieldGrid
                  values={storeForm}
                  onChange={updateStoreField}
                  fields={[
                    { label: '网站标题', key: 'siteTitle' },
                    { label: '网站描述', key: 'siteDescription' },
                  ]}
                />
              </Section>
            </div>
          )}

          {activeTab === 'payment' && (
            <div>
              <Section title="支付网关">
                {[
                  { name: 'Stripe', status: '已连接', key: 'sk_live_****...1234', enabled: true },
                  { name: 'PayPal', status: '已连接', key: 'APP-****...5678', enabled: true },
                  { name: 'Braintree', status: '未配置', key: '', enabled: false },
                ].map((g) => (
                  <div key={g.name} className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-black ${g.enabled ? 'bg-blue-600' : 'bg-slate-200'}`}>{g.name[0]}</div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{g.name}</div>
                        {g.key && <div className="text-[10px] text-slate-400 font-mono">{g.key}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${g.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{g.status}</span>
                      <button className="text-xs text-blue-600 font-semibold hover:underline">{g.enabled ? '管理' : '配置'}</button>
                    </div>
                  </div>
                ))}
              </Section>
              <Section title="支付规则">
                <SettingRow label="最大单笔金额" desc="超出此金额需人工审核">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">¥</span>
                    <input
                      value={paymentRules.maxSingleAmount}
                      onChange={(e) => updateSettings('paymentRules', { maxSingleAmount: e.target.value })}
                      type="number"
                      className="w-24 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50"
                    />
                  </div>
                </SettingRow>
                <SettingRow label="手续费率显示" desc="在订单详情中显示网关手续费">
                  <Toggle enabled={paymentRules.showGatewayFee} onChange={() => updateSettings('paymentRules', { showGatewayFee: !paymentRules.showGatewayFee })} />
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div>
              <Section title="Webhook 配置">
                <div className="px-5 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Webhook URL</label>
                    <input
                      value={webhook.url}
                      onChange={(e) => updateSettings('webhook', { url: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">签名密钥</label>
                    <input
                      value={webhook.signingSecret}
                      onChange={(e) => updateSettings('webhook', { signingSecret: e.target.value })}
                      type="password"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-slate-50 font-mono"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-600 mb-2">触发事件</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {['order.created', 'order.paid', 'order.shipped', 'order.cancelled', 'payment.failed', 'refund.created'].map((e) => (
                        <label key={e} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-colors">
                          <input
                            type="checkbox"
                            checked={webhook.events.includes(e)}
                            onChange={() => updateSettings('webhook', {
                              events: webhook.events.includes(e)
                                ? webhook.events.filter((event) => event !== e)
                                : [...webhook.events, e],
                            })}
                            className="rounded border-slate-300 text-blue-600"
                          />
                          <span className="text-xs font-mono text-slate-700">{e}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>
              <Section title="最近推送记录">
                {[
                  { event: 'order.paid', url: 'https://api...', status: '成功', code: '200', time: '2026-05-30 14:32' },
                  { event: 'payment.failed', url: 'https://api...', status: '成功', code: '200', time: '2026-05-29 16:08' },
                  { event: 'order.created', url: 'https://api...', status: '失败', code: '500', time: '2026-05-28 10:14' },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${r.status === '成功' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}`}>{r.status}</span>
                      <span className="text-xs font-mono text-slate-700">{r.event}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-xs font-mono font-bold ${r.code === '200' ? 'text-emerald-600' : 'text-red-600'}`}>{r.code}</span>
                      <span className="text-[11px] text-slate-400">{r.time}</span>
                    </div>
                  </div>
                ))}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
