import { supabase } from './supabase';
import { getSessionUser, updateSessionUser, type AuthUser } from './authService';

export interface AdminSettingsRecord<T> {
  user: AuthUser;
  settingsData: Partial<T>;
}

export async function fetchAdminSettings<T>(): Promise<AdminSettingsRecord<T>> {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id, email, name, phone, role, avatar_url')
    .eq('id', sessionUser.id)
    .maybeSingle();

  if (userError) throw new Error('读取账号信息失败');
  if (!userRow) throw new Error('账号不存在，请重新登录');

  const user: AuthUser = {
    id: userRow.id,
    email: userRow.email,
    name: userRow.name,
    phone: userRow.phone,
    role: userRow.role as 'customer' | 'admin',
    avatar_url: userRow.avatar_url,
  };
  updateSessionUser(user);

  const { data: settingsRow, error: settingsError } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .eq('user_id', user.id)
    .maybeSingle();

  if (settingsError) throw new Error('读取后台设置失败，请确认 admin_settings 表已创建');

  return {
    user,
    settingsData: (settingsRow?.settings_data ?? {}) as Partial<T>,
  };
}

export async function saveAdminSettings<T>(settingsData: T) {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const { error } = await supabase
    .from('admin_settings')
    .upsert({
      user_id: sessionUser.id,
      settings_data: settingsData,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw new Error('保存后台设置失败，请确认 admin_settings 表已创建');
}

export async function updateAdminProfile(input: { name: string; email: string; phone: string }) {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const email = input.email.trim().toLowerCase();
  const { data: duplicate, error: duplicateError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .neq('id', sessionUser.id)
    .maybeSingle();

  if (duplicateError) throw new Error('检查邮箱失败，请稍后重试');
  if (duplicate) throw new Error('该邮箱已被其他账号使用');

  const { data, error } = await supabase
    .from('users')
    .update({
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionUser.id)
    .select('id, email, name, phone, role, avatar_url')
    .single();

  if (error || !data) throw new Error('保存账号资料失败');

  updateSessionUser({
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: data.role as 'customer' | 'admin',
    avatar_url: data.avatar_url,
  });
}

export async function changeAdminPassword(input: { currentPassword: string; newPassword: string }) {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const { data, error } = await supabase
    .from('users')
    .select('password_hash')
    .eq('id', sessionUser.id)
    .maybeSingle();

  if (error) throw new Error('验证当前密码失败');
  if (!data || data.password_hash !== input.currentPassword) throw new Error('当前密码不正确');

  const { error: updateError } = await supabase
    .from('users')
    .update({
      password_hash: input.newPassword,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionUser.id);

  if (updateError) throw new Error('修改密码失败，请稍后重试');
}
