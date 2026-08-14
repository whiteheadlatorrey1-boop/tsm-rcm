// =====================================================
// CONCIERGE TRANSPORT PROVIDER ADAPTER ARCHITECTURE
// server/services/concierge-transport-adapter.js
//
// Goal: keep TSM provider-neutral. Every transportation provider (Uber/Lyft
// API, a local black-car vendor, a hotel shuttle contract) implements the
// same five-method contract below. TSM Concierge never talks to a provider
// directly -- it talks to ProviderRouter, which fans a request out to
// whichever adapters are registered and normalizes their responses into
// one shape.
//
// Build order (deliberate, per the "don't integrate five providers first"
// guidance): this file ships the contract + one adapter (MockTransportProvider)
// that proves the full loop --
//   quote -> book -> driver assigned -> en route -> picked up -> completed
// -- including the exception path (driver cancels), entirely in-memory, no
// external API keys required. A real provider (Uber, a black-car vendor's
// REST API) becomes a second class implementing the same contract, not a
// rewrite of anything above it.
//
// Nothing in this file touches Mongo or Express -- it's pure adapter logic,
// unit-testable on its own (see bottom of file for a __selfTest export used
// by scripts/test-concierge-transport-adapter.js). Persistence (mapping a
// booking to a concierge mission/case, an SLA-event-style status timeline)
// and the Express routes are a separate slice on top of this one, same as
// BPO's ledger-service-first, routes-second pattern.
// =====================================================

'use strict';

const crypto = require('crypto');

// ── Shared types (documented via JSDoc, not enforced at runtime -- this is
// plain Node, no TypeScript in this repo) ──────────────────────────────────
//
// TransportRequest:
//   { service: 'airport_transfer'|'point_to_point'|'hourly',
//     pickup: { address: string, lat?: number, lng?: number },
//     destination: { address: string, lat?: number, lng?: number, airportCode?: string },
//     date: 'YYYY-MM-DD', time: 'HH:MM',
//     passengers: number, bags: number,
//     vehicle?: 'standard'|'suv'|'black_car'|'van' }  // omit to get all vehicle classes quoted
//
// Quote:
//   { quoteId, provider, vehicle, priceEstimate: { amount, currency },
//     etaPickupMinutes, etaTripMinutes, expiresAt }
//
// Booking:
//   { bookingId, provider, quoteId, status, confirmationCode,
//     request, driver: { name, vehicle, plate, phone } | null,
//     createdAt, updatedAt, history: [{ status, at, note? }] }

const BOOKING_STATUSES = Object.freeze([
  'confirmed',        // createBooking succeeded, no driver yet
  'driver_assigned',
  'en_route',
  'arrived',
  'picked_up',
  'completed',
  'cancelled',         // guest/property cancelled
  'cancelled_by_driver' // provider-side exception -- TSM must re-book
]);

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/**
 * Base class documenting the adapter contract. Every method throws
 * "not implemented" by default -- a new provider only needs to override
 * the methods it actually supports. ProviderRouter treats a thrown/rejected
 * call from one adapter as that provider being unavailable for the request,
 * not a fatal error for the whole quote fan-out.
 */
class TransportProviderAdapter {
  constructor(name) {
    if (!name) throw new Error('TransportProviderAdapter requires a provider name');
    this.name = name;
  }

  /** @returns {Promise<{available: boolean, vehicles: string[]}>} */
  async searchAvailability(_request) {
    throw new Error(`${this.name}: searchAvailability() not implemented`);
  }

  /** @returns {Promise<Quote[]>} one quote per available vehicle class */
  async getQuote(_request) {
    throw new Error(`${this.name}: getQuote() not implemented`);
  }

  /** @returns {Promise<Booking>} */
  async createBooking(_bookingRequest) {
    throw new Error(`${this.name}: createBooking() not implemented`);
  }

  /** @returns {Promise<{ok: boolean, status: string}>} */
  async cancelBooking(_bookingId) {
    throw new Error(`${this.name}: cancelBooking() not implemented`);
  }

  /** @returns {Promise<Booking>} */
  async getBookingStatus(_bookingId) {
    throw new Error(`${this.name}: getBookingStatus() not implemented`);
  }
}

// ── Mock provider ────────────────────────────────────────────────────────
// Deterministic, in-memory. Exists to prove the complete loop end-to-end
// (including the exception path) without a real provider contract in place
// yet. A real adapter (UberDirectAdapter, BlackCarVendorAdapter, ...) is a
// second class with the same five methods, swapped in via ProviderRouter.register()
// -- nothing above the adapter layer changes.

