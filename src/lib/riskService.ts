import { supabase } from './supabase';
import { fetchPublicSiteSettings } from './siteSettings';
import type { CheckoutInput } from './checkoutService';

interface RiskAssessment {
  score: number;
  level: string;
  flags: string[];
}

export interface CheckoutRiskResult {
  riskScore: number;
  riskLevel: string;
  reviewStatus: '未触发' | '待审核' | '已拒绝';
  orderStatus?: string;
  paymentStatus?: string;
}

const TEMP_EMAIL_DOMAINS = ['mailinator', '10minutemail', 'tempmail', 'guerrillamail', 'yopmail'];

function addRisk(flags: string[], label: string, score: number) {
  flags.push(label);
  return score;
}

function getRiskLevel(score: number) {
  if (score >= 90) return '极高';
  if (score >= 80) return '高';
  if (score >= 60) return '中';
  return '低';
}

function namesLookDifferent(cardName: string, recipientName: string) {
  const card = cardName.trim().toLowerCase();
  const recipient = recipientName.trim().toLowerCase();
  if (!card || !recipient) return false;
  const recipientParts = recipient.split(/\s+/).filter((part) => part.length >= 2);
  return recipientParts.length > 0 && recipientParts.every((part) => !card.includes(part));
}

export function assessCheckoutRisk(input: CheckoutInput): RiskAssessment {
  const flags: string[] = [];
  let score = 0;
  const email = input.email.trim().toLowerCase();
  const domain = email.split('@')[1] ?? '';

  if (input.total >= 10000) score += addRisk(flags, '超高金额订单', 45);
  else if (input.total >= 5000) score += addRisk(flags, '高金额订单', 25);

  if (input.delivery === 'nextday' && input.total >= 2000) score += addRisk(flags, '高金额次日达', 15);
  if (input.payment === 'cod' && input.total >= 2000) score += addRisk(flags, '高金额货到付款', 20);
  if (!input.phone.trim()) score += addRisk(flags, '缺少联系电话', 15);
  if (!input.country.trim() || !input.city.trim() || !input.street1.trim()) score += addRisk(flags, '地址信息不完整', 20);
  if (TEMP_EMAIL_DOMAINS.some((item) => domain.includes(item))) score += addRisk(flags, '临时邮箱', 35);
  if (input.payment === 'card' && namesLookDifferent(input.cardData.name, input.recipientName)) {
    score += addRisk(flags, '持卡人与收件人不一致', 15);
  }

  return {
    score: Math.min(100, score),
    level: getRiskLevel(Math.min(100, score)),
    flags,
  };
}

export async function createCheckoutRiskOrder(
  orderId: string,
  input: CheckoutInput,
  paymentStatus: string,
): Promise<CheckoutRiskResult> {
  const assessment = assessCheckoutRisk(input);
  if (assessment.score < 60) {
    return {
      riskScore: assessment.score,
      riskLevel: assessment.level,
      reviewStatus: '未触发',
      paymentStatus,
    };
  }

  const settings = await fetchPublicSiteSettings();
  const autoReject = settings.storeSwitches.riskAutoBlock && assessment.score >= 90;
  const nextPaymentStatus = autoReject ? (paymentStatus === 'paid' ? 'refunded' : 'failed') : paymentStatus;
  const nextOrderStatus = autoReject ? 'cancelled' : 'pending';
  const reviewStatus = autoReject ? '已拒绝' : '待审核';

  const userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent;

  await supabase.from('risk_orders').insert({
    order_id: orderId,
    user_email: input.email.trim().toLowerCase(),
    amount: input.total,
    country: input.country.trim(),
    risk_score: assessment.score,
    risk_level: assessment.level,
    flags: assessment.flags,
    ip_address: '浏览器端未采集',
    device_info: userAgent.slice(0, 120),
    review_status: reviewStatus,
    reviewed_at: autoReject ? new Date().toISOString() : null,
  });

  await supabase
    .from('orders')
    .update({
      status: nextOrderStatus,
      payment_status: nextPaymentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (autoReject) {
    await supabase
      .from('payments')
      .update({
        status: nextPaymentStatus === 'refunded' ? 'refunded' : 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', orderId);
  }

  return {
    riskScore: assessment.score,
    riskLevel: assessment.level,
    reviewStatus,
    orderStatus: nextOrderStatus,
    paymentStatus: nextPaymentStatus,
  };
}
