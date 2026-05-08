import { Zap, Lock } from 'lucide-react';
import { useStore } from '../StoreContext';
import { useT } from '../../i18n';

export default function CheckoutHeader({ currentStep = 2 }: { currentStep?: number }) {
  const { navigate } = useStore();
  const { t } = useT();

  const steps = [
    t('checkout.steps.cart'),
    t('checkout.steps.info'),
    t('checkout.steps.payment'),
    t('checkout.steps.complete'),
  ];

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <button onClick={() => navigate({ type: 'home' })} className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-200">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">
            Shop<span className="text-blue-600">Nova</span>
          </span>
        </button>

        <div className="hidden sm:flex items-center gap-0">
          {steps.map((step, i) => {
            const idx = i;
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;
            return (
              <div key={step} className="flex items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                    isDone ? 'bg-blue-600 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {isDone ? (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span className={`text-sm font-semibold whitespace-nowrap ${isActive ? 'text-blue-700' : isDone ? 'text-slate-600' : 'text-slate-400'}`}>
                    {step}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-10 h-0.5 mx-2 rounded-full ${isDone ? 'bg-blue-400' : 'bg-slate-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full flex-shrink-0">
          <Lock size={11} className="text-emerald-500" />
          {t('checkout.secureBadge')}
        </div>
      </div>
    </header>
  );
}
