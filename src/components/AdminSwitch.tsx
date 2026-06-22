interface AdminSwitchProps {
  enabled: boolean;
  onChange: () => void;
  disabled?: boolean;
  label?: string;
}

export default function AdminSwitch({ enabled, onChange, disabled = false, label }: AdminSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border p-0.5 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        enabled
          ? 'border-blue-600 bg-blue-600 shadow-inner shadow-blue-700/20'
          : 'border-slate-300 bg-slate-300 shadow-inner shadow-slate-400/20'
      }`}
    >
      <span
        className={`block h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
