// event-bus-adapter.js
// Drop-in wiring for your real tsm-event-bus.js. This file assumes your
// event bus exposes `.subscribe(eventType, handler)` and `.publish(type, payload)` —
// adjust the two calls below to match your actual API if it differs
// (e.g. if it's `.on()` / `.emit()` instead).

const { processEvent } = require('./decision-service');
const { appendEvent } = require('./events-store');

/**
 * Call this once at startup, after your real event bus is initialized.
 *
 *   const eventBus = require('./tsm-event-bus');
 *   const { wireDecisionService } = require('./tsm-decision-service/event-bus-adapter');
 *   wireDecisionService(eventBus);
 */
function wireDecisionService(eventBus) {
  // Subscribe to everything ('*' or your bus's wildcard convention) so new
  // rules automatically apply to new event types without touching this file.
  eventBus.subscribe('*', async (event) => {
    try {
      // Make sure the event is durably logged before we evaluate rules
      // against it — the query layer rules depend on needs this event
      // to already be queryable.
      const stored = appendEvent(event);
      await processEvent(stored);
    } catch (err) {
      console.error('[decision-service] failed to process event:', event.type, err.message);
      // Deliberately does not throw — a decision-service failure should
      // never block the underlying business event from completing.
    }
  });

  console.log('[decision-service] wired into event bus');
}

module.exports = { wireDecisionService };
