import { useEffect, useState } from 'react';
import { User, Bell, Shield, ChevronRight, Save, Eye, EyeOff, Check, KeyRound } from 'lucide-react';
import {
  changeAdminPassword,
  fetchAdminSettings,
  saveAdminSettings,
  updateAdminProfile,
} from '../lib/settingsService';
import { DEFAULT_AUTH_SETTINGS, mergeAuthSettings, type AuthSettings } from '../lib/authSettings';
import AdminSwitch from '../components/AdminSwitch';

type AdminSettingsData = Record<string, unknown>;

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
  authSettings: AuthSettings;
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
  authSettings: DEFAULT_AUTH_SETTINGS,
};

function mergeSettings(saved?: Partial<SettingsData>): SettingsData {
  return {
    profileForm: { ...defaultSettings.profileForm, ...saved?.profileForm },
    notifs: { ...defaultSettings.notifs, ...saved?.notifs },
    authSettings: mergeAuthSettings(saved?.authSettings),
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
  { id: 'notifications', label: '通知偏好', icon: Bell },
  { id: 'security', label: '密码安全', icon: Shield },
  { id: 'social-login', label: '第三方登录', icon: KeyRound },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</div>
      <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {desc && <div className="mt-0.5 text-[11px] text-slate-400">{desc}</div>}
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
  const [rawSettings, setRawSettings] = useState<AdminSettingsData>({});
  const [settings, setSettings] = useState<SettingsData>(() => defaultSettings);
  const [lastSavedSettings, setLastSavedSettings] = useState<SettingsData>(() => defaultSettings);
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ current: '', next: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState<PasswordErrors>({});
  const [saveError, setSaveError] = useState('');

  const { profileForm, notifs, authSettings } = settings;
  const hasPasswordInput = Boolean(passwordForm.current || passwordForm.next || passwordForm.confirm);
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(lastSavedSettings) || hasPasswordInput;

  useEffect(() => {
    let ignore = false;

    async function load() {
      setLoading(true);
      setSaveError('');
      try {
        const result = await fetchAdminSettings<AdminSettingsData>();
        if (ignore) return;
        const savedSettings = result.settingsData as AdminSettingsData;
        const next = mergeSettings(savedSettings as Partial<SettingsData>);
        next.profileForm = {
          ...next.profileForm,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
        };
        setRawSettings(savedSettings);
        setSettings(next);
        setLastSavedSettings(next);
      } catch (err) {
        if (!ignore) setSaveError(err instanceof Error ? err.message : '读取后台设置失败');
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, []);

  const updateSettings = <K extends keyof SettingsData>(section: K, value: Partial<SettingsData[K]>) => {
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...value },
    }));
    setSaveError('');
  };

  const updateProfileField = (key: keyof SettingsData['profileForm'], value: string) => {
    updateSettings('profileForm', { [key]: value } as Partial<SettingsData['profileForm']>);
    setProfileErrors((prev) => ({ ...prev, [key]: undefined }));
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
      setSaveError('请先修正密码安全中的错误');
      setActiveTab('security');
      return;
    }

    const googleClientId = settings.authSettings.google.clientId.trim();
    if (settings.authSettings.google.enabled && !googleClientId) {
      setSaved(false);
      setSaveError('开启 Google 登录前，请先填写 Google Web Client ID');
      setActiveTab('social-login');
      return;
    }

    if (googleClientId && !/\.apps\.googleusercontent\.com$/.test(googleClientId)) {
      setSaved(false);
      setSaveError('Google Client ID 通常以 .apps.googleusercontent.com 结尾，请检查配置');
      setActiveTab('social-login');
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

      const nextSettings = {
        ...rawSettings,
        ...settings,
      };
      await saveAdminSettings(nextSettings);

      if (hasPasswordInput) {
        await changeAdminPassword({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.next,
        });
        setPasswordForm({ current: '', next: '', confirm: '' });
      }

      setRawSettings(nextSettings);
      setLastSavedSettings(settings);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
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
          <p className="mt-0.5 text-xs text-slate-400">管理管理员资料、通知偏好和登录密码。</p>
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
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold shadow-sm transition-all ${
            loading || saving
              ? 'cursor-wait bg-slate-200 text-slate-400'
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
        <div className="w-full flex-shrink-0 lg:w-44">
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-3 text-sm font-medium transition-colors last:border-0 ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <tab.icon size={14} className={activeTab === tab.id ? 'text-blue-600' : 'text-slate-400'} />
                  {tab.label}
                </div>
                <ChevronRight size={12} className={activeTab === tab.id ? 'text-blue-400' : 'text-slate-300'} />
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {activeTab === 'profile' && (
            <div>
              <Section title="管理员资料">
                <div className="grid gap-5 px-5 py-5 xl:grid-cols-[240px_1fr]">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center gap-4 xl:flex-col xl:items-start">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-2xl font-black text-white shadow-lg">
                        {profileForm.name.trim().slice(0, 1).toUpperCase() || 'A'}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{profileForm.name || '未填写姓名'}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{profileForm.email || '未填写邮箱'}</div>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-slate-400">角色</div>
                        <div className="mt-0.5 font-semibold text-slate-800">管理员</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                        <div className="text-slate-400">资料完整度</div>
                        <div className="mt-0.5 font-semibold text-slate-800">
                          {Object.values(profileForm).filter((value) => value.trim()).length}/6
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: '姓名', key: 'name' },
                      { label: '邮箱', key: 'email' },
                      { label: '手机号', key: 'phone' },
                      { label: '公司名称', key: 'company' },
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">{field.label}</label>
                        <input
                          value={profileForm[field.key as keyof typeof profileForm]}
                          onChange={(event) => updateProfileField(field.key as keyof SettingsData['profileForm'], event.target.value)}
                          className={`w-full rounded-lg border px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-2 ${
                            profileErrors[field.key as keyof SettingsData['profileForm']]
                              ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-blue-400 focus:ring-blue-500/30'
                          }`}
                        />
                        {profileErrors[field.key as keyof SettingsData['profileForm']] && (
                          <div className="mt-1 text-[11px] text-red-500">
                            {profileErrors[field.key as keyof SettingsData['profileForm']]}
                          </div>
                        )}
                      </div>
                    ))}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">时区</label>
                      <select
                        value={profileForm.timezone}
                        onChange={(event) => updateSettings('profileForm', { timezone: event.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option>Asia/Shanghai</option>
                        <option>Asia/Singapore</option>
                        <option>America/New_York</option>
                        <option>Europe/London</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-slate-600">界面语言</label>
                      <select
                        value={profileForm.language}
                        onChange={(event) => updateSettings('profileForm', { language: event.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option>中文 (简体)</option>
                        <option>English</option>
                      </select>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <Section title="订单提醒">
                <SettingRow label="新订单提醒" desc="有新订单时保留后台提醒偏好">
                  <AdminSwitch enabled={notifs.newOrder} onChange={() => updateSettings('notifs', { newOrder: !notifs.newOrder })} label="新订单提醒" />
                </SettingRow>
                <SettingRow label="支付失败提醒" desc="支付失败时保留后台提醒偏好">
                  <AdminSwitch enabled={notifs.paymentFail} onChange={() => updateSettings('notifs', { paymentFail: !notifs.paymentFail })} label="支付失败提醒" />
                </SettingRow>
                <SettingRow label="风险订单告警" desc="触发风控时保留后台提醒偏好">
                  <AdminSwitch enabled={notifs.riskAlert} onChange={() => updateSettings('notifs', { riskAlert: !notifs.riskAlert })} label="风险订单告警" />
                </SettingRow>
              </Section>
              <Section title="报表提醒">
                <SettingRow label="每日报表" desc="保存日报提醒偏好">
                  <AdminSwitch enabled={notifs.dailyReport} onChange={() => updateSettings('notifs', { dailyReport: !notifs.dailyReport })} label="每日报表" />
                </SettingRow>
                <SettingRow label="每周报表" desc="保存周报提醒偏好">
                  <AdminSwitch enabled={notifs.weeklyReport} onChange={() => updateSettings('notifs', { weeklyReport: !notifs.weeklyReport })} label="每周报表" />
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <Section title="修改密码">
                <SettingRow label="当前密码" desc="修改密码前需要验证">
                  <div className="relative w-full sm:w-56">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.current}
                      onChange={(event) => updatePasswordField('current', event.target.value)}
                      placeholder="填写当前密码"
                      className={`w-full rounded-lg border bg-slate-50 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 ${
                        passwordErrors.current
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-blue-500/30'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {passwordErrors.current && <div className="mt-1 text-[11px] text-red-500">{passwordErrors.current}</div>}
                  </div>
                </SettingRow>
                <SettingRow label="新密码" desc="不修改密码时可留空">
                  <div className="relative w-full sm:w-56">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.next}
                      onChange={(event) => updatePasswordField('next', event.target.value)}
                      placeholder="至少 6 位"
                      className={`w-full rounded-lg border bg-slate-50 py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 ${
                        passwordErrors.next
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-blue-500/30'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    {passwordErrors.next && <div className="mt-1 text-[11px] text-red-500">{passwordErrors.next}</div>}
                  </div>
                </SettingRow>
                <SettingRow label="确认新密码" desc="再次输入新密码">
                  <div className="w-full sm:w-56">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.confirm}
                      onChange={(event) => updatePasswordField('confirm', event.target.value)}
                      placeholder="再次输入"
                      className={`w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        passwordErrors.confirm
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                          : 'border-slate-200 focus:ring-blue-500/30'
                      }`}
                    />
                    {passwordErrors.confirm && <div className="mt-1 text-[11px] text-red-500">{passwordErrors.confirm}</div>}
                  </div>
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === 'social-login' && (
            <div>
              <Section title="Google 登录">
                <SettingRow label="启用 Google 登录" desc="开启后，前台登录和注册页面会显示 Google 官方登录按钮">
                  <AdminSwitch
                    enabled={authSettings.google.enabled}
                    label="启用 Google 登录"
                    onChange={() => updateSettings('authSettings', {
                      google: {
                        ...authSettings.google,
                        enabled: !authSettings.google.enabled,
                      },
                    })}
                  />
                </SettingRow>
                <SettingRow label="Google Web Client ID" desc="在 Google Cloud Console 的 OAuth 客户端中创建 Web 应用后复制 Client ID">
                  <input
                    value={authSettings.google.clientId}
                    onChange={(event) => updateSettings('authSettings', {
                      google: {
                        ...authSettings.google,
                        clientId: event.target.value.trim(),
                      },
                    })}
                    placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-[420px]"
                  />
                </SettingRow>
                <SettingRow label="限制 Workspace 域名" desc="可选。填写 example.com 后，仅允许该 Google Workspace 域名登录">
                  <input
                    value={authSettings.google.hostedDomain}
                    onChange={(event) => updateSettings('authSettings', {
                      google: {
                        ...authSettings.google,
                        hostedDomain: event.target.value.trim().toLowerCase(),
                      },
                    })}
                    placeholder="example.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-64"
                  />
                </SettingRow>
                <SettingRow label="自动创建客户账号" desc="Google 首次登录时自动写入 users 表，后续同邮箱直接绑定">
                  <AdminSwitch
                    enabled={authSettings.google.autoCreateCustomers}
                    label="自动创建客户账号"
                    onChange={() => updateSettings('authSettings', {
                      google: {
                        ...authSettings.google,
                        autoCreateCustomers: !authSettings.google.autoCreateCustomers,
                      },
                    })}
                  />
                </SettingRow>
              </Section>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-700">
                Google Cloud Console 里需要把商城域名加入 Authorized JavaScript origins。示例：<span className="font-mono">https://your-shop-domain.com</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
