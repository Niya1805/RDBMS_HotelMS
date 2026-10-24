import React from 'react';

export default function Card({ title, subtitle, badge, children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-slate-800/90 bg-slate-900/70 backdrop-blur-sm p-6 shadow-lg ${className}`}
    >
      {(title || subtitle || badge) && (
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {badge && <div>{badge}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
