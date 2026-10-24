import React from 'react';

const TONES = {
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  sky: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  slate: 'bg-slate-800 text-slate-300 border-slate-700',
};

export default function Badge({ children, tone = 'slate', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        TONES[tone] || TONES.slate
      } ${className}`}
    >
      {children}
    </span>
  );
}
