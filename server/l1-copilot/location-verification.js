'use strict';
const LOCATION_TASK_TYPES = Object.freeze(['FOOT MOVE', 'ONBOARDING', 'OFFBOARDING']);

function normalizeLocation(v) {
  return String(v == null ? '' : v).toLowerCase().replace(/\s+/g, ' ').trim();
}

function evaluateLocationVerification(input) {
  const i = input || {};
  const taskType = String(i.taskType || '').toUpperCase().replace(/\s+/g, ' ').trim();
  const missing = [];
  const reasons = [];
  if (!LOCATION_TASK_TYPES.includes(taskType)) {
    return { applicable: false, locationVerified: false, missing, reasons };
  }
  const assetTag = normalizeLocation(i.assetTag);
  const from = normalizeLocation(i.fromLocation);
  const to = normalizeLocation(i.toLocation);
  const cmdb = normalizeLocation(i.cmdbLocation);
  if (!assetTag) missing.push('assetTag');
  if (!to) missing.push('toLocation');
  if (!cmdb) {
    missing.push('cmdbLocation');
    reasons.push('No CMDB location on the asset record; cannot verify.');
  }
  if (taskType === 'FOOT MOVE') {
    if (!from) missing.push('fromLocation');
    if (from && to && from === to) reasons.push('From and to locations are identical.');
  }
  if (cmdb && to && cmdb !== to) reasons.push('CMDB location does not match the expected location.');
  const locationVerified = missing.length === 0 && reasons.length === 0;
  return { applicable: true, taskType, locationVerified, missing, reasons };
}

module.exports = { LOCATION_TASK_TYPES, normalizeLocation, evaluateLocationVerification };
