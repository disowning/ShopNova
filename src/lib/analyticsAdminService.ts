import { supabase } from './supabase';
import { getSessionUser } from './authService';

export interface MonthlyData {
  month: string;
  revenue: number;
  orders: number;
}

export interface TopProduct {
  name: string;
  revenue: number;
  qty: number;
}

export interface DailyOrder {
  date: string;
  count: number;
}

export interface AnalyticsSummary {
  monthlyData: MonthlyData[];
  topProducts: TopProduct[];
  dailyOrders: DailyOrder[];
  kpi: {
    totalRevenue: number;
    totalOrders: number;
    avgOrder: number;
    growth: number;
  };
}

export async function fetchAnalyticsSummary() {
  const admin = getSessionUser();
  if (!admin || admin.role !== 'admin') throw new Error('请先登录管理员账号');

  const { data, error } = await supabase.functions.invoke('analytics-admin', {
    body: {
      action: 'summary',
      adminUserId: admin.id,
      adminSessionToken: admin.session_token,
    },
  });

  const response = data as { analytics?: AnalyticsSummary; error?: string } | null;
  if (error || response?.error) throw new Error(response?.error || error?.message || '数据分析请求失败');
  if (!response?.analytics) throw new Error('数据分析服务没有返回数据');
  return response.analytics;
}
