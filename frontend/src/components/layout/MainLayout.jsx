import React from 'react';
import { Outlet } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useApp } from '../../context/AppContext';

export default function MainLayout() {
  const { toasts, removeToast } = useApp();

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar />

      {/* Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full px-4 pointer-events-none">
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-md transition-all ${
                isError
                  ? 'border-rose-500/40 bg-rose-950/90 text-rose-100'
                  : isSuccess
                  ? 'border-emerald-500/40 bg-emerald-950/90 text-emerald-100'
                  : 'border-amber-500/40 bg-slate-900/95 text-slate-100'
              }`}
            >
              <div className="flex items-start gap-2.5 text-sm">
                {isError ? (
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                )}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
