/**
 * Device Digital Twin
 * In-memory simulation of a small endpoint fleet: laptops, desktops, and
 * printers assigned across the same users/OUs as the AD twin. Supports
 * fault injection for demoing hardware/endpoint incidents (disk full,
 * BSOD, battery failure, driver crash, failed patch, printer faults).
 */

'use strict';

const FAULT_TYPES = [
  'disk-full',
  'bsod-crash',
  'battery-failure',
  'driver-crash',
  'patch-failure',
  'printer-jam',
  'printer-offline',
  'clear',
];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    endpoints: [
      { id: 'lap-jdoe', name: 'DELL-LAP-JDOE', type: 'laptop', assignedTo: 'jdoe', status: 'healthy', diskFreePct: 62, batteryHealthPct: 91, patchStatus: 'current' },
      { id: 'lap-bsmith', name: 'DELL-LAP-BSMITH', type: 'laptop', assignedTo: 'bsmith', status: 'healthy', diskFreePct: 48, batteryHealthPct: 87, patchStatus: 'current' },
      { id: 'dsk-kchen', name: 'DELL-DSK-KCHEN', type: 'desktop', assignedTo: 'kchen', status: 'healthy', diskFreePct: 71, batteryHealthPct: null, patchStatus: 'current' },
      { id: 'dsk-finance-01', name: 'DELL-DSK-FIN01', type: 'desktop', assignedTo: null, status: 'healthy', diskFreePct: 55, batteryHealthPct: null, patchStatus: 'current' },
      { id: 'prn-3f', name: 'HP-PRN-3F', type: 'printer', assignedTo: null, status: 'healthy', tonerPct: 78, patchStatus: 'current' },
      { id: 'prn-hq-lobby', name: 'HP-PRN-LOBBY', type: 'printer', assignedTo: null, status: 'healthy', tonerPct: 34, patchStatus: 'current' },
    ],
    events: [],
  };
}

const CATEGORY_BY_TYPE = { laptop: 'Dell Laptop', desktop: 'Desktop', printer: 'Printer' };

class DeviceTwin {
  constructor() {
    this.state = buildInitialState();
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = buildInitialState();
    return this.state;
  }

  _findEndpoint(id) {
    return this.state.endpoints.find((e) => e.id === id) || null;
  }

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  /**
   * Apply a fault to the twin.
   * @param {string} type - one of FAULT_TYPES
   * @param {string} [targetId] - endpoint id
   */
  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'disk-full': {
        const ep = this._findEndpoint(targetId);
        if (!ep || !('diskFreePct' in ep)) throw new Error(`Endpoint not found or has no disk: ${targetId}`);
        ep.diskFreePct = 1;
        ep.status = 'disk-full';
        this._logEvent(`Disk full on ${ep.name} (${ep.id})`);
        break;
      }

      case 'bsod-crash': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type === 'printer') throw new Error(`Endpoint not found or not a PC: ${targetId}`);
        ep.status = 'bsod-crash';
        this._logEvent(`BSOD crash on ${ep.name} (${ep.id})`);
        break;
      }

      case 'battery-failure': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type !== 'laptop') throw new Error(`Endpoint not found or not a laptop: ${targetId}`);
        ep.batteryHealthPct = 0;
        ep.status = 'battery-failure';
        this._logEvent(`Battery failure on ${ep.name} (${ep.id})`);
        break;
      }

      case 'driver-crash': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type === 'printer') throw new Error(`Endpoint not found or not a PC: ${targetId}`);
        ep.status = 'driver-crash';
        this._logEvent(`Driver crash on ${ep.name} (${ep.id})`);
        break;
      }

      case 'patch-failure': {
        const ep = this._findEndpoint(targetId);
        if (!ep) throw new Error(`Endpoint not found: ${targetId}`);
        ep.patchStatus = 'failed';
        ep.status = 'patch-failure';
        this._logEvent(`Patch deployment failed on ${ep.name} (${ep.id})`);
        break;
      }

      case 'printer-jam': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type !== 'printer') throw new Error(`Endpoint not found or not a printer: ${targetId}`);
        ep.status = 'paper-jam';
        this._logEvent(`Paper jam on ${ep.name} (${ep.id})`);
        break;
      }

      case 'printer-offline': {
        const ep = this._findEndpoint(targetId);
        if (!ep || ep.type !== 'printer') throw new Error(`Endpoint not found or not a printer: ${targetId}`);
        ep.status = 'offline';
        this._logEvent(`${ep.name} (${ep.id}) went offline`);
        break;
      }

      case 'clear': {
        this.reset();
        this._logEvent('Twin state reset to healthy baseline');
        break;
      }

      default:
        break;
    }

    this.state.updatedAt = new Date().toISOString();
    return this.state;
  }
}

module.exports = { DeviceTwin, FAULT_TYPES, CATEGORY_BY_TYPE };