const VEHICLE_CATALOG = Object.freeze({
  standard:  { label: 'Standard sedan', baseFare: 28, perMile: 2.1, capacity: 3 },
  suv:       { label: 'SUV',            baseFare: 42, perMile: 2.6, capacity: 5 },
  black_car: { label: 'Black car',      baseFare: 65, perMile: 3.4, capacity: 3 },
  van:       { label: 'Passenger van',  baseFare: 55, perMile: 2.9, capacity: 7 },
});

// No real mapping/distance API wired up yet -- airport transfers get a
// fixed estimated-mile band per service type so quotes are directionally
// sane for a demo. Swap for a real distance-matrix call when one's wired up;
// nothing else in this file depends on how the mileage number was derived.
function estimateMiles(request) {
  if (request.service === 'airport_transfer') return 18;
  if (request.service === 'hourly') return 0;
  return 8; // point_to_point default
}

class MockTransportProvider extends TransportProviderAdapter {
  constructor() {
    super('mock-transport');
    this._quotes = new Map();   // quoteId -> { quote, request }
    this._bookings = new Map(); // bookingId -> Booking
  }

  async searchAvailability(request) {
    const wanted = request.vehicle ? [request.vehicle] : Object.keys(VEHICLE_CATALOG);
    const vehicles = wanted.filter(v => {
      const cat = VEHICLE_CATALOG[v];
      return cat && cat.capacity >= (request.passengers || 1);
    });
    return { available: vehicles.length > 0, vehicles };
  }

  async getQuote(request) {
    if (!request || !request.pickup || !request.destination) {
      throw new Error('getQuote: pickup and destination are required');
    }
    const miles = estimateMiles(request);
    const vehicleClasses = request.vehicle ? [request.vehicle] : Object.keys(VEHICLE_CATALOG);

    const quotes = vehicleClasses
      .filter(v => VEHICLE_CATALOG[v] && VEHICLE_CATALOG[v].capacity >= (request.passengers || 1))
      .map(v => {
        const cat = VEHICLE_CATALOG[v];
        const amount = Math.round((cat.baseFare + cat.perMile * miles) * 100) / 100;
        const quoteId = genId('QT');
        const quote = {
          quoteId,
          provider: this.name,
          vehicle: v,
          vehicleLabel: cat.label,
          priceEstimate: { amount, currency: 'USD' },
          etaPickupMinutes: 12, // mock dispatch time
          etaTripMinutes: Math.round(miles * 2.2) || 10,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };
        this._quotes.set(quoteId, { quote, request });
        return quote;
      });

    if (!quotes.length) {
      throw new Error(`no ${this.name} vehicle available for ${request.passengers || 1} passengers`);
    }
    return quotes;
  }

  async createBooking({ quoteId, guest, notes } = {}) {
    const entry = this._quotes.get(quoteId);
    if (!entry) throw new Error(`unknown or expired quoteId: ${quoteId}`);
    if (new Date(entry.quote.expiresAt).getTime() < Date.now()) {
      throw new Error(`quote ${quoteId} has expired`);
    }

    const bookingId = genId('BK');
    const now = new Date().toISOString();
    const booking = {
      bookingId,
      provider: this.name,
      quoteId,
      status: 'confirmed',
      confirmationCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
      request: entry.request,
      quote: entry.quote,
      guest: guest || null,
      notes: notes || null,
      driver: null,
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'confirmed', at: now }],
    };
    this._bookings.set(bookingId, booking);
    return booking;
  }

  async cancelBooking(bookingId) {
    const booking = this._bookings.get(bookingId);
    if (!booking) throw new Error(`unknown bookingId: ${bookingId}`);
    if (booking.status === 'completed') {
      throw new Error(`booking ${bookingId} is already completed, cannot cancel`);
    }
    booking.status = 'cancelled';
    booking.updatedAt = new Date().toISOString();
    booking.history.push({ status: 'cancelled', at: booking.updatedAt });
    return { ok: true, status: booking.status };
  }

  async getBookingStatus(bookingId) {
    const booking = this._bookings.get(bookingId);
    if (!booking) throw new Error(`unknown bookingId: ${bookingId}`);
    return booking;
  }

  // ── Demo/test-only progression helper ──────────────────────────────────
  // Real providers push status changes via their own webhook; this mock
  // has no webhook to receive, so a harness (or the concierge-webhook
  // simulate route added in the routes slice) calls this directly to move
  // a booking through driver_assigned -> en_route -> picked_up -> completed,
  // or to inject the 'cancelled_by_driver' exception the design doc calls
  // out specifically. Not part of the adapter contract -- MockTransportProvider-
  // specific, real adapters won't have this method.
  simulateEvent(bookingId, status, note) {
    if (!BOOKING_STATUSES.includes(status)) {
      throw new Error(`simulateEvent: unknown status "${status}"`);
    }
    const booking = this._bookings.get(bookingId);
    if (!booking) throw new Error(`unknown bookingId: ${bookingId}`);

    booking.status = status;
    booking.updatedAt = new Date().toISOString();
    if (status === 'driver_assigned' && !booking.driver) {
      booking.driver = {
        name: 'J. Alvarez',
        vehicle: VEHICLE_CATALOG[booking.quote.vehicle]?.label || booking.quote.vehicle,
        plate: 'AZ-' + crypto.randomBytes(2).toString('hex').toUpperCase(),
        phone: '(480) 555-0148',
      };
    }
    booking.history.push({ status, at: booking.updatedAt, note: note || undefined });
    return booking;
  }
}

