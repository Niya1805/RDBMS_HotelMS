import React, { useEffect, useState, useCallback } from 'react';
import { fetchSystemHealth } from '../api/client';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import StatusBanner from '../components/ui/StatusBanner';

const ER_SCHEMA_SPEC = [
  {
    entity: 'User',
    pk: 'U-ID',
    originalAttrs: ['U-ID', 'Name', 'Phone', 'Email'],
    addedAttrs: [],
    relationships: ['makes → Bookings', 'receives → Notification', 'gives → Reviews', 'have → Invoices'],
  },
  {
    entity: 'Location',
    pk: 'L-ID',
    originalAttrs: ['L-ID', 'Name', 'Address', 'City', 'Country'],
    addedAttrs: [],
    relationships: ['has ← Services'],
  },
  {
    entity: 'Services',
    pk: 'S-ID',
    originalAttrs: ['S-ID', 'Name', 'Price', 'Description'],
    addedAttrs: ['L-ID (FK)', 'Category (Room / Add-On)', 'Max_Guests', 'Total_Units'],
    relationships: ['has → Location', 'has ← Bookings', 'referenced by → Reviews'],
  },
  {
    entity: 'Bookings',
    pk: 'B-ID',
    originalAttrs: ['(Blank in Diagram1.dia — B-ID referenced by Payment, Cancellation, Invoices)'],
    addedAttrs: ['B-ID (PK)', 'U-ID (FK)', 'S-ID (FK)', 'Check_In', 'Check_Out', 'Guests', 'Status'],
    relationships: ['makes ← User', 'has → Services', 'have → Payment', 'have → Cancellation'],
  },
  {
    entity: 'Payment',
    pk: 'P-ID',
    originalAttrs: ['P-ID', 'B-ID (FK)', 'Amt', 'Date', 'Method'],
    addedAttrs: [],
    relationships: ['have ← Bookings', 'makes ← User (resolved via Bookings in 3NF)'],
  },
  {
    entity: 'Cancellation',
    pk: 'C-ID',
    originalAttrs: ['C-ID', 'B-ID (FK)', 'Date', 'Refund-amt'],
    addedAttrs: [],
    relationships: ['have → Bookings'],
  },
  {
    entity: 'Invoices',
    pk: 'I-ID',
    originalAttrs: ['I-ID', 'U-ID (FK)', 'B-ID (FK)', 'Amt', 'Date'],
    addedAttrs: [],
    relationships: ['have ← User', 'references → Bookings'],
  },
  {
    entity: 'Reviews',
    pk: 'R-ID',
    originalAttrs: ['R-ID', 'U-ID (FK)', 'S-ID (FK)', 'Rating', 'Comment'],
    addedAttrs: [],
    relationships: ['gives ← User', 'references → Services'],
  },
  {
    entity: 'Notification',
    pk: 'N-ID',
    originalAttrs: ['N-ID', 'U-ID (FK)', 'Message'],
    addedAttrs: [],
    relationships: ['receives ← User'],
  },
];

export default function SystemOverview() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSystemHealth();
      setHealth(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Could not connect to the Flask backend on http://localhost:5000/api'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const existingTablesLower = (health?.database?.existing_tables || []).map((t) =>
    t.toLowerCase()
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge tone="amber">Phase 2 — Project Architecture &amp; ER Foundation</Badge>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 sm:text-4xl">
          Hotel Reservation System Architecture
        </h1>
        <p className="max-w-3xl text-sm text-slate-400">
          Full-stack architecture connecting React (Vite + Tailwind CSS) to MySQL 8 strictly
          through the Python Flask REST API. No synthetic or mock frontend datasets are used.
        </p>
      </div>

      <StatusBanner
        health={health}
        loading={loading}
        error={error}
        onRefresh={checkHealth}
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {ER_SCHEMA_SPEC.map((item) => {
          const tableExists = existingTablesLower.includes(item.entity.toLowerCase());
          return (
            <Card
              key={item.entity}
              title={item.entity}
              subtitle={`Primary Key: ${item.pk}`}
              badge={
                <Badge tone={tableExists ? 'emerald' : 'slate'}>
                  {tableExists ? 'Table in MySQL' : 'Pending DDL'}
                </Badge>
              }
            >
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-slate-300 block mb-1">
                    Original Diagram1.dia Attributes:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {item.originalAttrs.map((attr) => (
                      <span
                        key={attr}
                        className="rounded bg-slate-800/90 px-2 py-0.5 text-slate-200 border border-slate-700/80"
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>

                {item.addedAttrs.length > 0 && (
                  <div>
                    <span className="font-semibold text-amber-300 block mb-1">
                      Agreed Schema Additions:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {item.addedAttrs.map((attr) => (
                        <span
                          key={attr}
                          className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-300 border border-amber-500/30"
                        >
                          + {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-semibold text-slate-400 block mb-1">
                    ER Relationships:
                  </span>
                  <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                    {item.relationships.map((rel) => (
                      <li key={rel}>{rel}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
