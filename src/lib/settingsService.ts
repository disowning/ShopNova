import { supabase } from './supabase';
import { getSessionUser, updateSessionUser, type AuthUser } from './authService';

export interface AdminSettingsRecord<T> {
  user: AuthUser;
  settingsData: Partial<T>;
}

async function callSettingsAdmin<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const sessionUser = getSessionUser();
  if (!sessionUser) throw new Error('请先登录管理员账号');

  const { data, error } = await supabase.functions.invoke('settings-admin', {
    body: {
      action,
      adminUserId: sessionUser.id,
      adminSessionToken: sessionUser.session_token,
      ...payload,
    },
  });

  const response = data as (T & { error?: string }) | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '系统设置请求失败');
  if (!response) throw new Error('系统设置服务没有返回数据');
  return response as T;
}

export async function fetchAdminSettings<T>(): Promise<AdminSettingsRecord<T>> {
  const result = await callSettingsAdmin<AdminSettingsRecord<T>>('get');
  updateSessionUser(result.user);
  return result;
}

export async function saveAdminSettings<T>(settingsData: T) {
  await callSettingsAdmin<{ ok: true }>('saveSettings', { settingsData });
}

export async function updateAdminProfile(input: { name: string; email: string; phone: string }) {
  const result = await callSettingsAdmin<{ user: AuthUser }>('updateProfile', { profile: input });
  updateSessionUser(result.user);
}

export async function changeAdminPassword(input: { currentPassword: string; newPassword: string }) {
  await callSettingsAdmin<{ ok: true }>('changePassword', {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
  });
}
