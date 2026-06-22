import { supabase } from './supabase';
import { getSessionUser } from './authService';
import type { CustomerRules } from './customerRules';

export interface DBCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  member_level: string;
  status: string;
  total_spend: number;
  order_count: number;
  last_order_at: string | null;
  created_at: string;
}

export interface CustomerStats {
  total: number;
  active: number;
  vip: number;
  revenue: number;
}

export interface CustomerOrder {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  delivery_method: string;
  created_at: string;
  shipping_addresses?: {
    recipient_name: string;
    email: string;
    phone: string;
    country: string;
    province: string;
    city: string;
  } | null;
}

interface ListCustomersInput {
  search: string;
  level: string;
  page: number;
  pageSize: number;
}

async function callCustomerAdmin<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const admin = getSessionUser();
  if (!admin || admin.role !== 'admin') throw new Error('请先登录管理员账号');

  const { data, error } = await supabase.functions.invoke('customer-admin', {
    body: {
      action,
      adminUserId: admin.id,
      adminSessionToken: admin.session_token,
      ...payload,
    },
  });

  const response = data as (T & { error?: string }) | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '客户管理请求失败');
  if (!response) throw new Error('客户管理服务没有返回数据');
  return response as T;
}

export async function listCustomers(input: ListCustomersInput) {
  return callCustomerAdmin<{ customers: DBCustomer[]; total: number }>('list', { ...input });
}

export async function fetchCustomerStats() {
  return callCustomerAdmin<{ stats: CustomerStats }>('stats');
}

export async function fetchCustomerOrders(customerId: string) {
  return callCustomerAdmin<{ orders: CustomerOrder[] }>('orders', { customerId });
}

export async function createCustomerAdmin(input: {
  name: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  status: string;
}) {
  return callCustomerAdmin<{ customer: DBCustomer }>('create', input);
}

export async function updateCustomerAdmin(input: {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  status: string;
}) {
  return callCustomerAdmin<{ customer: DBCustomer }>('update', input);
}

export async function resetCustomerPasswordAdmin(customerId: string, password: string) {
  return callCustomerAdmin<{ ok: true }>('resetPassword', { customerId, password });
}

export async function updateCustomerStatusAdmin(customerId: string, status: string) {
  return callCustomerAdmin<{ customer: DBCustomer }>('status', { customerId, status });
}

export async function deleteCustomerAdmin(customerId: string) {
  return callCustomerAdmin<{ ok: true }>('delete', { customerId });
}

export async function syncCustomerSummariesAdmin() {
  return callCustomerAdmin<{ updatedCount: number }>('sync');
}

export async function fetchCustomerRulesAdmin() {
  return callCustomerAdmin<{ customerRules: CustomerRules }>('getRules');
}

export async function saveCustomerRulesAdmin(customerRules: CustomerRules) {
  return callCustomerAdmin<{ customerRules: CustomerRules }>('saveRules', { customerRules });
}