// ── Provider router ──────────────────────────────────────────────────────
// Keeps TSM Concierge provider-neutral: callers never import an adapter
// directly, they ask the router for quotes/bookings and it fans out to
// whichever providers are registered. Tracks which provider produced a
// given quoteId/bookingId so book()/cancel()/status() can route back to the
// right adapter without the caller having to know or care which one it was.

class ProviderRouter {
  constructor() {
    this._adapters = new Map();  // name -> adapter instance
    this._quoteOwner = new Map(); // quoteId -> provider name
    this._bookingOwner = new Map(); // bookingId -> provider name
  }

  register(adapter) {
    if (!(adapter instanceof TransportProviderAdapter)) {
      throw new Error('register() requires a TransportProviderAdapter instance');
    }
    this._adapters.set(adapter.name, adapter);
    return this;
  }

  listProviders() {
    return Array.from(this._adapters.keys());
  }

  /**
   * Fans a quote request out to every registered provider concurrently.
   * A provider that throws (no availability, API error, etc.) is dropped
   * from the results rather than failing the whole request -- one bad
   * provider should never block a guest from seeing quotes from the others.
   */
  async getQuotes(request) {
    const providers = Array.from(this._adapters.values());
    if (!providers.length) throw new Error('no transport providers registered');

    const settled = await Promise.allSettled(providers.map(p => p.getQuote(request)));
    const quotes = [];
    const errors = [];
    settled.forEach((result, i) => {
      const providerName = providers[i].name;
      if (result.status === 'fulfilled') {
        result.value.forEach(q => this._quoteOwner.set(q.quoteId, providerName));
        quotes.push(...result.value);
      } else {
        errors.push({ provider: providerName, error: result.reason?.message || String(result.reason) });
      }
    });

    quotes.sort((a, b) => a.priceEstimate.amount - b.priceEstimate.amount);
    return { quotes, errors };
  }

  async book(quoteId, bookingDetails) {
    const providerName = this._quoteOwner.get(quoteId);
    if (!providerName) throw new Error(`no provider found for quoteId ${quoteId} (expired or unknown)`);
    const adapter = this._adapters.get(providerName);
    const booking = await adapter.createBooking({ quoteId, ...bookingDetails });
    this._bookingOwner.set(booking.bookingId, providerName);
    return booking;
  }

  async cancel(bookingId) {
    const providerName = this._bookingOwner.get(bookingId);
    if (!providerName) throw new Error(`no provider found for bookingId ${bookingId}`);
    return this._adapters.get(providerName).cancelBooking(bookingId);
  }

  async status(bookingId) {
    const providerName = this._bookingOwner.get(bookingId);
    if (!providerName) throw new Error(`no provider found for bookingId ${bookingId}`);
    return this._adapters.get(providerName).getBookingStatus(bookingId);
  }

  /** Only meaningful for adapters that expose simulateEvent (MockTransportProvider). */
  simulateEvent(bookingId, status, note) {
    const providerName = this._bookingOwner.get(bookingId);
    if (!providerName) throw new Error(`no provider found for bookingId ${bookingId}`);
    const adapter = this._adapters.get(providerName);
    if (typeof adapter.simulateEvent !== 'function') {
      throw new Error(`provider ${providerName} does not support simulateEvent`);
    }
    return adapter.simulateEvent(bookingId, status, note);
  }
}

// Process-wide default router, pre-registered with the mock provider so
// routes/services can `require(...).defaultRouter` and get a working
// provider immediately. A real provider gets added the same way:
//   defaultRouter.register(new UberDirectAdapter({ apiKey: ... }));
const defaultRouter = new ProviderRouter().register(new MockTransportProvider());

module.exports = {
  BOOKING_STATUSES,
  TransportProviderAdapter,
  MockTransportProvider,
  ProviderRouter,
  defaultRouter,
};
