/**
 * Microsoft 365 Digital Twin
 * In-memory simulation of an M365 tenant: mailboxes, licenses, and
 * core service health (Exchange, Teams, SharePoint, OneDrive).
 * Supports fault injection for demoing M365 incidents.
 */

'use strict';

const FAULT_TYPES = ['mailbox-full', 'license-exhausted', 'service-outage', 'sync-failure', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    services: [
      { id: 'exchange', name: 'Exchange Online', status: 'healthy' },
      { id: 'teams', name: 'Microsoft Teams', status: 'healthy' },
      { id: 'sharepoint', name: 'SharePoint Online', status: 'healthy' },
      { id: 'onedrive', name: 'OneDrive for Business', status: 'healthy' },
    ],
    mailboxes: {
      'jdoe@corp.local': { id: 'jdoe@corp.local', owner: 'Jane Doe', quotaGB: 50, usedGB: 22, status: 'healthy', syncStatus: 'synced' },
      'bsmith@corp.local': { id: 'bsmith@corp.local', owner: 'Bob Smith', quotaGB: 50, usedGB: 31, status: 'healthy', syncStatus: 'synced' },
      'kchen@corp.local': { id: 'kchen@corp.local', owner: 'Kim Chen', quotaGB: 50, usedGB: 18, status: 'healthy', syncStatus: 'synced' },
    },
    licenses: [
      { id: 'e3', name: 'Microsoft 365 E3', totalSeats: 50, assignedSeats: 38 },
      { id: 'e5', name: 'Microsoft 365 E5', totalSeats: 10, assignedSeats: 7 },
    ],
    events: [],
  };
}

class M365Twin {
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

  _logEvent(message) {
    this.state.events.unshift({ ts: new Date().toISOString(), message });
    this.state.events = this.state.events.slice(0, 25);
  }

  applyFault(type, targetId) {
    if (!FAULT_TYPES.includes(type)) {
      throw new Error(`Unknown fault type: ${type}`);
    }

    switch (type) {
      case 'mailbox-full': {
        const mbx = this.state.mailboxes[targetId];
        if (!mbx) throw new Error(`Mailbox not found: ${targetId}`);
        mbx.usedGB = mbx.quotaGB;
        mbx.status = 'full';
        this._logEvent(`Mailbox full: ${mbx.owner} (${mbx.id})`);
        break;
      }

      case 'license-exhausted': {
        const lic = this.state.licenses.find((l) => l.id === targetId);
        if (!lic) throw new Error(`License pool not found: ${targetId}`);
        lic.assignedSeats = lic.totalSeats;
        this._logEvent(`License pool exhausted: ${lic.name}`);
        break;
      }

      case 'service-outage': {
        const svc = this.state.services.find((s) => s.id === targetId);
        if (!svc) throw new Error(`Service not found: ${targetId}`);
        svc.status = 'outage';
        this._logEvent(`Service outage: ${svc.name}`);
        break;
      }

      case 'sync-failure': {
        const mbx = this.state.mailboxes[targetId];
        if (!mbx) throw new Error(`Mailbox not found: ${targetId}`);
        mbx.syncStatus = 'sync-failed';
        this._logEvent(`Sync failure on mailbox: ${mbx.owner} (${mbx.id})`);
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

module.exports = { M365Twin, FAULT_TYPES };
