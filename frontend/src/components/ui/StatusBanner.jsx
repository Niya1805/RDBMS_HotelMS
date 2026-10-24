import React from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button';

export default function StatusBanner({ health, loading, error, onRefresh }) {
  const isDbConnected = health?.database?.connected;

  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        isDbConnected
          ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
          : 'border-amber-500/30 bg-amber-950/20 text-amber-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {isDbConnected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="text-sm">
          <p className="font-semibold">
            {loading
              ? 'Checking Flask API & MySQL 8 connection...'
              : error
              ? 'Flask Backend Unreachable'
              : isDbConnected
              ? `Connected to MySQL ${health.database.mysql_version} (${health.database.database})`
              : `Flask API Online — MySQL 8 Not Connected Yet (${health?.database?.database || 'hotel_reservation_db'})`}
          </p>
          <p className="mt-0.5 text-xs opacity-80">
            {error
              ? error
              : isDbConnected
              ? `${health.database.existing_tables?.length || 0} of 9 ER diagram tables detected in database.`
              : health?.database?.error ||
                'Configure backend/.env and create the MySQL 8 database to enable live queries.'}
          </p>
        </div>
      </div>

      <Button variant="secondary" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        Verify Connection
      </Button>
    </div>
  );
}
