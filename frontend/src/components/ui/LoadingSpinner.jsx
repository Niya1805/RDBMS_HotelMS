import React from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function LoadingSpinner({ label = 'Loading from MySQL database...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-amber-400 mb-3" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function ApiErrorBanner({ message, onRetry }) {
  return (
    <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5 text-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-rose-100">Database / API Request Failed</p>
          <p className="mt-0.5 text-xs text-rose-200/90">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
