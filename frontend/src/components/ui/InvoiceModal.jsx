import React from 'react';
import { Printer, Building2, CheckCircle2 } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Badge from './Badge';
import { formatINR, statusBadgeTone } from '../../utils/media';

export default function InvoiceModal({ invoice, isOpen, onClose }) {
  if (!invoice) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Official Tax Invoice #${invoice.i_id || invoice.b_id}`}
      subtitle={`Issued by Grand Aurelia Hotels & Resorts • Booking Reference #${invoice.b_id}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6 text-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-100">{invoice.location_name || 'Grand Aurelia Property'}</p>
              <p className="text-xs text-slate-400">
                {invoice.location_address ? `${invoice.location_address}, ` : ''}
                {invoice.city || 'India'}
              </p>
            </div>
          </div>
          <Badge tone={statusBadgeTone(invoice.booking_status || invoice.status)}>
            {invoice.booking_status || invoice.status || 'Issued'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1">
            <span className="uppercase tracking-wider text-slate-500 font-semibold block">
              Billed To (User Entity)
            </span>
            <p className="text-sm font-semibold text-slate-100">{invoice.user_name}</p>
            {invoice.user_email && <p className="text-slate-400">{invoice.user_email}</p>}
            {invoice.user_phone && <p className="text-slate-400">{invoice.user_phone}</p>}
            <p className="text-slate-500">Guest U-ID: #{invoice.u_id}</p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 space-y-1">
            <span className="uppercase tracking-wider text-slate-500 font-semibold block">
              Invoice Metadata (Invoices Entity)
            </span>
            <p className="text-slate-200">
              <span className="text-slate-400">Invoice ID (I-ID):</span> #{invoice.i_id || 'Pending'}
            </p>
            <p className="text-slate-200">
              <span className="text-slate-400">Booking ID (B-ID):</span> #{invoice.b_id}
            </p>
            <p className="text-slate-200">
              <span className="text-slate-400">Issue Date:</span>{' '}
              {invoice.date || invoice.invoice_date || 'Upon Checkout'}
            </p>
            <p className="text-slate-200">
              <span className="text-slate-400">Payment Method:</span>{' '}
              {invoice.payment_method || 'Simulated Settlement'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase">
              <tr>
                <th className="py-2.5 px-4">Description (Services Entity)</th>
                <th className="py-2.5 px-4">Dates</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-3 px-4">
                  <p className="font-semibold text-slate-100">{invoice.service_name}</p>
                  <p className="text-slate-400">
                    Category: {invoice.service_category || 'Room'} • Guests: {invoice.guests || 1}
                  </p>
                </td>
                <td className="py-3 px-4 text-slate-300">
                  {invoice.check_in} → {invoice.check_out}
                  {invoice.nights ? ` (${invoice.nights} night${invoice.nights > 1 ? 's' : ''})` : ''}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-slate-100">
                  {formatINR(invoice.amt || invoice.invoice_amt || invoice.paid_amt || invoice.calculated_total_amt)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {Number(invoice.refund_amt || 0) > 0 && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3.5 flex items-center justify-between text-xs text-rose-200">
            <span>Cancellation Refund Recorded (Cancellation Entity):</span>
            <span className="font-bold text-rose-300">- {formatINR(invoice.refund_amt)}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Verified MySQL 8 Relational Invoice Record</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print Invoice
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
