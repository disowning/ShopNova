import { supabase } from './supabase';
import { getSessionUser } from './authService';

export interface DBRiskOrder {
  id: string;
  order_id: string;
  user_email: string;
  amount: number;
  country: string;
  risk_score: number;
  risk_level: string;
  flags: string[];
  ip_address: string;
  device_info: string;
  review_status: string;
  created_at: string;
  orders?: {
    order_number: string;
    status: string;
    payment_status: string;
  } | null;
}

export interface RiskStats {
  total: number;
  pending: number;
  rejected: number;
  passed: number;
  avgScore: number;
}

async function callRiskAdmin<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const admin = getSessionUser();
  if (!admin || admin.role !== 'admin') throw new Error('请先登录管理员账号');

  const { data, error } = await supabase.functions.invoke('risk-admin', {
    body: {
      action,
      adminUserId: admin.id,
      adminSessionToken: admin.session_token,
      ...payload,
    },
  });

  const response = data as (T & { error?: string }) | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '风险订单请求失败');
  if (!response) throw new Error('风险订单服务没有返回数据');
  return response as T;
}

export async function listRiskOrders(page: number, pageSize: number) {
  return callRiskAdmin<{ riskOrders: DBRiskOrder[]; total: number }>('list', { page, pageSize });
}

export async function fetchRiskStats() {
  return callRiskAdmin<{ stats: RiskStats }>('stats');
}

export async function reviewRiskOrder(riskOrderId: string, status: '已通过' | '已拒绝') {
  return callRiskAdmin<{ ok: true }>('review', { riskOrderId, status });
}
