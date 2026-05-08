import { Truck, Zap, Clock } from 'lucide-react';
import { useT } from '../../i18n';

export type DeliveryMethod = 'standard' | 'express' | 'nextday';

interface Option {
  id: DeliveryMethod;
  icon: React.ReactNode;
  name: string;
  desc: string;
  price: number;
  badge?: string;
}

interface Props {
  value: DeliveryMethod;
  onChange: (v: DeliveryMethod) => void;
}

export default function DeliveryMethodSelector({ value, onChange }: Props) {
  const { t } = useT();

  const options: Option[] = [
    {
      id: 'standard',
      icon: <Truck size={18} />,
      name: t('checkout.delivery.standardName'),
      desc: t('checkout.delivery.standardDesc'),
      price: 0,
    },
    {
      id: 'express',
      icon: <Zap size={18} />,
      name: t('checkout.delivery.expressName'),
      desc: t('checkout.delivery.expressDesc'),
      price: 29,
      badge: t('checkout.delivery.recommended'),
    },
    {
      id: 'nextday',
      icon: <Clock size={18} />,
      name: t('checkout.delivery.nextdayName'),
      desc: t('checkout.delivery.nextdayDesc'),
      price: 59,
    },
  ];

  return (
    <div className="space-y-2.5">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
              isSelected
                ? 'border-blue-500 bg-blue-50/60 shadow-sm shadow-blue-100'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
            }`}>
              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
            </div>

            <div className={`flex-shrink-0 transition-colors ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}>
              {opt.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${isSelected ? 'text-blue-800' : 'text-slate-800'}`}>{opt.name}</span>
                {opt.badge && (
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{opt.badge}</span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
            </div>

            <div className={`text-sm font-black flex-shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
              {opt.price === 0 ? <span className="text-emerald-600">{t('common.free')}</span> : `¥${opt.price}`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
