import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Phone, Mail, MapPin, Database } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-800/90 bg-slate-950 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-slate-100 font-serif-display">
                Grand Aurelia
              </span>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Curated luxury heritage palaces, coastal villas, metropolitan residences, and
              alpine retreats across India.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-300">
              <Database className="h-3.5 w-3.5" />
              Powered by MySQL 8 &amp; Flask REST API
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Explore &amp; Book
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/search?category=Room" className="hover:text-amber-300 transition-colors">
                  Luxury Rooms &amp; Suites
                </Link>
              </li>
              <li>
                <Link to="/search?category=Add-On" className="hover:text-amber-300 transition-colors">
                  Spa, Dining &amp; Add-On Experiences
                </Link>
              </li>
              <li>
                <Link to="/lookup" className="hover:text-amber-300 transition-colors">
                  Find or Cancel a Reservation
                </Link>
              </li>
              <li>
                <Link to="/reviews" className="hover:text-amber-300 transition-colors">
                  Verified Guest Reviews
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Portals &amp; System
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/dashboard" className="hover:text-amber-300 transition-colors">
                  Guest Dashboard (Bookings, Invoices, Alerts)
                </Link>
              </li>
              <li>
                <Link to="/auth" className="hover:text-amber-300 transition-colors">
                  Guest Sign-In &amp; Registration
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-amber-300 transition-colors">
                  Admin &amp; Reception Desk Portal
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-300 transition-colors">
                  About Us &amp; ER Schema Architecture
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Central Reservations
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-amber-400 shrink-0" />
                <span>+91 (022) 6600-8800 (24/7 Concierge)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-400 shrink-0" />
                <span>reservations@grandaurelia.example.com</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>Udaipur • South Goa • Mumbai • Manali</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Grand Aurelia Hotels &amp; Resorts. RDBMS Lab &amp; Theory Project.</p>
          <p>
            Entities: <code className="text-slate-300">User</code>,{' '}
            <code className="text-slate-300">Location</code>,{' '}
            <code className="text-slate-300">Services</code>,{' '}
            <code className="text-slate-300">Bookings</code>,{' '}
            <code className="text-slate-300">Payment</code>,{' '}
            <code className="text-slate-300">Cancellation</code>,{' '}
            <code className="text-slate-300">Invoices</code>,{' '}
            <code className="text-slate-300">Reviews</code>,{' '}
            <code className="text-slate-300">Notification</code>
          </p>
        </div>
      </div>
    </footer>
  );
}
