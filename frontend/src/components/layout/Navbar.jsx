import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  Building2,
  Search,
  CalendarCheck,
  Star,
  UserCheck,
  ShieldCheck,
  Menu,
  X,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Navbar() {
  const { activeGuest, isAdminUnlocked } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { to: '/', label: 'Home' },
    { to: '/search', label: 'Rooms & Services', icon: Search },
    { to: '/lookup', label: 'Find Booking', icon: CalendarCheck },
    { to: '/reviews', label: 'Guest Reviews', icon: Star },
    { to: '/about', label: 'Destinations & Info', icon: Info },
  ];

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-inner">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-100 font-serif-display">
              Grand Aurelia
            </span>
            <span className="block text-[10px] uppercase tracking-[0.2em] text-amber-400/90">
              Hotels &amp; Resorts
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Actions: Guest Dashboard, Sign-In, Admin Portal */}
        <div className="hidden lg:flex items-center gap-2.5">
          <NavLink to="/dashboard" className={linkClass}>
            <UserCheck className="h-4 w-4 text-amber-400" />
            <span>{activeGuest ? activeGuest.name.split(' ')[0] : 'Guest Portal'}</span>
          </NavLink>

          <NavLink
            to="/auth"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-amber-500/50 hover:text-amber-300 transition-colors"
          >
            {activeGuest ? 'Switch Guest' : 'Sign In / Register'}
          </NavLink>

          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors border ${
                isActive || isAdminUnlocked
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{isAdminUnlocked ? 'Admin (Unlocked)' : 'Reception / Admin'}</span>
          </NavLink>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle Navigation Menu"
          className="lg:hidden rounded-lg p-2 text-slate-300 hover:bg-slate-800"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {item.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            <NavLink
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-amber-300"
            >
              Guest Dashboard ({activeGuest ? activeGuest.name : 'Select Guest'})
            </NavLink>
            <NavLink
              to="/auth"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-slate-200"
            >
              Sign In / Register Guest
            </NavLink>
            <NavLink
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-emerald-300"
            >
              Admin &amp; Reception Dashboard
            </NavLink>
          </div>
        </div>
      )}
    </header>
  );
}
