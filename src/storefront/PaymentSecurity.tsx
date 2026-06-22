import { AlertCircle, ChevronRight, CreditCard, LockKeyhole, RefreshCcw, ShieldCheck } from 'lucide-react';
import { useStore } from './StoreContext';
import { useCmsContent } from './CmsContentContext';
import { editableAttrs } from './visualEditor';

function splitMethods(value: string) {
  return value
    .split(/[/,，\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function editPayment(fieldKey: string, label: string) {
  return editableAttrs({
    entryId: 'policy.paymentSecurity',
    source: 'cms',
    itemId: 'payment-security',
    fieldKey,
    label,
  });
}

function InfoCard({ icon: Icon, title, desc, editAttrs }: { icon: React.ElementType; title: string; desc: string; editAttrs?: Record<string, string> }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        <Icon size={18} />
      </div>
      <h2 className="mb-2 text-sm font-black text-slate-900">{title}</h2>
      <p className="text-sm leading-7 text-slate-500" {...editAttrs}>{desc}</p>
    </div>
  );
}

export default function PaymentSecurity() {
  const { navigate } = useStore();
  const { field } = useCmsContent();
  const title = field('payment-security', 'title', '支付安全说明');
  const subtitle = field('payment-security', 'subtitle', '了解支付方式、安全保障和异常支付处理方式。');
  const methods = splitMethods(field('payment-security', 'methods', '信用卡 / PayPal'));
  const securityNote = field('payment-security', 'securityNote', '支付信息会通过支付服务商的安全流程处理，平台不保存完整银行卡敏感信息。');
  const exceptionNote = field('payment-security', 'exceptionNote', '如遇支付失败、重复扣款或状态异常，请保留订单号并联系客服核查。');
  const refundNote = field('payment-security', 'refundNote', '退款会按订单规则和支付渠道流程原路退回，到账时间以支付渠道处理为准。');

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 px-4 py-14 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
            <button type="button" onClick={() => navigate({ type: 'home' })} className="transition-colors hover:text-white">首页</button>
            <ChevronRight size={12} />
            <span className="text-slate-300">{title}</span>
          </div>
          <div className="mb-4 flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/20">
              <ShieldCheck size={22} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-3xl font-black" {...editPayment('title', '支付安全标题')}>{title}</h1>
              <p className="mt-1 text-sm text-slate-400">Payment Security</p>
            </div>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400" {...editPayment('subtitle', '支付安全说明')}>{subtitle}</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <section className="mb-10">
          <h2 className="mb-4 text-xl font-black text-slate-900">支持的支付方式</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {methods.map((method) => (
              <div key={method} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3" {...editPayment('methods', '支持的支付方式')}>
                <CreditCard size={16} className="text-blue-600" />
                <span className="text-sm font-bold text-slate-800">{method}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <InfoCard icon={LockKeyhole} title="安全保障" desc={securityNote} editAttrs={editPayment('securityNote', '安全保障说明')} />
          <InfoCard icon={AlertCircle} title="异常支付处理" desc={exceptionNote} editAttrs={editPayment('exceptionNote', '异常支付说明')} />
          <InfoCard icon={RefreshCcw} title="退款说明" desc={refundNote} editAttrs={editPayment('refundNote', '退款说明')} />
        </section>
      </div>
    </div>
  );
}
