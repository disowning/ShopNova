import { supabase } from './supabase';

export interface CustomerRules {
  vipSpendThreshold: number;
  vipOrderThreshold: number;
  highVipSpendThreshold: number;
  highVipOrderThreshold: number;
}

export type CustomerRulesSettingsData = Record<string, unknown> & {
  customerRules?: Partial<CustomerRules>;
};

export const DEFAULT_CUSTOMER_RULES: CustomerRules = {
  vipSpendThreshold: 3000,
  vipOrderThreshold: 5,
  highVipSpendThreshold: 10000,
  highVipOrderThreshold: 20,
};

function cleanNumber(value: unknown, fallback: number) {
  const next = Number(value);
  return Number.isFinite(next) && next >= 0 ? next : fallback;
}

export function mergeCustomerRules(saved?: Partial<CustomerRules>): CustomerRules {
  return {
    vipSpendThreshold: cleanNumber(saved?.vipSpendThreshold, DEFAULT_CUSTOMER_RULES.vipSpendThreshold),
    vipOrderThreshold: cleanNumber(saved?.vipOrderThreshold, DEFAULT_CUSTOMER_RULES.vipOrderThreshold),
    highVipSpendThreshold: cleanNumber(saved?.highVipSpendThreshold, DEFAULT_CUSTOMER_RULES.highVipSpendThreshold),
    highVipOrderThreshold: cleanNumber(saved?.highVipOrderThreshold, DEFAULT_CUSTOMER_RULES.highVipOrderThreshold),
  };
}

export function getMemberLevelByRules(orderCount: number, totalSpend: number, rules: CustomerRules = DEFAULT_CUSTOMER_RULES) {
  if (totalSpend >= rules.highVipSpendThreshold || orderCount >= rules.highVipOrderThreshold) return '高级VIP';
  if (totalSpend >= rules.vipSpendThreshold || orderCount >= rules.vipOrderThreshold) return 'VIP';
  if (orderCount > 0) return '普通';
  return '新用户';
}

export async function fetchCustomerRulesForAdmin() {
  return {
    rawSettings: {},
    customerRules: await fetchPublicCustomerRules(),
  };
}

export async function saveCustomerRules(_rawSettings: CustomerRulesSettingsData, customerRules: CustomerRules) {
  const nextRules = mergeCustomerRules(customerRules);
  const { error } = await supabase
    .from('customer_rules')
    .upsert({
      id: 'default',
      vip_spend_threshold: nextRules.vipSpendThreshold,
      vip_order_threshold: nextRules.vipOrderThreshold,
      high_vip_spend_threshold: nextRules.highVipSpendThreshold,
      high_vip_order_threshold: nextRules.highVipOrderThreshold,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  if (error) throw new Error('保存会员规则失败，请确认 customer_rules 表已创建');
  return {};
}

export async function fetchPublicCustomerRules(): Promise<CustomerRules> {
  const { data, error } = await supabase
    .from('customer_rules')
    .select('vip_spend_threshold, vip_order_threshold, high_vip_spend_threshold, high_vip_order_threshold')
    .eq('id', 'default')
    .maybeSingle();

  if (!error && data) {
    return mergeCustomerRules({
      vipSpendThreshold: data.vip_spend_threshold,
      vipOrderThreshold: data.vip_order_threshold,
      highVipSpendThreshold: data.high_vip_spend_threshold,
      highVipOrderThreshold: data.high_vip_order_threshold,
    });
  }

  const { data: legacyData } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const settingsData = (legacyData?.settings_data ?? {}) as CustomerRulesSettingsData;
  return mergeCustomerRules(settingsData.customerRules);
}
