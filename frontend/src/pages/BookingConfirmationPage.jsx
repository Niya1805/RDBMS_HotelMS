import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  CreditCard,
  XCircle,
  Calendar,
  MapPin,
  User,
  ArrowRight,
} from 'lucide-react';
import {
  fetchBookingById,
  createPayment,
  cancelBooking,
  extractApiError,
} from '../api/client';
import { formatINR, statusBadgeTone } from '../utils/media';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import InvoiceModal from '../components/ui/InvoiceModal';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function BookingConfirmationPage() {
  const { bId } = useParams();
  const { addToast } = useApp();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);
  const [selectedPayMethod, setSelectedPayMethod] = useState('UPI');

  const loadBooking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchBookingById(bId);
      setBooking(res.data);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [bId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleSettlePayment = async () => {
    setProcessingAction(true);
    try {
      await createPayment({ b_id: Number(bId), method: selectedPayMethod });
      addToast('Simulated payment recorded and invoice generated!', 'success');
      loadBooking();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!window.confirm(`Are you sure you want to cancel Booking #${bId}?`)) return;
    setProcessingAction(true);
    try {
      await cancelBooking(bId);
      addToast(`Booking #${bId} cancelled and refund recorded in Cancellation table.`, 'success');
      loadBooking();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Retrieving reservation confirmation from MySQL..." />;
  }

  if (error || !booking) {
    return <ApiErrorBanner message={error || 'Booking not found'} onRetry={loadBooking} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <Badge tone={statusBadgeTone(booking.status)}>
          Reservation Status: {booking.status}
        </Badge>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Booking Reference #{booking.b_id}
        </h1>
        <p className="text-sm text-slate-300 max-w-xl mx-auto">
          Thank you, <strong>{booking.user_name}</strong>. Your reservation for{' '}
          <strong>{booking.service_name}</strong> at <strong>{booking.location_name}</strong> is
          persisted in the MySQL <code>Bookings</code> table.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card title="Reservation & Stay Details" subtitle={`Bookings Entity (B-ID #${booking.b_id})`}>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">{booking.location_name}</p>
                <p className="text-slate-400">{booking.city}, {booking.country}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Calendar className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">
                  {booking.check_in} → {booking.check_out} ({booking.nights} Night{booking.nights > 1 ? 's' : ''})
                </p>
                <p className="text-slate-400">
                  Offering: {booking.service_name} ({booking.service_category}) • {booking.guests} Guest(s)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <User className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-100">
                  {booking.user_name} (U-ID #{booking.u_id})
                </p>
                <p className="text-slate-400">
                  {booking.user_email} • {booking.user_phone}
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Financial & Billing Status" subtitle="Payment, Invoices, & Cancellation Entities">
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Calculated Total:</span>
              <span className="font-bold text-slate-100">{formatINR(booking.calculated_total_amt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Payment Record (`P-ID`):</span>
              <span>
                {booking.p_id
                  ? `#${booking.p_id} (${formatINR(booking.paid_amt)} via ${booking.payment_method})`
                  : 'Unpaid (Pending)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Invoice Record (`I-ID`):</span>
              <span>{booking.i_id ? `#${booking.i_id}` : 'Generated upon payment'}</span>
            </div>

            {booking.c_id && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 p-3 text-rose-200">
                <p className="font-semibold">Cancelled (C-ID #{booking.c_id})</p>
                <p>Refund Recorded: {formatINR(booking.refund_amt)} on {booking.cancellation_date}</p>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2">
              {booking.i_id && (
                <Button variant="secondary" onClick={() => setInvoiceOpen(true)}>
                  <FileText className="h-4 w-4" />
                  View Official Invoice
                </Button>
              )}

              {booking.status in { Pending: 1, Confirmed: 1 } && (
                <Button
                  variant="danger"
                  onClick={handleCancelReservation}
                  disabled={processingAction}
                >
                  <XCircle className="h-4 w-4" />
                  Cancel Reservation
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* If Pending / Unpaid, allow immediate simulated payment settlement */}
      {booking.status === 'Pending' && !booking.p_id && (
        <Card
          title="Complete Simulated Payment to Confirm Reservation"
          subtitle="Settling payment transitions status from Pending to Confirmed and generates an Invoice"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={selectedPayMethod}
                onChange={(e) => setSelectedPayMethod(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100"
              >
                <option value="UPI">UPI</option>
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Cash">Cash</option>
              </select>
              <Button
                variant="primary"
                onClick={handleSettlePayment}
                disabled={processingAction}
              >
                <CreditCard className="h-4 w-4" />
                Pay {formatINR(booking.calculated_total_amt)} (Simulated)
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
        >
          Go to Guest Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-slate-200"
        >
          Browse More Rooms &amp; Add-On Experiences
        </Link>
      </div>

      <InvoiceModal
        invoice={booking}
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </div>
  );
}
