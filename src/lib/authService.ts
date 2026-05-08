/**
 * Dev/test authentication service.
 * Uses a custom `users` table with plaintext password matching.
 * Replace password_hash comparison with bcrypt/argon2 before production.
 */
import { supabase } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: 'customer' | 'admin';
  avatar_url: string | null;
}

const SESSION_KEY = 'shopnova_user';

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
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, phone, role, avatar_url, password_hash')
    .eq('email', input.email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error('登录请求失败，请稍后重试');
  if (!data) throw new Error('邮箱或密码不正确');
  if (data.password_hash !== input.password) throw new Error('邮箱或密码不正确');

  const user: AuthUser = {
    id: data.id,
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: data.role as 'customer' | 'admin',
    avatar_url: data.avatar_url,
  };
  saveSession(user);
  return user;
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();

  // Check for duplicate email
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
      password_hash: input.password,
      name: input.name.trim(),
      phone: input.phone.trim(),
      role: 'customer',
    })
    .select('id, email, name, phone, role, avatar_url')
    .single();

  if (error || !data) throw new Error('注册失败，请稍后重试');

  const user: AuthUser = {
    id: data.id,
    email: data.email,
    name: data.name,
    phone: data.phone,
    role: 'customer',
    avatar_url: data.avatar_url,
  };
  saveSession(user);
  return user;
}

export function logout() {
  clearSession();
}
