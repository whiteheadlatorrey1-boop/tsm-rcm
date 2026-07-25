/**
 * Active Directory Digital Twin
 * In-memory simulation of a small AD environment: OUs, users, groups,
 * and domain controllers with replication. Supports fault injection
 * for demoing identity incidents (lockouts, MFA failures, replication
 * breaks, GPO issues) without touching a real domain.
 */

'use strict';

const FAULT_TYPES = ['account-lockout', 'password-expired', 'mfa-failure', 'replication-failure', 'gpo-corruption', 'clear'];

function buildInitialState() {
  return {
    updatedAt: new Date().toISOString(),
    domainControllers: [
      { id: 'dc-01', name: 'DC01.corp.local', role: 'PDC Emulator', status: 'up', replicationStatus: 'healthy' },
      { id: 'dc-02', name: 'DC02.corp.local', role: 'Replica', status: 'up', replicationStatus: 'healthy' },
    ],
    organizationalUnits: [
      { id: 'ou-sales', name: 'Sales', gpoStatus: 'applied' },
      { id: 'ou-eng', name: 'Engineering', gpoStatus: 'applied' },
      { id: 'ou-finance', name: 'Finance', gpoStatus: 'applied' },
    ],
    users: {
      'jdoe': { id: 'jdoe', name: 'Jane Doe', ou: 'ou-sales', status: 'active', mfaEnrolled: true, passwordExpiresInDays: 45 },
      'bsmith': { id: 'bsmith', name: 'Bob Smith', ou: 'ou-eng', status: 'active', mfaEnrolled: true, passwordExpiresInDays: 12 },
      'kchen': { id: 'kchen', name: 'Kim Chen', ou: 'ou-finance', status: 'active', mfaEnrolled: false, passwordExpiresInDays: 30 },
    },
    groups: [
      { id: 'grp-sales-all', name: 'Sales-All', members: ['jdoe'] },
      { id: 'grp-eng-all', name: 'Engineering-All', members: ['bsmith'] },
      { id: 'grp-finance-all', name: 'Finance-All', members: ['kchen'] },
    ],
    events: [],
  };
}

class ADTwin {
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
      case 'account-lockout': {
        const user = this.state.users[targetId];
        if (!user) throw new Error(`User not found: ${targetId}`);
        user.status = 'locked-out';
        this._logEvent(`Account locked out: ${user.name} (${user.id})`);
        break;
      }

      case 'password-expired': {
        const user = this.state.users[targetId];
        if (!user) throw new Error(`User not found: ${targetId}`);
        user.status = 'password-expired';
        user.passwordExpiresInDays = 0;
        this._logEvent(`Password expired: ${user.name} (${user.id})`);
        break;
      }

      case 'mfa-failure': {
        const user = this.state.users[targetId];
        if (!user) throw new Error(`User not found: ${targetId}`);
        user.mfaEnrolled = false;
        user.status = 'mfa-blocked';
        this._logEvent(`MFA failure blocking sign-in: ${user.name} (${user.id})`);
        break;
      }

      case 'replication-failure': {
        const dc = this.state.domainControllers.find((d) => d.id === targetId);
        if (!dc) throw new Error(`Domain controller not found: ${targetId}`);
        dc.replicationStatus = 'failed';
        this._logEvent(`Replication failure on ${dc.name}`);
        break;
      }

      case 'gpo-corruption': {
        const ou = this.state.organizationalUnits.find((o) => o.id === targetId);
        if (!ou) throw new Error(`OU not found: ${targetId}`);
        ou.gpoStatus = 'corrupted';
        this._logEvent(`GPO corruption detected in ${ou.name}`);
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

module.exports = { ADTwin, FAULT_TYPES };
