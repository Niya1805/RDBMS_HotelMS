import React, { useEffect, useState, useCallback } from 'react';
import { Phone, Mail, Clock } from 'lucide-react';
import { fetchLocations } from '../api/client';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import SystemOverview from './SystemOverview';

export default function AboutContactPage() {
  const [locations, setLocations] = useState([]);

  const loadLocations = useCallback(async () => {
    try {
      const res = await fetchLocations();
      setLocations(res.data || []);
    } catch {
      // handled in SystemOverview banner below
    }
  }, []);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  return (
    <div className="space-y-12">
      <div className="space-y-3">
        <Badge tone="amber">About Grand Aurelia &amp; System Architecture</Badge>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Hospitality Heritage Meets Relational Database Engineering
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
          Grand Aurelia Hotels &amp; Resorts is our full-stack Hotel Reservation System built for
          the RDBMS Lab &amp; Theory project. Every property, suite, bespoke experience, guest
          booking, payment, invoice, cancellation, review, and notification is backed by MySQL 8
          and exposed through a parameterized Flask REST API.
        </p>
      </div>

      {/* Contact & Property Directory */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card title="24/7 Central Concierge" subtitle="Reservations & Guest Assistance">
          <div className="space-y-3 text-xs text-slate-300">
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-amber-400" />
              <span>+91 (022) 6600-8800</span>
            </p>
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-400" />
              <span>concierge@grandaurelia.example.com</span>
            </p>
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-400" />
              <span>Check-In: 14:00 IST • Check-Out: 11:00 IST</span>
            </p>
          </div>
        </Card>

        <Card
          title={`Live Property Directory (${locations.length})`}
          subtitle="Loaded from MySQL Location table"
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {locations.map((loc) => (
              <div
                key={loc.l_id}
                className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1"
              >
                <p className="font-semibold text-slate-100">
                  L-ID #{loc.l_id} — {loc.name}
                </p>
                <p className="text-slate-400">
                  {loc.address}, {loc.city}, {loc.country}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Live ER Schema & MySQL 8 Status Inspector */}
      <div className="border-t border-slate-800 pt-10">
        <SystemOverview />
      </div>
    </div>
  );
}
