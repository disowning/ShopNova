/**
 * Dev/test authentication service.
 * Uses a custom `users` table and accepts legacy plaintext passwords.
 * New passwords are stored with PBKDF2-SHA256 hashes.
 */
import { supabase } from './supabase';
import { hashPassword } from './passwordHash';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  avatar_url: string | null;
  session_token?: string;
}

interface UserAuthRow extends AuthUser {
  password_hash?: string;
  status?: string | null;
  deleted_at?: string | null;
}

const SESSION_KEY = 'shopnova_user';

function toAuthUser(data: UserAuthRow): AuthUser {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: data.role as 'customer' | 'admin',
    avatar_url: data.avatar_url,
    session_token: data.session_token,
  };
}

function assertAccountAllowed(status: string | null | undefined) {
  if (status === '已封禁') {
    throw new Error('账号已被封禁，请联系管理员。');
  }
  if (status === '已删除') {
    throw new Error('账号不存在或已被删除。');
  }
}

export function getSessionUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function updateSessionUser(patch: Partial<AuthUser>) {
  const current = getSessionUser();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveSession(next);
  return next;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { data, error } = await supabase.functions.invoke('custom-auth', {
    body: {
      action: 'login',
      email: input.email.trim().toLowerCase(),
      password: input.password,
    },
  });

  const response = data as { user?: AuthUser; error?: string } | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '登录请求失败，请稍后重试');
  const user = response?.user;
  if (!user?.id || !user.email) throw new Error('登录返回数据不完整');
  saveSession(user);
  return user;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) throw new Error('该邮箱已被注册，请直接登录');

  const { data, error } = await supabase
    .from('users')
    .insert({
      email,
      password_hash: await hashPassword(input.password),
      name: input.name.trim(),
      phone: input.phone.trim(),
      role: 'customer',
      status: '活跃',
    })
    .select('id, email, name, phone, role, avatar_url')
    .single();

  if (error || !data) throw new Error('注册失败，请稍后重试');

  const user = toAuthUser(data as UserAuthRow);
  saveSession(user);
  return user;
}

export async function refreshSessionUser(): Promise<AuthUser | null> {
  const current = getSessionUser();
  if (!current) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone, role, avatar_url, status, deleted_at')
    .eq('id', current.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return current;
  if (!data) {
    clearSession();
    return null;
  }
  try {
    assertAccountAllowed(data.status);
  } catch {
    clearSession();
    return null;
  }

  const user = {
    ...toAuthUser(data as UserAuthRow),
    session_token: current.session_token,
  };
  saveSession(user);
  return user;
}

export async function loginWithGoogleCredential(credential: string): Promise<AuthUser> {
  const { data, error } = await supabase.functions.invoke('google-login', {
    body: { credential },
  });

  const response = data as { user?: AuthUser; error?: string } | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || 'Google 登录失败');

  const user = response?.user;
  if (!user?.id || !user.email) throw new Error('Google 登录返回数据不完整');
  saveSession(user);
  return user;
}

export function logout() {
  clearSession();
}
