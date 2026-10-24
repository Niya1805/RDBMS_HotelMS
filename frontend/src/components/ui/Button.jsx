import React from 'react';

const VARIANTS = {
  primary:
    'bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shadow-sm shadow-amber-500/20',
  secondary:
    'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700',
  outline:
    'bg-transparent hover:bg-amber-500/10 text-amber-400 border border-amber-500/40',
  danger:
    'bg-rose-600 hover:bg-rose-500 text-white font-semibold',
};

export default function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  disabled = false,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
        VARIANTS[variant] || VARIANTS.primary
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
