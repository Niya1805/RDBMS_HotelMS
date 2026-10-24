import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Hash,
  Mail,
  XCircle,
  FileText,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchBookingById,
  fetchUsers,
  fetchBookings,
  cancelBooking,
  createPayment,
  extractApiError,
} from '../api/client';
import { formatINR, statusBadgeTone } from '../utils/media';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import InvoiceModal from '../components/ui/InvoiceModal';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function BookingLookupPage() {
  const { addToast } = useApp();

  const [lookupMode, setLookupMode] = useState('b_id'); // 'b_id' or 'email'
  const [bookingIdInput, setBookingIdInput] = useState('3');
  const [emailInput, setEmailInput] = useState('aarav.mehta@example.com');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cancellation modal state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Invoice modal state
  const [invoiceTarget, setInvoiceTarget] = useState(null);

  const handleLookup = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      if (lookupMode === 'b_id') {
        const res = await fetchBookingById(Number(bookingIdInput));
        setResults(res.data ? [res.data] : []);
      } else {
        const uRes = await fetchUsers({ email: emailInput.trim() });
        const matchedUsers = uRes.data || [];
        if (matchedUsers.length === 0) {
          setError(`No registered guest found with email "${emailInput.trim()}".`);
        } else {
          const bRes = await fetchBookings({ u_id: matchedUsers[0].u_id });
          setResults(bRes.data || []);
        }
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget.b_id);
      addToast(
        `Booking #${cancelTarget.b_id} cancelled! Refund recorded in MySQL Cancellation table.`,
        'success'
      );
      setCancelTarget(null);
      handleLookup();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleQuickPay = async (booking) => {
    try {
      await createPayment({ b_id: booking.b_id, method: 'UPI' });
      addToast(`Simulated payment recorded for Booking #${booking.b_id}!`, 'success');
      handleLookup();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="space-y-2">
        <Badge tone="amber">Reservation Verification &amp; Cancellation Workflow</Badge>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Find or Cancel an Existing Reservation
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Retrieve your reservation using your Booking Reference ID (<code>B-ID</code>) or your
          registered guest Email address. Eligible reservations (<code>Pending</code> or{' '}
          <code>Confirmed</code>) can be cancelled with automatic refund recording in the{' '}
          <code>Cancellation</code> entity.
        </p>
      </div>

      <Card title="Reservation Lookup">
        <form onSubmit={handleLookup} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setLookupMode('b_id')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                lookupMode === 'b_id'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Hash className="h-4 w-4" />
              Search by Booking Reference (`B-ID`)
            </button>
            <button
              type="button"
              onClick={() => setLookupMode('email')}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
                lookupMode === 'email'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-300'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="h-4 w-4" />
              Search by Guest Email (`User.Email`)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {lookupMode === 'b_id' ? (
              <div className="flex-1">
                <label htmlFor="lookup-bid" className="sr-only">
                  Booking ID
                </label>
                <input
                  id="lookup-bid"
                  type="number"
                  min={1}
                  required
                  placeholder="Enter Booking ID (e.g. 1, 3, 4, 5)"
                  value={bookingIdInput}
                  onChange={(e) => setBookingIdInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100"
                />
              </div>
            ) : (
              <div className="flex-1">
                <label htmlFor="lookup-email" className="sr-only">
                  Guest Email
                </label>
                <input
                  id="lookup-email"
                  type="email"
                  required
                  placeholder="Enter registered email (e.g. aarav.mehta@example.com)"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100"
                />
              </div>
            )}

            <Button type="submit" variant="primary" disabled={loading}>
              <Search className="h-4 w-4" />
              {loading ? 'Searching MySQL...' : 'Retrieve Reservation'}
            </Button>
          </div>
        </form>
      </Card>

      {error && <ApiErrorBanner message={error} />}

      {loading && <LoadingSpinner label="Looking up reservation records in MySQL..." />}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((b) => {
            const canCancel = b.status === 'Pending' || b.status === 'Confirmed';
            const estRefund = b.paid_amt ? Number(b.paid_amt) * 0.9 : 0;

            return (
              <Card
                key={b.b_id}
                title={`Booking #${b.b_id} — ${b.service_name}`}
                subtitle={`${b.location_name} (${b.city}) • Guest: ${b.user_name} (${b.user_email})`}
                badge={<Badge tone={statusBadgeTone(b.status)}>{b.status}</Badge>}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs text-slate-300">
                  <div className="space-y-1">
                    <span className="text-slate-500 uppercase font-semibold block">
                      Stay Schedule
                    </span>
                    <p>
                      Check-In: <strong className="text-slate-100">{b.check_in}</strong>
                    </p>
                    <p>
                      Check-Out: <strong className="text-slate-100">{b.check_out}</strong> ({b.nights} nights)
                    </p>
                    <p>Guests: {b.guests}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-500 uppercase font-semibold block">
                      Payment &amp; Billing
                    </span>
                    <p>Total Booking Rate: {formatINR(b.calculated_total_amt)}</p>
                    <p>
                      Paid Amount:{' '}
                      <strong className="text-amber-300">
                        {b.paid_amt ? `${formatINR(b.paid_amt)} (${b.payment_method})` : 'Unpaid'}
                      </strong>
                    </p>
                    <p>Invoice ID: {b.i_id ? `#${b.i_id}` : 'Pending Payment'}</p>
                  </div>

                  <div className="space-y-2 flex flex-col justify-between">
                    {b.c_id ? (
                      <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-rose-200">
                        <p className="font-semibold">Cancelled (C-ID #{b.c_id})</p>
                        <p>Refund Amount: {formatINR(b.refund_amt)}</p>
                        <p className="text-[11px] opacity-80">Date: {b.cancellation_date}</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Link
                          to={`/booking-confirmation/${b.b_id}`}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          Full Details
                        </Link>
                        {b.i_id && (
                          <Button variant="secondary" onClick={() => setInvoiceTarget(b)}>
                            <FileText className="h-3.5 w-3.5" />
                            Invoice
                          </Button>
                        )}
                        {b.status === 'Pending' && !b.p_id && (
                          <Button variant="primary" onClick={() => handleQuickPay(b)}>
                            <CreditCard className="h-3.5 w-3.5" />
                            Pay Now
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            variant="danger"
                            onClick={() => setCancelTarget({ ...b, estRefund })}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel Booking
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title={`Cancel Reservation #${cancelTarget?.b_id}?`}
        subtitle="Creates a record in MySQL Cancellation (C-ID, B-ID, Date, Refund-amt) & releases room inventory"
      >
        {cancelTarget && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 flex items-start gap-3 text-amber-200">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Refund &amp; Availability Policy</p>
                <p>
                  Cancelling transitions <code>Bookings.Status</code> to <code>&apos;Cancelled&apos;</code>{' '}
                  so the room immediately becomes available for other guests on{' '}
                  <strong>
                    {cancelTarget.check_in} → {cancelTarget.check_out}
                  </strong>
                  .
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Room / Service:</span>
                <span className="font-semibold text-slate-100">{cancelTarget.service_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Amount Paid:</span>
                <span>{formatINR(cancelTarget.paid_amt || 0)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-emerald-400 border-t border-slate-800 pt-2">
                <span>Applicable Refund (90% Policy):</span>
                <span>{formatINR(cancelTarget.estRefund)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setCancelTarget(null)}>
                Keep Reservation
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmCancellation}
                disabled={cancelling}
              >
                {cancelling ? 'Recording Cancellation...' : 'Confirm Cancellation & Refund'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <InvoiceModal
        invoice={invoiceTarget}
        isOpen={Boolean(invoiceTarget)}
        onClose={() => setInvoiceTarget(null)}
      />
    </div>
  );
}
