import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, UserPlus, LogOut, ShieldCheck } from 'lucide-react';
import {
  fetchUsers,
  registerOrLookupUser,
  extractApiError,
} from '../api/client';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function AuthPage() {
  const navigate = useNavigate();
  const { activeGuest, setActiveGuest, addToast } = useApp();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign-In by Email
  const [loginEmail, setLoginEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Register New Guest
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [registering, setRegistering] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers();
      setUsers(res.data || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      const res = await fetchUsers({ email: loginEmail.trim() });
      const matched = res.data || [];
      if (matched.length === 0) {
        addToast(`No guest found with email "${loginEmail}". Please register on the right.`, 'error');
      } else {
        setActiveGuest(matched[0]);
        addToast(`Signed in as ${matched[0].name} (U-ID #${matched[0].u_id})!`, 'success');
        navigate('/dashboard');
      }
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const res = await registerOrLookupUser({
        name: regName,
        phone: regPhone,
        email: regEmail,
        lookup_or_create: false,
      });
      setActiveGuest(res.data);
      addToast(`Registered ${res.data.name} (U-ID #${res.data.u_id}) in MySQL User table!`, 'success');
      navigate('/dashboard');
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleQuickSelect = (u) => {
    setActiveGuest(u);
    addToast(`Switched active guest session to ${u.name} (U-ID #${u.u_id})`, 'success');
    navigate('/dashboard');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <Badge tone="amber">User Entity (`U-ID`, `Name`, `Phone`, `Email`)</Badge>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Guest Sign-In &amp; Registration
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          In strict fidelity to <code>Diagram1.dia</code>, the <code>User</code> table stores{' '}
          <code>(U-ID, Name, Phone, Email)</code>. Sign in using your registered email or register a
          new guest profile to manage reservations, invoices, notifications, and reviews.
        </p>
      </div>

      {activeGuest && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs space-y-1">
            <span className="text-emerald-400 font-semibold uppercase tracking-wider block">
              Currently Active Guest Session
            </span>
            <p className="text-base font-bold text-slate-100">
              {activeGuest.name} (U-ID #{activeGuest.u_id})
            </p>
            <p className="text-slate-300">
              {activeGuest.email} • {activeGuest.phone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => navigate('/dashboard')}>
              Open Guest Dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setActiveGuest(null);
                addToast('Signed out of guest session.', 'info');
              }}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {error && <ApiErrorBanner message={error} onRetry={loadUsers} />}

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left: Sign In by Email or Quick Select */}
        <Card
          title="Returning Guest Sign-In"
          subtitle="Look up your profile in the MySQL User table"
        >
          <form onSubmit={handleEmailSignIn} className="space-y-4 text-xs">
            <div>
              <label htmlFor="signin-email" className="block font-medium text-slate-300 mb-1">
                Registered Email Address (`User.Email`)
              </label>
              <input
                id="signin-email"
                type="email"
                required
                placeholder="aarav.mehta@example.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full" disabled={signingIn}>
              <UserCheck className="h-4 w-4" />
              {signingIn ? 'Verifying in MySQL...' : 'Sign In with Email'}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-800 pt-5 space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
              Or Quick-Select a Registered Guest from Database:
            </span>
            {loading ? (
              <LoadingSpinner label="Loading guests..." />
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {users.map((u) => (
                  <button
                    key={u.u_id}
                    type="button"
                    onClick={() => handleQuickSelect(u)}
                    className={`w-full rounded-xl border p-3 text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                      activeGuest?.u_id === u.u_id
                        ? 'border-amber-500 bg-amber-500/15 text-amber-200'
                        : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-100">
                        #{u.u_id} — {u.name}
                      </p>
                      <p className="text-slate-400">
                        {u.email} • {u.phone}
                      </p>
                    </div>
                    <Badge tone="slate">{u.total_bookings || 0} Bookings</Badge>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right: Register New Guest */}
        <Card
          title="Register New Guest Profile"
          subtitle="Persists a new row in MySQL User (Name, Phone, Email)"
        >
          <form onSubmit={handleRegister} className="space-y-4 text-xs">
            <div>
              <label htmlFor="reg-name" className="block font-medium text-slate-300 mb-1">
                Full Name (`Name`)
              </label>
              <input
                id="reg-name"
                type="text"
                required
                minLength={2}
                placeholder="e.g. Siddharth Malhotra"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="reg-phone" className="block font-medium text-slate-300 mb-1">
                Phone Number (`Phone` — Unique)
              </label>
              <input
                id="reg-phone"
                type="tel"
                required
                placeholder="+91-90000-10088"
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <div>
              <label htmlFor="reg-email" className="block font-medium text-slate-300 mb-1">
                Email Address (`Email` — Unique)
              </label>
              <input
                id="reg-email"
                type="email"
                required
                placeholder="siddharth@example.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5" disabled={registering}>
              <UserPlus className="h-4 w-4" />
              {registering ? 'Creating Guest Record...' : 'Register New Guest'}
            </Button>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-slate-400">
              <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Looking for Staff / Reception Controls?
              </p>
              <p>
                Administrative operations (adding locations, updating room inventory, changing
                check-in/check-out statuses, and viewing financial reports) are protected in the{' '}
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="text-amber-400 underline cursor-pointer"
                >
                  Admin &amp; Reception Dashboard
                </button>
                .
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
