import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useT } from '../../i18n';

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
}

type InputFieldProps = FieldProps & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' };
type TextareaFieldProps = FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' };
type SelectFieldProps = FieldProps & { as: 'select'; options: { value: string; label: string }[]; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void };

type Props = InputFieldProps | TextareaFieldProps | SelectFieldProps;

export default function FormField(props: Props) {
  const { t } = useT();
  const { label, error, required, optional, as = 'input', ...rest } = props;

  const inputClass = `w-full px-3.5 py-2.5 text-sm border rounded-xl bg-white text-slate-900 placeholder-slate-400 transition-all focus:outline-none focus:ring-2 ${
    error
      ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
      : 'border-slate-200 focus:ring-blue-100 focus:border-blue-400 hover:border-slate-300'
  }`;

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label}
        {optional && <span className="ml-1 text-slate-400 font-normal">{t('common.optional')}</span>}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {as === 'textarea' ? (
        <textarea
          {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
      ) : as === 'select' ? (
        <select
          value={(props as SelectFieldProps).value}
          onChange={(props as SelectFieldProps).onChange}
          className={`${inputClass} appearance-none cursor-pointer`}
        >
          {(props as SelectFieldProps).options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          className={inputClass}
        />
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
