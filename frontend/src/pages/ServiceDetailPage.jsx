import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Users,
  Layers,
  Star,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MessageSquarePlus,
} from 'lucide-react';
import {
  fetchServiceById,
  checkServiceAvailability,
  createReview,
  fetchUsers,
  extractApiError,
} from '../api/client';
import { getServiceImage, formatINR, getDefaultDates } from '../utils/media';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function ServiceDetailPage() {
  const { sId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeGuest, addToast } = useApp();
  const defaults = getDefaultDates(7, 3);

  const [service, setService] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAvail, setCheckingAvail] = useState(false);
  const [error, setError] = useState(null);
  const [availError, setAvailError] = useState(null);

  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || defaults.checkIn);
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || defaults.checkOut);
  const [guests, setGuests] = useState(Number(searchParams.get('guests') || 2));

  // Review submission form
  const [reviewUserId, setReviewUserId] = useState(activeGuest?.u_id || '');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srvRes, usersRes] = await Promise.all([
        fetchServiceById(sId),
        fetchUsers(),
      ]);
      setService(srvRes.data);
      const loadedUsers = usersRes.data || [];
      setUsersList(loadedUsers);
      if (!reviewUserId && (activeGuest?.u_id || loadedUsers[0]?.u_id)) {
        setReviewUserId(activeGuest?.u_id || loadedUsers[0]?.u_id);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [sId, activeGuest, reviewUserId]);

  const verifyAvailability = useCallback(async () => {
    if (!checkIn || !checkOut) return;
    setCheckingAvail(true);
    setAvailError(null);
    try {
      const res = await checkServiceAvailability(sId, {
        check_in: checkIn,
        check_out: checkOut,
        guests,
      });
      setAvailability(res.data);
    } catch (err) {
      setAvailError(extractApiError(err));
      setAvailability(null);
    } finally {
      setCheckingAvail(false);
    }
  }, [sId, checkIn, checkOut, guests]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    verifyAvailability();
  }, [verifyAvailability]);

  const handleProceedToCheckout = (e) => {
    e.preventDefault();
    if (!availability?.is_available) {
      addToast('Selected dates or guest count are not available.', 'error');
      return;
    }
    navigate(`/checkout/${sId}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewUserId) {
      addToast('Please select or sign in with a guest profile.', 'error');
      return;
    }
    setSubmittingReview(true);
    try {
      await createReview({
        u_id: Number(reviewUserId),
        s_id: Number(sId),
        rating: Number(rating),
        comment,
      });
      addToast('Review submitted and saved to MySQL Reviews table!', 'success');
      setComment('');
      loadDetail();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading room/service details from MySQL..." />;
  }

  if (error || !service) {
    return <ApiErrorBanner message={error || 'Service not found'} onRetry={loadDetail} />;
  }

  return (
    <div className="space-y-10">
      <div>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-amber-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Search Results
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Service Details & Reviews */}
        <div className="lg:col-span-2 space-y-8">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <img
                src={getServiceImage(service)}
                alt={service.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge tone={service.category === 'Room' ? 'amber' : 'sky'}>
                  {service.category} (S-ID #{service.s_id})
                </Badge>
                <Badge tone="slate">{service.city}, {service.country}</Badge>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {service.location_name} — {service.location_address}
                  </p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-100">{service.name}</h1>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-2xl font-bold text-amber-400">
                    {formatINR(service.price)}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {service.category === 'Room' ? 'per night' : 'per package'}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">{service.description}</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t border-slate-800 pt-5 text-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <Users className="h-4 w-4 text-amber-400" />
                    Maximum Capacity
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    Up to {service.max_guests} Guests
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <Layers className="h-4 w-4 text-amber-400" />
                    Property Inventory
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {service.total_units} Total Unit{service.total_units > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                  <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                    <Star className="h-4 w-4 text-amber-400" />
                    Guest Rating
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {service.avg_rating ? `${service.avg_rating} / 5.0` : 'New'} ({service.review_count || 0} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews Section (Reviews Entity) */}
          <Card
            title={`Verified Guest Reviews (${service.reviews?.length || 0})`}
            subtitle="Stored in MySQL Reviews (R-ID, U-ID, S-ID, Rating, Comment)"
          >
            <div className="space-y-6">
              {(!service.reviews || service.reviews.length === 0) ? (
                <p className="text-xs text-slate-400">
                  No reviews yet for this offering. Be the first guest to share your experience below!
                </p>
              ) : (
                <div className="space-y-4">
                  {service.reviews.map((rev) => (
                    <div
                      key={rev.r_id}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-slate-100">
                          {rev.user_name} <span className="text-xs text-slate-500">(U-ID #{rev.u_id})</span>
                        </span>
                        <div className="flex items-center gap-1 text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star key={idx} className="h-3.5 w-3.5 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Review Form */}
              <form
                onSubmit={handleReviewSubmit}
                className="border-t border-slate-800 pt-5 space-y-4"
              >
                <h4 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4 text-amber-400" />
                  Submit a Review for {service.name}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="rev-user"
                      className="block text-xs font-medium text-slate-400 mb-1"
                    >
                      Guest Profile (`U-ID`)
                    </label>
                    <select
                      id="rev-user"
                      required
                      value={reviewUserId}
                      onChange={(e) => setReviewUserId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                    >
                      <option value="">Select Registered Guest...</option>
                      {usersList.map((u) => (
                        <option key={u.u_id} value={u.u_id}>
                          #{u.u_id} — {u.name} ({u.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="rev-rating"
                      className="block text-xs font-medium text-slate-400 mb-1"
                    >
                      Rating (1 to 5 Stars)
                    </label>
                    <select
                      id="rev-rating"
                      value={rating}
                      onChange={(e) => setRating(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
                    >
                      {[5, 4, 3, 2, 1].map((r) => (
                        <option key={r} value={r}>
                          {r} Star{r > 1 ? 's' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="rev-comment"
                    className="block text-xs font-medium text-slate-400 mb-1"
                  >
                    Your Review Comment
                  </label>
                  <textarea
                    id="rev-comment"
                    rows={3}
                    required
                    minLength={3}
                    placeholder="Share your feedback about the room, views, or service..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100"
                  />
                </div>

                <Button type="submit" variant="secondary" disabled={submittingReview}>
                  {submittingReview ? 'Submitting...' : 'Post Verified Review'}
                </Button>
              </form>
            </div>
          </Card>
        </div>

        {/* Right Column: Live Availability & Reservation Widget */}
        <div className="space-y-6">
          <Card
            title="Check Availability & Reserve"
            subtitle="Live MySQL overlap check (Pending & Confirmed bookings)"
          >
            <form onSubmit={handleProceedToCheckout} className="space-y-4">
              <div>
                <label
                  htmlFor="detail-checkin"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Check-In Date
                </label>
                <input
                  id="detail-checkin"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="detail-checkout"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Check-Out Date
                </label>
                <input
                  id="detail-checkout"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="detail-guests"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1"
                >
                  <Users className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Number of Guests (Max {service.max_guests})
                </label>
                <select
                  id="detail-guests"
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                      {n > service.max_guests ? ' (Exceeds Max)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {availError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                  {availError}
                </div>
              )}

              {availability && !availError && (
                <div
                  className={`rounded-xl border p-4 space-y-2 text-xs ${
                    availability.is_available
                      ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-100'
                      : 'border-rose-500/30 bg-rose-950/20 text-rose-100'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      {availability.is_available ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-rose-400" />
                      )}
                      {availability.is_available ? 'Available for Reservation' : 'Not Available'}
                    </span>
                    <span>
                      {availability.available_units} / {availability.total_units} Units Free
                    </span>
                  </div>

                  {!availability.capacity_ok && (
                    <p className="text-rose-300">
                      Selected guest count ({guests}) exceeds max occupancy ({availability.max_guests}).
                    </p>
                  )}

                  <div className="border-t border-slate-800/80 pt-2 space-y-1 text-slate-300">
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span>{availability.nights} Night(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Rate:</span>
                      <span>{formatINR(availability.unit_price)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-amber-300 text-sm pt-1">
                      <span>Estimated Total:</span>
                      <span>{formatINR(availability.estimated_total_price)}</span>
                    </div>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3"
                disabled={checkingAvail || !availability?.is_available}
              >
                {checkingAvail
                  ? 'Checking MySQL Inventory...'
                  : availability?.is_available
                  ? 'Proceed to Reservation & Checkout'
                  : 'Unavailable for Selected Dates/Guests'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
