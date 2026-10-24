import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquarePlus, MapPin } from 'lucide-react';
import {
  fetchReviews,
  fetchServices,
  fetchUsers,
  createReview,
  extractApiError,
} from '../api/client';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function ReviewsPage() {
  const { activeGuest, addToast } = useApp();

  const [reviews, setReviews] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterServiceId, setFilterServiceId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New review form
  const [selectedUserId, setSelectedUserId] = useState(activeGuest?.u_id || '');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadReviewsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [revRes, srvRes, usrRes] = await Promise.all([
        fetchReviews(filterServiceId ? { s_id: filterServiceId } : {}),
        fetchServices(),
        fetchUsers(),
      ]);
      setReviews(revRes.data || []);
      const srvList = srvRes.data || [];
      const usrList = usrRes.data || [];
      setServices(srvList);
      setUsers(usrList);
      if (!selectedServiceId && srvList.length > 0) {
        setSelectedServiceId(srvList[0].s_id);
      }
      if (!selectedUserId && (activeGuest?.u_id || usrList[0]?.u_id)) {
        setSelectedUserId(activeGuest?.u_id || usrList[0]?.u_id);
      }
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filterServiceId, selectedServiceId, selectedUserId, activeGuest]);

  useEffect(() => {
    loadReviewsData();
  }, [loadReviewsData]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview({
        u_id: Number(selectedUserId),
        s_id: Number(selectedServiceId),
        rating: Number(rating),
        comment,
      });
      addToast('Review posted and stored in MySQL Reviews entity!', 'success');
      setComment('');
      loadReviewsData();
    } catch (err) {
      addToast(extractApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Badge tone="emerald">Reviews Entity (`R-ID`, `U-ID`, `S-ID`, `Rating`, `Comment`)</Badge>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Verified Guest Reviews &amp; Ratings
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Read authentic feedback from guests across our rooms, villas, and bespoke experiences,
          or submit your own review below.
        </p>
      </div>

      {error && <ApiErrorBanner message={error} onRetry={loadReviewsData} />}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Submit Review Form */}
        <div>
          <Card
            title="Write a Guest Review"
            subtitle="Inserts a new record into the MySQL Reviews table"
          >
            <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
              <div>
                <label htmlFor="rev-page-user" className="block font-medium text-slate-300 mb-1">
                  Guest Profile (`U-ID`)
                </label>
                <select
                  id="rev-page-user"
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  <option value="">Select Guest...</option>
                  {users.map((u) => (
                    <option key={u.u_id} value={u.u_id}>
                      #{u.u_id} — {u.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rev-page-service" className="block font-medium text-slate-300 mb-1">
                  Room or Service (`S-ID`)
                </label>
                <select
                  id="rev-page-service"
                  required
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
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
                <label htmlFor="rev-page-rating" className="block font-medium text-slate-300 mb-1">
                  Star Rating (`1–5`)
                </label>
                <select
                  id="rev-page-rating"
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>
                      {r} Star{r > 1 ? 's' : ''} —{' '}
                      {r === 5
                        ? 'Exceptional'
                        : r === 4
                        ? 'Very Good'
                        : r === 3
                        ? 'Good'
                        : r === 2
                        ? 'Fair'
                        : 'Poor'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rev-page-comment" className="block font-medium text-slate-300 mb-1">
                  Review Comment (`Comment`)
                </label>
                <textarea
                  id="rev-page-comment"
                  rows={4}
                  required
                  minLength={3}
                  placeholder="Describe your stay, room comfort, or service quality..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-slate-100"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={submitting}>
                <MessageSquarePlus className="h-4 w-4" />
                {submitting ? 'Submitting Review...' : 'Submit Review'}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right 2 Columns: Reviews Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <span className="text-sm font-semibold text-slate-200">
              Showing {reviews.length} Verified Review{reviews.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="filter-service" className="text-slate-400">
                Filter by Offering:
              </label>
              <select
                id="filter-service"
                value={filterServiceId}
                onChange={(e) => setFilterServiceId(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-slate-100"
              >
                <option value="">All Rooms &amp; Services</option>
                {services.map((s) => (
                  <option key={s.s_id} value={s.s_id}>
                    {s.name} ({s.city})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading reviews from MySQL..." />
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-10 text-center text-sm text-slate-400">
              No reviews found for this filter.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.r_id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-sm font-bold text-slate-100">{rev.user_name}</span>
                      <span className="ml-2 text-xs text-slate-500">
                        (Guest U-ID #{rev.u_id} • Review R-ID #{rev.r_id})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: rev.rating }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-amber-400" />
                      ))}
                    </div>
                  </div>

                  <p className="text-sm text-slate-200 leading-relaxed">“{rev.comment}”</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-amber-400" />
                      {rev.location_name} ({rev.city})
                    </span>
                    <Link
                      to={`/services/${rev.s_id}`}
                      className="font-semibold text-amber-400 hover:text-amber-300"
                    >
                      {rev.service_name} ({rev.service_category}) →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
