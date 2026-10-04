'use strict';

const VERSION = '13E.0';

function createAvailability(input = {}) {
  if (!input.workerId) {
    throw new Error('workerId is required');
  }

  return {
    availabilityId: String(
      input.availabilityId || `${input.workerId}-availability`
    ),
    workerId: String(input.workerId),
    windows: Array.isArray(input.windows)
      ? [...input.windows]
      : [],
    status: input.status || 'available',
    evidenceRefs: []
  };
}

function addWindow(availability, window) {
  if (!window || !window.start || !window.end) {
    throw new Error('availability window requires start and end');
  }

  return {
    ...availability,
    windows: [...availability.windows, { ...window }]
  };
}

module.exports = {
  VERSION,
  createAvailability,
  addWindow
};
