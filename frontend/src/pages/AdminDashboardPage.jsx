import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  Lock,
  LogOut,
  BarChart3,
  CalendarCheck,
  Building2,
  Users,
  CreditCard,
  Bell,
  Trash2,
  Plus,
  FileText,
} from 'lucide-react';
import {
  fetchSummaryReport,
  fetchRevenueReport,
  fetchOccupancyReport,
  fetchLocations,
  createLocation,
  updateLocation,
  fetchServices,
  createService,
  updateService,
  fetchBookings,
  createBooking,
  updateBookingStatus,
  cancelBooking,
  fetchUsers,
  registerOrLookupUser,
  fetchPayments,
  fetchInvoices,
  fetchCancellations,
  fetchReviews,
  deleteReview,
  fetchNotifications,
  createNotification,
  extractApiError,
} from '../api/client';
import { formatINR, getDefaultDates, statusBadgeTone } from '../utils/media';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import InvoiceModal from '../components/ui/InvoiceModal';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function AdminDashboardPage() {
  const { adminPasscode, setAdminPasscode, isAdminUnlocked, addToast } = useApp();
  const defaults = getDefaultDates(1, 30);

  const [passcodeInput, setPasscodeInput] = useState('admin123');
  const [activeTab, setActiveTab] = useState('reports');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  // Loaded Datasets
  const [summary, setSummary] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [occupancyReport, setOccupancyReport] = useState([]);
  const [occCheckIn, setOccCheckIn] = useState(defaults.checkIn);
  const [occCheckOut, setOccCheckOut] = useState(defaults.checkOut);

  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Admin Form States: Location
  const [locEditId, setLocEditId] = useState('');
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locCountry, setLocCountry] = useState('India');

  // Admin Form States: Service (Room / Add-On)
  const [srvEditId, setSrvEditId] = useState('');
  const [srvName, setSrvName] = useState('');
  const [srvPrice, setSrvPrice] = useState('');
  const [srvDesc, setSrvDesc] = useState('');
  const [srvLocId, setSrvLocId] = useState('1');
  const [srvCategory, setSrvCategory] = useState('Room');
  const [srvMaxGuests, setSrvMaxGuests] = useState(2);
  const [srvTotalUnits, setSrvTotalUnits] = useState(2);

  // Admin Form States: Walk-In Reservation
  const [walkUserId, setWalkUserId] = useState('1');
  const [walkServiceId, setWalkServiceId] = useState('1');
  const [walkIn, setWalkIn] = useState(defaults.checkIn);
  const [walkOut, setWalkOut] = useState(
    new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0]
  );
  const [walkGuests, setWalkGuests] = useState(2);
  const [walkPayMethod, setWalkPayMethod] = useState('Cash');

  // Admin Form States: New Guest
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');

  // Admin Form States: Notification Dispatch
  const [notifUserId, setNotifUserId] = useState('1');
  const [notifMessage, setNotifMessage] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!isAdminUnlocked) return;
    setLoading(true);
    setError(null);
    try {
      const [
        sumRes,
        revRes,
        occRes,
        locRes,
        srvRes,
        bookRes,
        usrRes,
        payRes,
        invRes,
        cancRes,
        revListRes,
        notifRes,
      ] = await Promise.all([
        fetchSummaryReport(),
        fetchRevenueReport(),
        fetchOccupancyReport({ check_in: occCheckIn, check_out: occCheckOut }),
        fetchLocations(),
        fetchServices(),
        fetchBookings(),
        fetchUsers(),
        fetchPayments(),
        fetchInvoices(),
        fetchCancellations(),
        fetchReviews(),
        fetchNotifications(),
      ]);

      setSummary(sumRes.data);
      setRevenueReport(revRes.data);
      setOccupancyReport(occRes.data || []);
      setLocations(locRes.data || []);
      setServices(srvRes.data || []);
      setBookings(bookRes.data || []);
      setUsers(usrRes.data || []);
      setPayments(payRes.data || []);
      setInvoices(invRes.data || []);
      setCancellations(cancRes.data || []);
      setReviews(revListRes.data || []);
      setNotifications(notifRes.data || []);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [isAdminUnlocked, occCheckIn, occCheckOut]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleUnlock = (e) => {
    e.preventDefault();
    if (!passcodeInput.trim()) {
      addToast('Please enter the Admin Passcode.', 'error');
      return;
    }
    setAdminPasscode(passcodeInput.trim());
    addToast('Admin & Reception controls unlocked for this session.', 'success');
  };

  // Unauthorized View: Never expose admin actions to unauthorized users
  if (!isAdminUnlocked) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Card
          title="Reception & Admin Authorization"
          subtitle="Protected by X-Admin-Passcode header verification on the Flask backend"
          badge={<Badge tone="amber">Restricted</Badge>}
        >
          <form onSubmit={handleUnlock} className="space-y-4 text-xs">
            <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3.5 text-slate-300">
              <Lock className="h-5 w-5 text-amber-400 shrink-0" />
              <p>
                Administrative controls (inventory management, reservation status overrides, and
                financial reports) require the configured <code>ADMIN_PASSCODE</code>.
              </p>
            </div>

            <div>
              <label htmlFor="admin-passcode-input" className="block font-medium text-slate-300 mb-1">
                Admin Passcode (Default in <code>.env.example</code>: <code>admin123</code>)
              </label>
              <input
                id="admin-passcode-input"
                type="password"
                required
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
              />
            </div>

            <Button type="submit" variant="primary" className="w-full py-2.5">
              <ShieldCheck className="h-4 w-4" />
              Unlock Reception &amp; Admin Portal
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Admin Handlers
  const handleStatusChange = async (bId, newStatus) => {
    try {
      await updateBookingStatus(bId, newStatus, adminPasscode);
      addToast(`Booking #${bId} status updated to '${newStatus}'.`, 'success');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleAdminCancel = async (bId) => {
    if (!window.confirm(`Cancel Booking #${bId} and record refund?`)) return;
    try {
      await cancelBooking(bId);
      addToast(`Booking #${bId} cancelled and refund recorded.`, 'success');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    try {
      const res = await createBooking({
        u_id: Number(walkUserId),
        s_id: Number(walkServiceId),
        check_in: walkIn,
        check_out: walkOut,
        guests: Number(walkGuests),
        payment_method: walkPayMethod || undefined,
      });
      addToast(`Walk-in Reservation #${res.data.b_id} created!`, 'success');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    try {
      if (locEditId) {
        await updateLocation(
          locEditId,
          { name: locName, address: locAddress, city: locCity, country: locCountry },
          adminPasscode
        );
        addToast(`Location #${locEditId} updated in MySQL!`, 'success');
      } else {
        await createLocation(
          { name: locName, address: locAddress, city: locCity, country: locCountry },
          adminPasscode
        );
        addToast('New hotel location added to MySQL Location table!', 'success');
      }
      setLocEditId('');
      setLocName('');
      setLocAddress('');
      setLocCity('');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: srvName,
        price: Number(srvPrice),
        description: srvDesc,
        l_id: Number(srvLocId),
        category: srvCategory,
        max_guests: Number(srvMaxGuests),
        total_units: Number(srvTotalUnits),
      };
      if (srvEditId) {
        await updateService(srvEditId, payload, adminPasscode);
        addToast(`Service #${srvEditId} updated in MySQL!`, 'success');
      } else {
        await createService(payload, adminPasscode);
        addToast('New room/service added to MySQL Services table!', 'success');
      }
      setSrvEditId('');
      setSrvName('');
      setSrvPrice('');
      setSrvDesc('');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleCreateGuest = async (e) => {
    e.preventDefault();
    try {
      await registerOrLookupUser({
        name: newGuestName,
        phone: newGuestPhone,
        email: newGuestEmail,
        lookup_or_create: false,
      });
      addToast('New guest registered in MySQL User table!', 'success');
      setNewGuestName('');
      setNewGuestPhone('');
      setNewGuestEmail('');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleDeleteReview = async (rId) => {
    if (!window.confirm(`Delete Review #${rId}?`)) return;
    try {
      await deleteReview(rId, adminPasscode);
      addToast(`Review #${rId} deleted from MySQL.`, 'success');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await createNotification(
        { u_id: Number(notifUserId), message: notifMessage },
        adminPasscode
      );
      addToast('Notification dispatched and saved to MySQL Notification table!', 'success');
      setNotifMessage('');
      loadAdminData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  const tabs = [
    { id: 'reports', label: 'Analytics & Occupancy Reports', icon: BarChart3 },
    { id: 'bookings', label: `Reservations Desk (${bookings.length})`, icon: CalendarCheck },
    { id: 'inventory', label: `Locations & Inventory (${services.length})`, icon: Building2 },
    { id: 'guests', label: `Guest Directory (${users.length})`, icon: Users },
    { id: 'finance', label: `Payments & Cancellations (${payments.length})`, icon: CreditCard },
    { id: 'moderation', label: 'Reviews & Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-slate-900/80 p-6">
        <div>
          <Badge tone="emerald">
            <ShieldCheck className="h-3.5 w-3.5" />
            Authorized Admin &amp; Reception Session
          </Badge>
          <h1 className="mt-1.5 text-2xl font-bold text-slate-100 sm:text-3xl">
            Hotel Management &amp; RDBMS Operations Console
          </h1>
          <p className="text-xs text-slate-400">
            Full CRUD &amp; analytical reporting across all 9 entities from <code>Diagram1.dia</code>.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setAdminPasscode('');
            addToast('Admin session locked.', 'info');
          }}
        >
          <LogOut className="h-4 w-4" />
          Lock Admin Console
        </Button>
      </div>

      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Net Revenue
            </span>
            <span className="mt-1 text-lg font-bold text-emerald-400 block">
              {formatINR(summary.net_revenue)}
            </span>
            <span className="text-[11px] text-slate-500">
              Gross: {formatINR(summary.gross_revenue)}
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Total Refunds
            </span>
            <span className="mt-1 text-lg font-bold text-rose-400 block">
              {formatINR(summary.total_refunds)}
            </span>
            <span className="text-[11px] text-slate-500">
              {summary.cancelled_bookings} Cancelled Bookings
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Active Bookings
            </span>
            <span className="mt-1 text-lg font-bold text-amber-400 block">
              {Number(summary.confirmed_bookings || 0) + Number(summary.pending_bookings || 0)}
            </span>
            <span className="text-[11px] text-slate-500">
              {summary.confirmed_bookings} Confirmed • {summary.pending_bookings} Pending
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Completed Stays
            </span>
            <span className="mt-1 text-lg font-bold text-sky-400 block">
              {summary.completed_bookings}
            </span>
            <span className="text-[11px] text-slate-500">
              Out of {summary.total_bookings} Total
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Properties &amp; Units
            </span>
            <span className="mt-1 text-lg font-bold text-slate-100 block">
              {summary.total_locations} Hotels • {summary.total_room_units} Units
            </span>
            <span className="text-[11px] text-slate-500">
              {summary.total_room_types} Room Types • {summary.total_addon_services} Add-Ons
            </span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block">
              Guest Rating
            </span>
            <span className="mt-1 text-lg font-bold text-amber-300 block">
              ★ {summary.overall_avg_rating || '5.0'} / 5.0
            </span>
            <span className="text-[11px] text-slate-500">
              {summary.total_reviews} Reviews • {summary.total_users} Guests
            </span>
          </div>
        </div>
      )}

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

      {error && <ApiErrorBanner message={error} onRetry={loadAdminData} />}

      {loading ? (
        <LoadingSpinner label="Querying MySQL 8 administrative tables & analytical reports..." />
      ) : (
        <>
          {/* TAB 1: Analytics, Revenue & Occupancy Reports */}
          {activeTab === 'reports' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card
                  title="Revenue by Hotel Location"
                  subtitle="Grouped by Location (L-ID) joining Services, Bookings, Payment, Cancellation"
                  className="lg:col-span-2"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-slate-400 uppercase">
                        <tr>
                          <th className="py-2 pr-3">Property (`Location`)</th>
                          <th className="py-2 px-3">Bookings</th>
                          <th className="py-2 px-3">Gross Paid</th>
                          <th className="py-2 px-3">Refunds</th>
                          <th className="py-2 pl-3 text-right">Net Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {(revenueReport?.by_location || []).map((loc) => (
                          <tr key={loc.l_id}>
                            <td className="py-2.5 pr-3 font-medium text-slate-100">
                              {loc.location_name} ({loc.city})
                            </td>
                            <td className="py-2.5 px-3">{loc.total_bookings}</td>
                            <td className="py-2.5 px-3 text-slate-300">
                              {formatINR(loc.gross_revenue)}
                            </td>
                            <td className="py-2.5 px-3 text-rose-300">
                              {formatINR(loc.total_refunds)}
                            </td>
                            <td className="py-2.5 pl-3 text-right font-bold text-emerald-400">
                              {formatINR(loc.net_revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card
                  title="Payment Method Breakdown"
                  subtitle="Grouped by Payment.Method"
                >
                  <div className="space-y-3 text-xs">
                    {(revenueReport?.by_payment_method || []).map((pm) => (
                      <div
                        key={pm.method}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-100">{pm.method}</p>
                          <p className="text-slate-400">{pm.transaction_count} transaction(s)</p>
                        </div>
                        <span className="font-bold text-amber-300">
                          {formatINR(pm.total_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Occupancy & Availability Report */}
              <Card
                title="Room & Service Occupancy Report"
                subtitle="Evaluates active overlapping bookings vs. Total_Units for any date window"
              >
                <div className="mb-4 flex flex-wrap items-end gap-3 border-b border-slate-800 pb-4 text-xs">
                  <div>
                    <label htmlFor="occ-in" className="block text-slate-400 mb-1">
                      Window Start (`check_in`)
                    </label>
                    <input
                      id="occ-in"
                      type="date"
                      value={occCheckIn}
                      onChange={(e) => setOccCheckIn(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="occ-out" className="block text-slate-400 mb-1">
                      Window End (`check_out`)
                    </label>
                    <input
                      id="occ-out"
                      type="date"
                      value={occCheckOut}
                      onChange={(e) => setOccCheckOut(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-100"
                    />
                  </div>
                  <Button variant="secondary" onClick={loadAdminData}>
                    Refresh Occupancy Window
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 pr-3">S-ID &amp; Offering</th>
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Total Units</th>
                        <th className="py-2 px-3">Active Booked</th>
                        <th className="py-2 px-3">Cancelled (Ignored)</th>
                        <th className="py-2 px-3">Available</th>
                        <th className="py-2 pl-3 text-right">Occupancy %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {occupancyReport.map((row) => (
                        <tr key={row.s_id}>
                          <td className="py-2.5 pr-3 font-semibold text-slate-100">
                            #{row.s_id} — {row.service_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{row.city}</td>
                          <td className="py-2.5 px-3">
                            <Badge tone={row.category === 'Room' ? 'amber' : 'sky'}>
                              {row.category}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3">{row.total_units}</td>
                          <td className="py-2.5 px-3 font-semibold text-amber-300">
                            {row.active_overlapping_bookings}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {row.cancelled_bookings_in_window}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-emerald-400">
                            {row.available_units}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-bold text-slate-100">
                            {row.occupancy_rate_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: Reservations & Reception Desk */}
          {activeTab === 'bookings' && (
            <div className="space-y-8">
              <Card
                title="Create Walk-In / Reception Reservation"
                subtitle="Runs full date-overlap & capacity validation in MySQL"
              >
                <form
                  onSubmit={handleCreateWalkIn}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6 items-end text-xs"
                >
                  <div>
                    <label htmlFor="walk-user" className="block text-slate-300 mb-1">
                      Guest (`U-ID`)
                    </label>
                    <select
                      id="walk-user"
                      value={walkUserId}
                      onChange={(e) => setWalkUserId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    >
                      {users.map((u) => (
                        <option key={u.u_id} value={u.u_id}>
                          #{u.u_id} — {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="walk-srv" className="block text-slate-300 mb-1">
                      Room / Service (`S-ID`)
                    </label>
                    <select
                      id="walk-srv"
                      value={walkServiceId}
                      onChange={(e) => setWalkServiceId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    >
                      {services.map((s) => (
                        <option key={s.s_id} value={s.s_id}>
                          #{s.s_id} — {s.name} ({s.city})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="walk-in" className="block text-slate-300 mb-1">
                      Check-In
                    </label>
                    <input
                      id="walk-in"
                      type="date"
                      required
                      value={walkIn}
                      onChange={(e) => setWalkIn(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="walk-out" className="block text-slate-300 mb-1">
                      Check-Out
                    </label>
                    <input
                      id="walk-out"
                      type="date"
                      required
                      value={walkOut}
                      onChange={(e) => setWalkOut(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="walk-guests" className="block text-slate-300 mb-1">
                        Guests
                      </label>
                      <input
                        id="walk-guests"
                        type="number"
                        min={1}
                        max={6}
                        value={walkGuests}
                        onChange={(e) => setWalkGuests(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                      />
                    </div>
                    <div>
                      <label htmlFor="walk-pay" className="block text-slate-300 mb-1">
                        Payment
                      </label>
                      <select
                        id="walk-pay"
                        value={walkPayMethod}
                        onChange={(e) => setWalkPayMethod(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-slate-100"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Credit Card">Card</option>
                        <option value="UPI">UPI</option>
                        <option value="">Unpaid</option>
                      </select>
                    </div>
                  </div>

                  <Button type="submit" variant="primary">
                    <Plus className="h-4 w-4" />
                    Book Walk-In
                  </Button>
                </form>
              </Card>

              <Card
                title={`All Reservations (${bookings.length})`}
                subtitle="Manage Check-In, Check-Out (Completed), Confirmation, and Cancellations"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 pr-3">B-ID</th>
                        <th className="py-2 px-3">Guest (`User`)</th>
                        <th className="py-2 px-3">Offering (`Services`)</th>
                        <th className="py-2 px-3">Check-In → Check-Out</th>
                        <th className="py-2 px-3">Amount / Paid</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 pl-3 text-right">Reception Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {bookings.map((b) => (
                        <tr key={b.b_id}>
                          <td className="py-3 pr-3 font-bold text-slate-100">#{b.b_id}</td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-100">{b.user_name}</p>
                            <p className="text-slate-400">{b.user_email}</p>
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-medium text-slate-100">{b.service_name}</p>
                            <p className="text-slate-400">
                              {b.city} • {b.guests} Guest(s)
                            </p>
                          </td>
                          <td className="py-3 px-3 text-slate-300">
                            {b.check_in} → {b.check_out} ({b.nights}n)
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-amber-300">
                              {formatINR(b.paid_amt || b.calculated_total_amt)}
                            </p>
                            <p className="text-slate-400">
                              {b.payment_method || 'Unpaid'}
                              {b.refund_amt ? ` • Refunded: ${formatINR(b.refund_amt)}` : ''}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <Badge tone={statusBadgeTone(b.status)}>{b.status}</Badge>
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <select
                                aria-label={`Change status for booking ${b.b_id}`}
                                value={b.status}
                                onChange={(e) => handleStatusChange(b.b_id, e.target.value)}
                                className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                              >
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Completed">Completed (Checked-Out)</option>
                                <option value="Cancelled">Cancelled</option>
                              </select>
                              {b.i_id && (
                                <Button variant="secondary" onClick={() => setInvoiceTarget(b)}>
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                                <Button
                                  variant="danger"
                                  onClick={() => handleAdminCancel(b.b_id)}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 3: Locations & Room/Service Inventory */}
          {activeTab === 'inventory' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Add / Update Location */}
                <Card
                  title={locEditId ? `Edit Location #${locEditId}` : 'Add Hotel Location'}
                  subtitle="MySQL Location (L-ID, Name, Address, City, Country)"
                >
                  <form onSubmit={handleSaveLocation} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="loc-name" className="block text-slate-300 mb-1">
                          Property Name (`Name`)
                        </label>
                        <input
                          id="loc-name"
                          type="text"
                          required
                          placeholder="Grand Aurelia Heritage Jaipur"
                          value={locName}
                          onChange={(e) => setLocName(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="loc-city" className="block text-slate-300 mb-1">
                          City (`City`)
                        </label>
                        <input
                          id="loc-city"
                          type="text"
                          required
                          placeholder="Jaipur"
                          value={locCity}
                          onChange={(e) => setLocCity(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label htmlFor="loc-addr" className="block text-slate-300 mb-1">
                          Street Address (`Address`)
                        </label>
                        <input
                          id="loc-addr"
                          type="text"
                          required
                          placeholder="18 Amer Fort Road, Pink City"
                          value={locAddress}
                          onChange={(e) => setLocAddress(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="loc-country" className="block text-slate-300 mb-1">
                          Country (`Country`)
                        </label>
                        <input
                          id="loc-country"
                          type="text"
                          required
                          value={locCountry}
                          onChange={(e) => setLocCountry(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" variant="primary">
                        {locEditId ? 'Update Location' : 'Create Location'}
                      </Button>
                      {locEditId && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setLocEditId('');
                            setLocName('');
                            setLocAddress('');
                            setLocCity('');
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </form>

                  <div className="mt-5 border-t border-slate-800 pt-4 space-y-2 text-xs">
                    {locations.map((loc) => (
                      <div
                        key={loc.l_id}
                        className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-2.5"
                      >
                        <div>
                          <p className="font-semibold text-slate-100">
                            L-ID #{loc.l_id} — {loc.name} ({loc.city})
                          </p>
                          <p className="text-slate-400">{loc.address}</p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setLocEditId(loc.l_id);
                            setLocName(loc.name);
                            setLocAddress(loc.address);
                            setLocCity(loc.city);
                            setLocCountry(loc.country);
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Add / Update Room or Service */}
                <Card
                  title={srvEditId ? `Edit Service #${srvEditId}` : 'Add Room or Add-On Service'}
                  subtitle="MySQL Services (S-ID, Name, Price, Description, L-ID, Category, Max_Guests, Total_Units)"
                >
                  <form onSubmit={handleSaveService} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="srv-name" className="block text-slate-300 mb-1">
                          Room / Service Name (`Name`)
                        </label>
                        <input
                          id="srv-name"
                          type="text"
                          required
                          placeholder="Maharaja Courtyard Suite"
                          value={srvName}
                          onChange={(e) => setSrvName(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        />
                      </div>
                      <div>
                        <label htmlFor="srv-price" className="block text-slate-300 mb-1">
                          Price in INR (`Price`)
                        </label>
                        <input
                          id="srv-price"
                          type="number"
                          min={100}
                          step="0.01"
                          required
                          placeholder="16500.00"
                          value={srvPrice}
                          onChange={(e) => setSrvPrice(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="col-span-2">
                        <label htmlFor="srv-loc" className="block text-slate-300 mb-1">
                          Location (`L-ID`)
                        </label>
                        <select
                          id="srv-loc"
                          value={srvLocId}
                          onChange={(e) => setSrvLocId(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                        >
                          {locations.map((l) => (
                            <option key={l.l_id} value={l.l_id}>
                              #{l.l_id} — {l.city}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="srv-cat" className="block text-slate-300 mb-1">
                          Category
                        </label>
                        <select
                          id="srv-cat"
                          value={srvCategory}
                          onChange={(e) => setSrvCategory(e.target.value)}
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-slate-100"
                        >
                          <option value="Room">Room</option>
                          <option value="Add-On">Add-On</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="srv-units" className="block text-slate-300 mb-1">
                          Units / Guests
                        </label>
                        <div className="flex gap-1">
                          <input
                            id="srv-units"
                            type="number"
                            min={1}
                            title="Total Units"
                            value={srvTotalUnits}
                            onChange={(e) => setSrvTotalUnits(e.target.value)}
                            className="w-1/2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-slate-100"
                          />
                          <input
                            type="number"
                            min={1}
                            title="Max Guests"
                            value={srvMaxGuests}
                            onChange={(e) => setSrvMaxGuests(e.target.value)}
                            className="w-1/2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-slate-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="srv-desc" className="block text-slate-300 mb-1">
                        Description (`Description`)
                      </label>
                      <textarea
                        id="srv-desc"
                        rows={2}
                        required
                        minLength={5}
                        placeholder="Describe room features, views, or service inclusions..."
                        value={srvDesc}
                        onChange={(e) => setSrvDesc(e.target.value)}
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-100"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button type="submit" variant="primary">
                        {srvEditId ? 'Update Service Inventory' : 'Create Room / Service'}
                      </Button>
                      {srvEditId && (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSrvEditId('');
                            setSrvName('');
                            setSrvPrice('');
                            setSrvDesc('');
                          }}
                        >
                          Cancel Edit
                        </Button>
                      )}
                    </div>
                  </form>
                </Card>
              </div>

              <Card title={`Bookable Inventory Catalog (${services.length})`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 pr-3">S-ID</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Location</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Price</th>
                        <th className="py-2 px-3">Max Guests</th>
                        <th className="py-2 px-3">Total Units</th>
                        <th className="py-2 pl-3 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {services.map((s) => (
                        <tr key={s.s_id}>
                          <td className="py-2.5 pr-3 font-bold text-slate-100">#{s.s_id}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-100">{s.name}</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {s.location_name} ({s.city})
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge tone={s.category === 'Room' ? 'amber' : 'sky'}>
                              {s.category}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-amber-300">
                            {formatINR(s.price)}
                          </td>
                          <td className="py-2.5 px-3">{s.max_guests}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-400">
                            {s.total_units}
                          </td>
                          <td className="py-2.5 pl-3 text-right">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSrvEditId(s.s_id);
                                setSrvName(s.name);
                                setSrvPrice(s.price);
                                setSrvDesc(s.description);
                                setSrvLocId(s.l_id);
                                setSrvCategory(s.category);
                                setSrvMaxGuests(s.max_guests);
                                setSrvTotalUnits(s.total_units);
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 4: Guest Directory */}
          {activeTab === 'guests' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card
                title="Register Guest at Reception"
                subtitle="Inserts into MySQL User (Name, Phone, Email)"
              >
                <form onSubmit={handleCreateGuest} className="space-y-3 text-xs">
                  <div>
                    <label htmlFor="adm-g-name" className="block text-slate-300 mb-1">
                      Full Name (`Name`)
                    </label>
                    <input
                      id="adm-g-name"
                      type="text"
                      required
                      value={newGuestName}
                      onChange={(e) => setNewGuestName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-g-phone" className="block text-slate-300 mb-1">
                      Phone (`Phone`)
                    </label>
                    <input
                      id="adm-g-phone"
                      type="tel"
                      required
                      value={newGuestPhone}
                      onChange={(e) => setNewGuestPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                  <div>
                    <label htmlFor="adm-g-email" className="block text-slate-300 mb-1">
                      Email (`Email`)
                    </label>
                    <input
                      id="adm-g-email"
                      type="email"
                      required
                      value={newGuestEmail}
                      onChange={(e) => setNewGuestEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    />
                  </div>
                  <Button type="submit" variant="primary" className="w-full">
                    Register Guest
                  </Button>
                </form>
              </Card>

              <Card
                title={`Registered Guests (${users.length})`}
                subtitle="MySQL User Table"
                className="lg:col-span-2"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 pr-3">U-ID</th>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Phone</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 pl-3 text-right">Bookings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {users.map((u) => (
                        <tr key={u.u_id}>
                          <td className="py-2.5 pr-3 font-bold text-slate-100">#{u.u_id}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-100">{u.name}</td>
                          <td className="py-2.5 px-3 text-slate-300">{u.phone}</td>
                          <td className="py-2.5 px-3 text-slate-300">{u.email}</td>
                          <td className="py-2.5 pl-3 text-right">
                            <Badge tone="slate">{u.total_bookings || 0}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 5: Payments, Invoices & Cancellations */}
          {activeTab === 'finance' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card
                  title={`Payment Ledger (${payments.length})`}
                  subtitle="MySQL Payment (P-ID, B-ID, Amt, Date, Method)"
                >
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
                    {payments.map((p) => (
                      <div
                        key={p.p_id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-100">
                            P-ID #{p.p_id} • Booking #{p.b_id} ({p.user_name})
                          </p>
                          <p className="text-slate-400">
                            {p.service_name} • {p.method} • {p.date}
                          </p>
                        </div>
                        <span className="font-bold text-emerald-400">{formatINR(p.amt)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card
                  title={`Issued Invoices (${invoices.length})`}
                  subtitle="MySQL Invoices (I-ID, U-ID, B-ID, Amt, Date)"
                >
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1 text-xs">
                    {invoices.map((inv) => (
                      <div
                        key={inv.i_id}
                        className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-semibold text-slate-100">
                            I-ID #{inv.i_id} • Booking #{inv.b_id} ({inv.user_name})
                          </p>
                          <p className="text-slate-400">
                            {inv.service_name} • {inv.date}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300">{formatINR(inv.amt)}</span>
                          <Button variant="secondary" onClick={() => setInvoiceTarget(inv)}>
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              <Card
                title={`Cancellation & Refund Audit Log (${cancellations.length})`}
                subtitle="MySQL Cancellation (C-ID, B-ID, Date, Refund-amt)"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-slate-400 uppercase">
                      <tr>
                        <th className="py-2 pr-3">C-ID</th>
                        <th className="py-2 px-3">Booking (`B-ID`)</th>
                        <th className="py-2 px-3">Guest</th>
                        <th className="py-2 px-3">Cancelled Offering</th>
                        <th className="py-2 px-3">Original Paid</th>
                        <th className="py-2 px-3">Refund Amount (`Refund-amt`)</th>
                        <th className="py-2 pl-3 text-right">Cancellation Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {cancellations.map((c) => (
                        <tr key={c.c_id}>
                          <td className="py-2.5 pr-3 font-bold text-rose-400">#{c.c_id}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-100">#{c.b_id}</td>
                          <td className="py-2.5 px-3 text-slate-200">{c.user_name}</td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {c.service_name} ({c.city})
                          </td>
                          <td className="py-2.5 px-3">{formatINR(c.original_paid_amt)}</td>
                          <td className="py-2.5 px-3 font-bold text-rose-300">
                            {formatINR(c.refund_amt)}
                          </td>
                          <td className="py-2.5 pl-3 text-right text-slate-400">{c.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* TAB 6: Reviews Moderation & Notification Dispatch */}
          {activeTab === 'moderation' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card
                title={`Guest Reviews Moderation (${reviews.length})`}
                subtitle="MySQL Reviews (R-ID, U-ID, S-ID, Rating, Comment)"
              >
                <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1 text-xs">
                  {reviews.map((r) => (
                    <div
                      key={r.r_id}
                      className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 flex items-start justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-100">
                          R-ID #{r.r_id} • {r.user_name} on {r.service_name} (★ {r.rating}/5)
                        </p>
                        <p className="mt-1 text-slate-300">“{r.comment}”</p>
                      </div>
                      <Button variant="danger" onClick={() => handleDeleteReview(r.r_id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card
                title="Dispatch Guest Notification"
                subtitle="MySQL Notification (N-ID, U-ID, Message)"
              >
                <form onSubmit={handleSendNotification} className="space-y-3 text-xs mb-6">
                  <div>
                    <label htmlFor="adm-notif-user" className="block text-slate-300 mb-1">
                      Recipient Guest (`U-ID`)
                    </label>
                    <select
                      id="adm-notif-user"
                      value={notifUserId}
                      onChange={(e) => setNotifUserId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                    >
                      {users.map((u) => (
                        <option key={u.u_id} value={u.u_id}>
                          #{u.u_id} — {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="adm-notif-msg" className="block text-slate-300 mb-1">
                      Notification Message (`Message`)
                    </label>
                    <textarea
                      id="adm-notif-msg"
                      rows={2}
                      required
                      minLength={3}
                      placeholder="Your airport chauffeur will meet you at Terminal 2 Arrival Gate 4."
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-slate-100"
                    />
                  </div>

                  <Button type="submit" variant="primary">
                    Send Notification
                  </Button>
                </form>

                <div className="border-t border-slate-800 pt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
                  {notifications.map((n) => (
                    <div
                      key={n.n_id}
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-3"
                    >
                      <span className="font-semibold text-amber-300">
                        N-ID #{n.n_id} → {n.user_name} (U-ID #{n.u_id}):
                      </span>
                      <p className="text-slate-300 mt-0.5">{n.message}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
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
