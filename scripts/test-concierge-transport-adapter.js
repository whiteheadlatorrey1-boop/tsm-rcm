// One-off smoke test for server/services/concierge-transport-adapter.js.
// Run from repo root: node scripts/test-concierge-transport-adapter.js
//
// Pure in-memory (MockTransportProvider) -- no Mongo, no network, no
// credentials. Proves two things end-to-end:
//   1. The happy path: quote -> book -> driver assigned -> en route ->
//      picked up -> completed.
//   2. The exception path the design doc calls out specifically: a driver
//      cancels after being assigned, and TSM can detect that and re-book
//      against a fresh quote.

const { ProviderRouter, MockTransportProvider } = require('../server/services/concierge-transport-adapter');

function assert(cond, msg) {
  if (!cond) {
    console.error(`[test-concierge-transport-adapter] FAIL: ${msg}`);
    process.exitCode = 1;
    throw new Error(msg);
  }
}

async function main() {
  const router = new ProviderRouter().register(new MockTransportProvider());
  console.log('[test] registered providers:', router.listProviders());

  const request = {
    service: 'airport_transfer',
    pickup: { address: '123 Desert Ridge Blvd, Scottsdale, AZ' },
    destination: { address: 'PHX Sky Harbor', airportCode: 'PHX' },
    date: '2026-08-14',
    time: '06:00',
    passengers: 2,
    bags: 3,
  };

  // ── Happy path ──────────────────────────────────────────────────────
  console.log('\n[test] --- happy path ---');
  const { quotes, errors } = await router.getQuotes(request);
  assert(errors.length === 0, `expected no provider errors, got ${JSON.stringify(errors)}`);
  assert(quotes.length > 0, 'expected at least one quote');
  console.log('[test] got', quotes.length, 'quotes, cheapest:', quotes[0].vehicle, quotes[0].priceEstimate);

  const chosen = quotes[0];
  const booking = await router.book(chosen.quoteId, { guest: { name: 'T. Whitehead' } });
  assert(booking.status === 'confirmed', `expected status confirmed, got ${booking.status}`);
  console.log('[test] booked:', booking.bookingId, booking.confirmationCode);

  await router.simulateEvent(booking.bookingId, 'driver_assigned');
  await router.simulateEvent(booking.bookingId, 'en_route');
  await router.simulateEvent(booking.bookingId, 'picked_up');
  const completed = await router.simulateEvent(booking.bookingId, 'completed');
  assert(completed.status === 'completed', 'expected final status completed');
  assert(completed.history.length === 5, `expected 5 history entries, got ${completed.history.length}`); // confirmed + 4 sim events
  console.log('[test] happy path OK — full status history:', completed.history.map(h => h.status).join(' -> '));

  // ── Exception path: driver cancels after assignment ────────────────
  console.log('\n[test] --- exception path (driver cancels) ---');
  const { quotes: quotes2 } = await router.getQuotes(request);
  const booking2 = await router.book(quotes2[0].quoteId, { guest: { name: 'T. Whitehead' } });
  await router.simulateEvent(booking2.bookingId, 'driver_assigned');
  const cancelled = await router.simulateEvent(booking2.bookingId, 'cancelled_by_driver', 'Driver reported vehicle issue');
  assert(cancelled.status === 'cancelled_by_driver', 'expected status cancelled_by_driver');
  console.log('[test] booking', booking2.bookingId, 'hit exception:', cancelled.status, '-', cancelled.history.at(-1).note);

  // Prove re-booking against a fresh quote works (this is what a
  // "🔴 CONCIERGE ESCALATION" handler would do after the exception fires).
  const { quotes: rebookQuotes } = await router.getQuotes(request);
  const rebooking = await router.book(rebookQuotes[0].quoteId, { guest: { name: 'T. Whitehead' }, notes: 'Rebooked after driver cancellation' });
  assert(rebooking.status === 'confirmed', 'expected rebooking to succeed with status confirmed');
  console.log('[test] rebooked successfully:', rebooking.bookingId);

  // ── Contract checks ─────────────────────────────────────────────────
  console.log('\n[test] --- adapter contract checks ---');
  let threw = false;
  try {
    await router.status('BK-NOT-A-REAL-ID-000000');
  } catch (e) {
    threw = true;
  }
  assert(threw, 'expected status() on unknown bookingId to throw');
  console.log('[test] unknown bookingId correctly rejected');

  console.log('\n[test-concierge-transport-adapter] ALL PASS');
}

main().catch((e) => {
  console.error('[test-concierge-transport-adapter] FAIL:', e.message);
  process.exitCode = 1;
});
