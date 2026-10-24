import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CreditCard,
  FileText,
  Bell,
  Star,
  UserCog,
  XCircle,
  PlusCircle,
} from 'lucide-react';
import {
  fetchUsers,
  fetchBookings,
  fetchPayments,
  fetchInvoices,
  fetchNotifications,
  fetchReviews,
  fetchServices,
  cancelBooking,
  createPayment,
  createReview,
  updateUser,
  extractApiError,
} from '../api/client';
import { formatINR, statusBadgeTone } from '../utils/media';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import InvoiceModal from '../components/ui/InvoiceModal';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function GuestDashboardPage() {
  const { activeGuest, setActiveGuest, addToast } = useApp();

  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(activeGuest?.u_id || '');
  const [activeTab, setActiveTab] = useState('bookings');

  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  // Profile form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // New review form state
  const [revServiceId, setRevServiceId] = useState('');
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const usersRes = await fetchUsers();
      const usersList = usersRes.data || [];
      setAllUsers(usersList);

      let targetUId = selectedUserId || activeGuest?.u_id || usersList[0]?.u_id;
      if (!targetUId) {
        setLoading(false);
        return;
      }
      setSelectedUserId(targetUId);

      const currentUserObj = usersList.find((u) => Number(u.u_id) === Number(targetUId));
      if (currentUserObj) {
        setActiveGuest(currentUserObj);
        setEditName(currentUserObj.name);
        setEditPhone(currentUserObj.phone);
        setEditEmail(currentUserObj.email);
      }

      const [bRes, pRes, iRes, nRes, rRes, sRes] = await Promise.all([
        fetchBookings({ u_id: targetUId }),
        fetchPayments({ u_id: targetUId }),
        fetchInvoices({ u_id: targetUId }),
        fetchNotifications({ u_id: targetUId }),
        fetchReviews({ u_id: targetUId }),
        fetchServices(),
      ]);

      setBookings(bRes.data || []);
      setPayments(pRes.data || []);
      setInvoices(iRes.data || []);
      setNotifications(nRes.data || []);
      setReviews(rRes.data || []);
      const srvList = sRes.data || [];
      setServices(srvList);
      if (!revServiceId && srvList.length > 0) {
        setRevServiceId(srvList[0].s_id);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, activeGuest, setActiveGuest, revServiceId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleGuestSwitch = (newUId) => {
    setSelectedUserId(Number(newUId));
  };

  const handleCancelBooking = async (bId) => {
    if (!window.confirm(`Cancel Reservation #${bId} and record refund?`)) return;
    try {
      await cancelBooking(bId);
      addToast(`Booking #${bId} cancelled and refund recorded!`, 'success');
      loadDashboardData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handlePayPending = async (bId, method = 'Credit Card') => {
    try {
      await createPayment({ b_id: bId, method });
      addToast(`Simulated payment recorded for Booking #${bId}!`, 'success');
      loadDashboardData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await updateUser(selectedUserId, {
        name: editName,
        phone: editPhone,
        email: editEmail,
      });
      setActiveGuest(res.data);
      addToast('Guest contact profile updated in MySQL User table!', 'success');
      loadDashboardData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePostReview = async (e) => {
    e.preventDefault();
    setSavingReview(true);
    try {
      await createReview({
        u_id: Number(selectedUserId),
        s_id: Number(revServiceId),
        rating: Number(revRating),
        comment: revComment,
      });
      addToast('Review saved to MySQL Reviews table!', 'success');
      setRevComment('');
      loadDashboardData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setSavingReview(false);
    }
  };

  const tabs = [
    { id: 'bookings', label: `Reservations (${bookings.length})`, icon: CalendarCheck },
    { id: 'billing', label: `Payments & Invoices (${invoices.length})`, icon: CreditCard },
    { id: 'notifications', label: `Notifications (${notifications.length})`, icon: Bell },
    { id: 'reviews', label: `My Reviews (${reviews.length})`, icon: Star },
    { id: 'profile', label: 'Guest Profile', icon: UserCog },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Guest Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="space-y-1">
          <Badge tone="amber">Guest Portal • Connected to MySQL 8</Badge>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">
            {activeGuest ? `Welcome, ${activeGuest.name}` : 'Guest Dashboard'}
          </h1>
          {activeGuest && (
            <p className="text-xs text-slate-400">
              U-ID #{activeGuest.u_id} • {activeGuest.email} • {activeGuest.phone}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="dash-guest-select" className="block text-[11px] text-slate-400 mb-1">
              Active Guest Profile (`User` Entity):
            </label>
            <select
              id="dash-guest-select"
              value={selectedUserId}
              onChange={(e) => handleGuestSwitch(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
            >
              {allUsers.map((u) => (
                <option key={u.u_id} value={u.u_id}>
                  #{u.u_id} — {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <Link
            to="/search"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
          >
            <PlusCircle className="h-4 w-4" />
            New Booking
          </Link>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {error && <ApiErrorBanner message={error} onRetry={loadDashboardData} />}

      {loading ? (
        <LoadingSpinner label="Loading guest records from MySQL..." />
      ) : (
        <>
          {/* TAB 1: Reservations */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <Card title="No Reservations Yet">
                  <p className="text-xs text-slate-400 mb-4">
                    This guest has no reservations in the <code>Bookings</code> table yet.
                  </p>
                  <Link
                    to="/search"
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950"
                  >
                    Explore Available Rooms &amp; Services
                  </Link>
                </Card>
              ) : (
                bookings.map((b) => (
                  <Card
                    key={b.b_id}
                    title={`Booking #${b.b_id} — ${b.service_name} (${b.service_category})`}
                    subtitle={`${b.location_name} (${b.city})`}
                    badge={<Badge tone={statusBadgeTone(b.status)}>{b.status}</Badge>}
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs text-slate-300">
                      <div className="space-y-1">
                        <span className="text-slate-500 uppercase font-semibold block">
                          Dates &amp; Occupancy
                        </span>
                        <p>
                          Check-In: <strong className="text-slate-100">{b.check_in}</strong>
                        </p>
                        <p>
                          Check-Out: <strong className="text-slate-100">{b.check_out}</strong> ({b.nights}{' '}
                          night{b.nights > 1 ? 's' : ''})
                        </p>
                        <p>Guests: {b.guests}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-slate-500 uppercase font-semibold block">
                          Payment &amp; Invoice
                        </span>
                        <p>Total Rate: {formatINR(b.calculated_total_amt)}</p>
                        <p>
                          Paid:{' '}
                          <strong className="text-amber-300">
                            {b.paid_amt
                              ? `${formatINR(b.paid_amt)} (${b.payment_method})`
                              : 'Unpaid (Pending)'}
                          </strong>
                        </p>
                        {b.c_id && (
                          <p className="text-rose-300 font-semibold">
                            Cancelled (C-ID #{b.c_id}) • Refund: {formatINR(b.refund_amt)}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                        <Link
                          to={`/booking-confirmation/${b.b_id}`}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          Details
                        </Link>
                        {b.i_id && (
                          <Button variant="secondary" onClick={() => setInvoiceTarget(b)}>
                            <FileText className="h-3.5 w-3.5" />
                            Invoice #{b.i_id}
                          </Button>
                        )}
                        {b.status === 'Pending' && !b.p_id && (
                          <Button variant="primary" onClick={() => handlePayPending(b.b_id, 'UPI')}>
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay (UPI)
                          </Button>
                        )}
                        {(b.status === 'Pending' || b.status === 'Confirmed') && (
                          <Button variant="danger" onClick={() => handleCancelBooking(b.b_id)}>
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB 2: Payments & Invoices */}
          {activeTab === 'billing' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card
                title={`Payment History (${payments.length})`}
                subtitle="MySQL Payment (P-ID, B-ID, Amt, Date, Method)"
              >
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-400">No payments recorded for this guest.</p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div
                        key={p.p_id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-100">
                            Payment #{p.p_id} • Booking #{p.b_id} ({p.service_name})
                          </p>
                          <p className="text-slate-400">
                            Method: {p.method} • Date: {p.date}
                          </p>
                        </div>
                        <span className="font-bold text-emerald-400 text-sm">
                          {formatINR(p.amt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title={`Issued Invoices (${invoices.length})`}
                subtitle="MySQL Invoices (I-ID, U-ID, B-ID, Amt, Date)"
              >
                {invoices.length === 0 ? (
                  <p className="text-xs text-slate-400">No invoices issued for this guest.</p>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((inv) => (
                      <div
                        key={inv.i_id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-100">
                            Invoice #{inv.i_id} • Booking #{inv.b_id}
                          </p>
                          <p className="text-slate-400">
                            {inv.service_name} ({inv.city}) • Issued: {inv.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300">{formatINR(inv.amt)}</span>
                          <Button variant="secondary" onClick={() => setInvoiceTarget(inv)}>
                            <FileText className="h-3.5 w-3.5" />
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === 'notifications' && (
            <Card
              title={`System Notifications (${notifications.length})`}
              subtitle="MySQL Notification (N-ID, U-ID, Message)"
            >
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400">No notifications for this guest.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n) => (
                    <div
                      key={n.n_id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 flex items-start gap-3 text-xs"
                    >
                      <Bell className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-500 font-semibold block">
                          Notification N-ID #{n.n_id}
                        </span>
                        <p className="text-slate-200 mt-0.5">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* TAB 4: Reviews */}
          {activeTab === 'reviews' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card
                title="Submit a New Review"
                subtitle="Saves to MySQL Reviews (R-ID, U-ID, S-ID, Rating, Comment)"
              >
                <form onSubmit={handlePostReview} className="space-y-4 text-xs">
                  <div>
                    <label htmlFor="dash-rev-service" className="block font-medium text-slate-300 mb-1">
                      Select Room or Service (`S-ID`)
                    </label>
                    <select
                      id="dash-rev-service"
                      required
                      value={revServiceId}
                      onChange={(e) => setRevServiceId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    >
                      {services.map((s) => (
                        <option key={s.s_id} value={s.s_id}>
                          {s.city} — {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dash-rev-rating" className="block font-medium text-slate-300 mb-1">
                      Rating (`1–5`)
                    </label>
                    <select
                      id="dash-rev-rating"
                      value={revRating}
                      onChange={(e) => setRevRating(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} Star{r > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="dash-rev-comment" className="block font-medium text-slate-300 mb-1">
                      Review Comment
                    </label>
                    <textarea
                      id="dash-rev-comment"
                      rows={3}
                      required
                      minLength={3}
                      value={revComment}
                      onChange={(e) => setRevComment(e.target.value)}
                      placeholder="Write your feedback..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100"
                    />
                  </div>

                  <Button type="submit" variant="primary" disabled={savingReview}>
                    {savingReview ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </form>
              </Card>

              <Card title={`Submitted Reviews (${reviews.length})`}>
                {reviews.length === 0 ? (
                  <p className="text-xs text-slate-400">You have not posted any reviews yet.</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((r) => (
                      <div
                        key={r.r_id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-100">
                            {r.service_name} ({r.city})
                          </span>
                          <span className="text-amber-400 font-bold">★ {r.rating} / 5</span>
                        </div>
                        <p className="text-slate-300">“{r.comment}”</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 5: Guest Profile */}
          {activeTab === 'profile' && (
            <Card
              title={`Edit Guest Profile (U-ID #${selectedUserId})`}
              subtitle="Updates Name, Phone, and Email in the MySQL User table"
            >
              <form onSubmit={handleUpdateProfile} className="max-w-lg space-y-4 text-xs">
                <div>
                  <label htmlFor="prof-name" className="block font-medium text-slate-300 mb-1">
                    Full Name (`Name`)
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    required
                    minLength={2}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="prof-phone" className="block font-medium text-slate-300 mb-1">
                    Phone Number (`Phone`)
                  </label>
                  <input
                    id="prof-phone"
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <div>
                  <label htmlFor="prof-email" className="block font-medium text-slate-300 mb-1">
                    Email Address (`Email`)
                  </label>
                  <input
                    id="prof-email"
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                  />
                </div>

                <Button type="submit" variant="primary" disabled={savingProfile}>
                  {savingProfile ? 'Saving Changes...' : 'Save Guest Profile'}
                </Button>
              </form>
            </Card>
          )}
        </>
      )}

      <InvoiceModal
        invoice={invoiceTarget}
        isOpen={Boolean(invoiceTarget)}
        onClose={() => setInvoiceTarget(null)}
      />
    </div>
  );
}
