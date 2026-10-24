import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Star,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
} from 'lucide-react';
import {
  fetchLocations,
  fetchAvailableServices,
  extractApiError,
} from '../api/client';
import { getServiceImage, formatINR, getDefaultDates } from '../utils/media';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = getDefaultDates(7, 3);

  const [locations, setLocations] = useState([]);
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [lId, setLId] = useState(searchParams.get('l_id') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('check_in') || defaults.checkIn);
  const [checkOut, setCheckOut] = useState(searchParams.get('check_out') || defaults.checkOut);
  const [guests, setGuests] = useState(Number(searchParams.get('guests') || 2));
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [includeSoldOut, setIncludeSoldOut] = useState(true);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, availRes] = await Promise.all([
        fetchLocations(),
        fetchAvailableServices({
          l_id: lId || undefined,
          check_in: checkIn,
          check_out: checkOut,
          guests,
          category,
          include_sold_out: includeSoldOut,
        }),
      ]);
      setLocations(locRes.data || []);
      setResults(availRes.data || []);
      setMeta(availRes.meta || null);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [lId, checkIn, checkOut, guests, category, includeSoldOut]);

  useEffect(() => {
    runSearch();
  }, [runSearch]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (lId) next.set('l_id', lId);
    if (checkIn) next.set('check_in', checkIn);
    if (checkOut) next.set('check_out', checkOut);
    if (guests) next.set('guests', String(guests));
    if (category) next.set('category', category);
    setSearchParams(next);
    runSearch();
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Badge tone="amber">Real-Time Inventory &amp; Date-Conflict Check</Badge>
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          Search Available Rooms &amp; Hotel Services
        </h1>
        <p className="text-sm text-slate-400 max-w-3xl">
          Availability is computed dynamically in MySQL 8 by comparing <code>Services.Total_Units</code>{' '}
          against overlapping active <code>Bookings</code> (<code>Pending</code> and{' '}
          <code>Confirmed</code>). Cancelled bookings never block availability.
        </p>
      </div>

      {/* Filter Bar */}
      <form
        onSubmit={handleFilterSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
          <div className="lg:col-span-2">
            <label
              htmlFor="search-location"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              <MapPin className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
              Hotel Location
            </label>
            <select
              id="search-location"
              value={lId}
              onChange={(e) => setLId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            >
              <option value="">All Hotel Properties</option>
              {locations.map((loc) => (
                <option key={loc.l_id} value={loc.l_id}>
                  {loc.city} — {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="search-checkin"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
              Check-In
            </label>
            <input
              id="search-checkin"
              type="date"
              required
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div>
            <label
              htmlFor="search-checkout"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
              Check-Out
            </label>
            <input
              id="search-checkout"
              type="date"
              required
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="search-guests"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                <Users className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                Guests
              </label>
              <select
                id="search-guests"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2.5 text-sm text-slate-100"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="search-category"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
              >
                <SlidersHorizontal className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                Category
              </label>
              <select
                id="search-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2.5 text-sm text-slate-100"
              >
                <option value="all">All</option>
                <option value="Room">Rooms</option>
                <option value="Add-On">Add-Ons</option>
              </select>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full py-2.5">
            <Search className="h-4 w-4" />
            Update Search
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSoldOut}
              onChange={(e) => setIncludeSoldOut(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-500"
            />
            <span>Show sold-out rooms for comparison</span>
          </label>
          {meta && (
            <span>
              Showing <strong>{results.length}</strong> matching offerings for{' '}
              <strong>{meta.nights}</strong> night{meta.nights > 1 ? 's' : ''} ({meta.check_in} →{' '}
              {meta.check_out})
            </span>
          )}
        </div>
      </form>

      {error && <ApiErrorBanner message={error} onRetry={runSearch} />}

      {loading ? (
        <LoadingSpinner label="Querying room inventory and date-range overlaps in MySQL 8..." />
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center space-y-3">
          <p className="text-lg font-semibold text-slate-200">
            No matching rooms or services found for your criteria.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try reducing the guest count, selecting &ldquo;All Hotel Properties&rdquo;, or choosing
            different check-in and check-out dates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((srv) => {
            const available = srv.available_units > 0;
            return (
              <div
                key={srv.s_id}
                className={`flex flex-col overflow-hidden rounded-2xl border bg-slate-900/80 shadow-lg transition-all ${
                  available
                    ? 'border-slate-800 hover:border-amber-500/40'
                    : 'border-rose-500/30 opacity-80'
                }`}
              >
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <img
                    src={getServiceImage(srv)}
                    alt={srv.name}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <Badge tone={srv.category === 'Room' ? 'amber' : 'sky'}>{srv.category}</Badge>
                    <Badge tone="slate">{srv.city}</Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    {available ? (
                      <Badge tone="emerald">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {srv.available_units} of {srv.total_units} Left
                      </Badge>
                    ) : (
                      <Badge tone="rose">
                        <XCircle className="h-3.5 w-3.5" />
                        Sold Out for Dates
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="truncate">{srv.location_name}</span>
                      {srv.avg_rating && (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold shrink-0">
                          <Star className="h-3.5 w-3.5 fill-amber-400" />
                          {srv.avg_rating} ({srv.review_count})
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-100">{srv.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {srv.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Max Occupancy: {srv.max_guests} Guests</span>
                      <span>Active Overlaps: {srv.active_overlapping_bookings}</span>
                    </div>

                    <div className="flex items-end justify-between gap-2">
                      <div>
                        <span className="text-lg font-bold text-amber-400">
                          {formatINR(srv.price)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {srv.category === 'Room' ? ' / night' : ' / package'}
                        </span>
                        <span className="block text-[11px] text-slate-400">
                          Est. Total: <strong className="text-slate-200">{formatINR(srv.estimated_total_price)}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/services/${srv.s_id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                        >
                          Details
                        </Link>
                        {available ? (
                          <Link
                            to={`/checkout/${srv.s_id}?check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`}
                            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                          >
                            Reserve
                          </Link>
                        ) : (
                          <span className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-500 cursor-not-allowed">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
