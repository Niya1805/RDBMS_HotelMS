import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Sparkles,
  Star,
  ArrowRight,
  ShieldCheck,
  Utensils,
  Wifi,
  Waves,
} from 'lucide-react';
import {
  fetchLocations,
  fetchServices,
  fetchReviews,
  extractApiError,
} from '../api/client';
import {
  HERO_BANNER_URL,
  getLocationImage,
  getServiceImage,
  formatINR,
  getDefaultDates,
} from '../utils/media';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import LoadingSpinner, { ApiErrorBanner } from '../components/ui/LoadingSpinner';

export default function HomePage() {
  const navigate = useNavigate();
  const defaults = getDefaultDates(7, 3);

  const [locations, setLocations] = useState([]);
  const [featuredServices, setFeaturedServices] = useState([]);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search form state
  const [selectedLocation, setSelectedLocation] = useState('');
  const [checkIn, setCheckIn] = useState(defaults.checkIn);
  const [checkOut, setCheckOut] = useState(defaults.checkOut);
  const [guests, setGuests] = useState(2);
  const [category, setCategory] = useState('Room');

  const loadHomeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [locRes, servRes, revRes] = await Promise.all([
        fetchLocations(),
        fetchServices(),
        fetchReviews(),
      ]);
      setLocations(locRes.data || []);
      setFeaturedServices((servRes.data || []).slice(0, 6));
      setRecentReviews((revRes.data || []).slice(0, 3));
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedLocation) params.set('l_id', selectedLocation);
    if (checkIn) params.set('check_in', checkIn);
    if (checkOut) params.set('check_out', checkOut);
    if (guests) params.set('guests', String(guests));
    if (category) params.set('category', category);
    navigate(`/search?${params.toString()}`);
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="absolute inset-0">
          <img
            src={HERO_BANNER_URL}
            alt="Grand Aurelia Luxury Palace & Resort"
            className="h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/30" />
        </div>

        <div className="relative z-10 px-6 py-16 sm:px-12 sm:py-20 lg:py-24">
          <div className="max-w-3xl space-y-5">
            <Badge tone="amber">
              <Sparkles className="h-3.5 w-3.5" />
              Grand Aurelia Hospitality Collection
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
              Timeless Luxury Across India’s Finest Destinations
            </h1>
            <p className="text-base text-slate-300 sm:text-lg max-w-2xl leading-relaxed">
              Reserve heritage lakeside suites, private oceanfront pool villas, alpine chalets,
              and curated bespoke experiences—backed by real-time MySQL 8 inventory and
              conflict-free reservation guarantees.
            </p>
          </div>

          {/* Search Bar Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="mt-10 rounded-2xl border border-slate-700/80 bg-slate-900/90 p-5 shadow-2xl backdrop-blur-md"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6 items-end">
              <div className="lg:col-span-2">
                <label
                  htmlFor="hero-location"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  <MapPin className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Destination / Hotel Property
                </label>
                <select
                  id="hero-location"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="">All Destinations ({locations.length} Properties)</option>
                  {locations.map((loc) => (
                    <option key={loc.l_id} value={loc.l_id}>
                      {loc.city} — {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="hero-checkin"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Check-In
                </label>
                <input
                  id="hero-checkin"
                  type="date"
                  required
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="hero-checkout"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                >
                  <Calendar className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                  Check-Out
                </label>
                <input
                  id="hero-checkout"
                  type="date"
                  required
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    htmlFor="hero-guests"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    <Users className="inline h-3.5 w-3.5 text-amber-400 mr-1" />
                    Guests
                  </label>
                  <select
                    id="hero-guests"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="hero-category"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
                  >
                    Type
                  </label>
                  <select
                    id="hero-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Room">Rooms</option>
                    <option value="Add-On">Add-Ons</option>
                    <option value="all">All</option>
                  </select>
                </div>
              </div>

              <div>
                <Button type="submit" variant="primary" className="w-full py-2.5">
                  <Search className="h-4 w-4" />
                  Check Availability
                </Button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {error && <ApiErrorBanner message={error} onRetry={loadHomeData} />}

      {loading ? (
        <LoadingSpinner label="Loading destinations, suites, and guest reviews from MySQL 8..." />
      ) : (
        <>
          {/* Destinations Section (Location Entity) */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <Badge tone="amber">Location Entity (`L-ID`)</Badge>
                <h2 className="mt-2 text-3xl font-bold text-slate-100">
                  Our Signature Destinations
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Explore our properties directly retrieved from the MySQL <code>Location</code> table.
                </p>
              </div>
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300"
              >
                Explore all rooms &amp; services <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {locations.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                No hotel locations found in database. Run <code>database/seed.sql</code> to populate sample properties.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {locations.map((loc) => (
                  <Link
                    key={loc.l_id}
                    to={`/search?l_id=${loc.l_id}`}
                    className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg transition-all hover:-translate-y-1 hover:border-amber-500/50"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      <img
                        src={getLocationImage(loc)}
                        alt={loc.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <div className="flex items-center justify-between text-xs text-amber-400">
                        <span className="font-semibold uppercase tracking-wider">
                          {loc.city}, {loc.country}
                        </span>
                        {loc.avg_rating && (
                          <span className="inline-flex items-center gap-1 text-amber-300">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {loc.avg_rating}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                        {loc.name}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1">{loc.address}</p>
                      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-xs text-slate-300">
                        <span>
                          {loc.room_types_count || 0} Room Types • {loc.addon_services_count || 0} Add-Ons
                        </span>
                        {loc.starting_room_price && (
                          <span className="font-semibold text-amber-300">
                            From {formatINR(loc.starting_room_price)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Featured Suites & Services (Services Entity) */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <Badge tone="sky">Services Entity (`S-ID`)</Badge>
                <h2 className="mt-2 text-3xl font-bold text-slate-100">
                  Featured Rooms, Villas &amp; Bespoke Add-Ons
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Live offerings from the <code>Services</code> table (supporting both bookable rooms and hotel experiences).
                </p>
              </div>
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300"
              >
                View all offerings <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredServices.map((srv) => (
                <div
                  key={srv.s_id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-lg transition-all hover:border-slate-700"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <img
                      src={getServiceImage(srv)}
                      alt={srv.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      <Badge tone={srv.category === 'Room' ? 'amber' : 'sky'}>
                        {srv.category}
                      </Badge>
                      <Badge tone="slate">{srv.city}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{srv.location_name}</span>
                        {srv.avg_rating && (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
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
                        <span>Up to {srv.max_guests} Guests</span>
                        <span>{srv.total_units} Total Units in Inventory</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-lg font-bold text-amber-400">
                            {formatINR(srv.price)}
                          </span>
                          <span className="text-xs text-slate-400">
                            {srv.category === 'Room' ? ' / night' : ' / package'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/services/${srv.s_id}`}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                          >
                            Details
                          </Link>
                          <Link
                            to={`/checkout/${srv.s_id}?check_in=${checkIn}&check_out=${checkOut}&guests=${Math.min(
                              guests,
                              srv.max_guests
                            )}`}
                            className="rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                          >
                            Book Now
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Hospitality Highlights & Amenities */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 sm:p-10">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Conflict-Free Reservations</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Row-level MySQL transaction locks guarantee zero double-booking while automatically
                  releasing cancelled room inventory.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Utensils className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Curated Dining &amp; Add-Ons</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Combine luxury suite stays with private Lake Pichola boat dinners, Ayurvedic spa
                  therapies, and chauffeur transfers.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Waves className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Flexible Cancellations</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Instant cancellation workflow with transparent refund tracking recorded directly in
                  the <code>Cancellation</code> table.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
                  <Wifi className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-100">Instant Digital Invoices</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every confirmed payment generates a relational tax invoice in <code>Invoices</code>{' '}
                  and a real-time alert in <code>Notification</code>.
                </p>
              </div>
            </div>
          </section>

          {/* Recent Verified Reviews (Reviews Entity) */}
          {recentReviews.length > 0 && (
            <section className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <Badge tone="emerald">Reviews Entity (`R-ID`)</Badge>
                  <h2 className="mt-2 text-3xl font-bold text-slate-100">
                    Guest Experiences &amp; Reviews
                  </h2>
                </div>
                <Link
                  to="/reviews"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300"
                >
                  Read or submit reviews <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {recentReviews.map((rev) => (
                  <div
                    key={rev.r_id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-amber-400">
                        {Array.from({ length: rev.rating }).map((_, idx) => (
                          <Star key={idx} className="h-4 w-4 fill-amber-400" />
                        ))}
                      </div>
                      <Badge tone="slate">{rev.city}</Badge>
                    </div>
                    <p className="text-sm text-slate-200 italic leading-relaxed">
                      “{rev.comment}”
                    </p>
                    <div className="border-t border-slate-800 pt-3 text-xs">
                      <p className="font-semibold text-slate-100">{rev.user_name}</p>
                      <p className="text-slate-400">{rev.service_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
