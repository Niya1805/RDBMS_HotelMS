import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  UserCheck,
  CreditCard,
  Calendar,
  ArrowLeft,
  Info,
} from 'lucide-react';
import {
  fetchServiceById,
  checkServiceAvailability,
  fetchUsers,
  registerOrLookupUser,
  createBooking,
  extractApiError,
} from '../api/client';
import { getServiceImage, formatINR, getDefaultDates } from '../utils/media';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

const PAYMENT_METHODS = [
  { value: 'Credit Card', label: 'Credit Card (Simulated Academic Settlement)' },
  { value: 'Debit Card', label: 'Debit Card (Simulated Academic Settlement)' },
  { value: 'UPI', label: 'UPI Instant Transfer (Simulated)' },
  { value: 'Net Banking', label: 'Net Banking (Simulated)' },
  { value: 'Cash', label: 'Cash at Hotel Reception' },
  { value: '', label: 'Pay Later — Reserve with Pending Status' },
];

export default function CheckoutPage() {
  const { sId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeGuest, setActiveGuest, addToast } = useApp();
  const defaults = getDefaultDates(7, 3);

  const [service, setService] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [existingUsers, setExistingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || defaults.checkIn);
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || defaults.checkOut);
  const [guests, setGuests] = useState(Number(searchParams.get('guests') || 2));

  // Guest Mode: 'existing' or 'new'
  const [guestMode, setGuestMode] = useState(activeGuest ? 'existing' : 'new');
  const [selectedUserId, setSelectedUserId] = useState(activeGuest?.u_id || '');
  const [guestName, setGuestName] = useState(activeGuest?.name || '');
  const [guestPhone, setGuestPhone] = useState(activeGuest?.phone || '');
  const [guestEmail, setGuestEmail] = useState(activeGuest?.email || '');

  // Simulated Payment
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');

  const loadCheckoutData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srvRes, availRes, usersRes] = await Promise.all([
        fetchServiceById(sId),
        checkServiceAvailability(sId, { check_in: checkIn, check_out: checkOut, guests }),
        fetchUsers(),
      ]);
      setService(srvRes.data);
      setAvailability(availRes.data);
      const users = usersRes.data || [];
      setExistingUsers(users);
      if (activeGuest?.u_id) {
        setSelectedUserId(activeGuest.u_id);
        setGuestMode('existing');
      } else if (users.length > 0 && !selectedUserId) {
        setSelectedUserId(users[0].u_id);
        setGuestMode('existing');
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [sId, checkIn, checkOut, guests, activeGuest, selectedUserId]);

  useEffect(() => {
    loadCheckoutData();
  }, [loadCheckoutData]);

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    if (!availability?.is_available) {
      addToast('This room/service is not available for the selected dates or guest count.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let targetUserId = selectedUserId;

      if (guestMode === 'new') {
        const userRes = await registerOrLookupUser({
          name: guestName,
          phone: guestPhone,
          email: guestEmail,
          lookup_or_create: true,
        });
        targetUserId = userRes.data.u_id;
        setActiveGuest(userRes.data);
      } else {
        const chosen = existingUsers.find((u) => Number(u.u_id) === Number(selectedUserId));
        if (chosen) setActiveGuest(chosen);
      }

      if (!targetUserId) {
        addToast('Please select or register a guest profile.', 'error');
        setSubmitting(false);
        return;
      }

      const bookingRes = await createBooking({
        u_id: Number(targetUserId),
        s_id: Number(sId),
        check_in: checkIn,
        check_out: checkOut,
        guests: Number(guests),
        payment_method: paymentMethod || undefined,
      });

      const createdBooking = bookingRes.data;
      addToast(
        `Reservation #${createdBooking.b_id} committed to MySQL (${createdBooking.status})!`,
        'success'
      );
      navigate(`/booking-confirmation/${createdBooking.b_id}`);
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Preparing reservation checkout & checking MySQL inventory..." />;
  }

  if (error || !service) {
    return <ApiErrorBanner message={error || 'Service not found'} onRetry={loadCheckoutData} />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={`/services/${sId}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {service.name} Details
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-100">
          Complete Your Reservation
        </h1>
        <p className="text-sm text-slate-400">
          Atomic MySQL transaction across <code>User</code>, <code>Bookings</code>,{' '}
          <code>Payment</code>, <code>Invoices</code>, and <code>Notification</code>.
        </p>
      </div>

      <form onSubmit={handleConfirmReservation} className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Dates, Guest Details, and Simulated Payment */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Stay Dates & Guests */}
          <Card
            title="1. Reservation Dates & Occupancy"
            subtitle="Validated on both client and Flask backend (Check_Out > Check_In)"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="chk-in"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Check-In
                </label>
                <input
                  id="chk-in"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="chk-out"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Check-Out
                </label>
                <input
                  id="chk-out"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="chk-guests"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  Guests (Max {service.max_guests})
                </label>
                <select
                  id="chk-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {Array.from({ length: service.max_guests }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Step 2: Guest Information (User Entity) */}
          <Card
            title="2. Guest Information (User Entity)"
            subtitle="Select an existing registered guest or enter new guest details"
            badge={<Badge tone="amber">U-ID</Badge>}
          >
            <div className="space-y-4">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setGuestMode('existing')}
                  className={`flex-1 rounded-xl border p-3 text-xs font-semibold text-left transition-colors cursor-pointer ${
                    guestMode === 'existing'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="h-4 w-4 mb-1 text-amber-400" />
                  Use Existing Registered Guest ({existingUsers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setGuestMode('new')}
                  className={`flex-1 rounded-xl border p-3 text-xs font-semibold text-left transition-colors cursor-pointer ${
                    guestMode === 'new'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <UserCheck className="h-4 w-4 mb-1 text-amber-400" />
                  Register New Guest Profile
                </button>
              </div>

              {guestMode === 'existing' ? (
                <div>
                  <label
                    htmlFor="checkout-existing-user"
                    className="block text-xs font-medium text-slate-300 mb-1.5"
                  >
                    Select Registered Guest (`User` Table)
                  </label>
                  <select
                    id="checkout-existing-user"
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
                  >
                    <option value="">Choose a guest...</option>
                    {existingUsers.map((u) => (
                      <option key={u.u_id} value={u.u_id}>
                        U-ID #{u.u_id} — {u.name} ({u.email} • {u.phone})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="guest-name"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Full Name (`Name`)
                    </label>
                    <input
                      id="guest-name"
                      type="text"
                      required
                      minLength={2}
                      placeholder="e.g. Rohan Deshmukh"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="guest-phone"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Phone Number (`Phone`)
                    </label>
                    <input
                      id="guest-phone"
                      type="tel"
                      required
                      placeholder="+91-90000-12345"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="guest-email"
                      className="block text-xs font-medium text-slate-300 mb-1"
                    >
                      Email Address (`Email`)
                    </label>
                    <input
                      id="guest-email"
                      type="email"
                      required
                      placeholder="rohan@example.com"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Step 3: Simulated Academic Payment Flow (Payment Entity) */}
          <Card
            title="3. Simulated Academic Payment Flow (Payment Entity)"
            subtitle="Records P-ID, B-ID, Amt, Date, and Method in MySQL Payment table"
            badge={<Badge tone="emerald">3NF Payment</Badge>}
          >
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
                <Info className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Academic Simulation Notice:</strong> No real credit card numbers, CVVs, or
                  bank credentials are collected or processed. Selecting a payment method immediately
                  records the transaction in <code>Payment</code>, generates an official record in{' '}
                  <code>Invoices</code>, and sets <code>Bookings.Status = &apos;Confirmed&apos;</code>.
                </span>
              </div>

              <div>
                <label
                  htmlFor="payment-method-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  <CreditCard className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Select Settlement Method (`Payment.Method`)
                </label>
                <select
                  id="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.value} value={pm.value}>
                      {pm.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Booking Summary & Submit */}
        <div className="space-y-6">
          <Card title="Reservation Summary" subtitle={`Service S-ID #${service.s_id}`}>
            <div className="space-y-4 text-xs">
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <img
                  src={getServiceImage(service)}
                  alt={service.name}
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>

              <div>
                <Badge tone={service.category === 'Room' ? 'amber' : 'sky'}>
                  {service.category}
                </Badge>
                <h3 className="mt-1.5 text-lg font-bold text-slate-100">{service.name}</h3>
                <p className="text-slate-400">
                  {service.location_name} ({service.city})
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-800 pt-3 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-In:</span>
                  <span className="font-medium">{checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Check-Out:</span>
                  <span className="font-medium">{checkOut}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Stay Duration:</span>
                  <span className="font-medium">{availability?.nights || 1} Night(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Guests:</span>
                  <span className="font-medium">{guests} Guest(s)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Available Units:</span>
                  <span className="font-semibold text-emerald-400">
                    {availability?.available_units ?? 0} of {service.total_units}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-3 space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Base Rate:</span>
                  <span>
                    {formatINR(service.price)}{' '}
                    {service.category === 'Room' ? `× ${availability?.nights || 1} nights` : '(package)'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-amber-400 pt-1">
                  <span>Total Amount:</span>
                  <span>{formatINR(availability?.estimated_total_price || service.price)}</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Initial Booking Status:{' '}
                  <strong className="text-slate-200">
                    {paymentMethod ? 'Confirmed (Paid)' : 'Pending (Unpaid)'}
                  </strong>
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                disabled={submitting || !availability?.is_available}
              >
                <ShieldCheck className="h-4 w-4" />
                {submitting
                  ? 'Committing Reservation Transaction...'
                  : paymentMethod
                  ? 'Confirm & Record Simulated Payment'
                  : 'Create Pending Reservation'}
              </Button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
