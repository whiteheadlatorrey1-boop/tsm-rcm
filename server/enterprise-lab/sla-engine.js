'use strict';

const SLA_RULES = [
  { match: /Account locked out/i, category: 'ad:account-lockout', hours: 1 },
  { match: /Password expired/i, category: 'ad:password-expired', hours: 4 },
  { match: /MFA failure/i, category: 'ad:mfa-failure', hours: 1 },
  { match: /Replication failure/i, category: 'ad:replication-failure', hours: 2 },
  { match: /GPO corruption/i, category: 'ad:gpo-corruption', hours: 4 },
  { match: /Mailbox full/i, category: 'm365:mailbox-full', hours: 4 },
  { match: /License pool exhausted/i, category: 'm365:license-exhausted', hours: 24 },
  { match: /Service outage/i, category: 'm365:service-outage', hours: 1 },
  { match: /Sync failure/i, category: 'm365:sync-failure', hours: 4 },
  { match: /BGP session flapping/i, category: 'network:bgp-flap', hours: 1 },
  { match: /is now unreachable/i, category: 'network:link-down', hours: 1 },
  { match: /Link .* went down/i, category: 'network:link-down', hours: 1 },
  { match: /Packet loss injected/i, category: 'network:packet-loss', hours: 2 },
  { match: /Latency spike injected/i, category: 'network:latency-spike', hours: 4 },
  { match: /HA failed: no surviving host/i, category: 'vmware:host-down-critical', hours: 0.5 },
  { match: /^Host .* went down/i, category: 'vmware:host-down', hours: 1 },
  { match: /HA restarted .*'s VMs on/i, category: 'vmware:host-down', hours: 1 },
  { match: /network-partitioned from vCenter/i, category: 'vmware:network-partition', hours: 1 },
  { match: /Datastore .* reached capacity/i, category: 'vmware:datastore-full', hours: 4 },
];

const RESET_MATCH = /reset to healthy baseline/i;

function classify(message) {
  for (const rule of SLA_RULES) {
    if (rule.match.test(message)) return rule;
  }
  return null;
}

class SLAEngine {
  constructor(twins, vendorOps) {
    this.twins = twins || {};
    this.vendorOps = vendorOps || null;
  }

  _statusFor(hoursElapsed, slaHours) {
    const ratio = hoursElapsed / slaHours;
    if (ratio >= 1) return 'breached';
    if (ratio >= 0.8) return 'at-risk';
    return 'on-track';
  }

  evaluate() {
    const now = Date.now();
    const issues = [];

    for (const [name, twin] of Object.entries(this.twins)) {
      const state = twin.getState();
      const events = state.events || [];
      if (!events.length) continue;
      const latest = events[0];
      if (RESET_MATCH.test(latest.message)) continue;
      const rule = classify(latest.message);
      if (!rule) continue;
      const hoursElapsed = (now - new Date(latest.ts).getTime()) / 3600000;
      issues.push({
        module: name,
        message: latest.message,
        ts: latest.ts,
        hoursElapsed: Number(hoursElapsed.toFixed(2)),
        slaHours: rule.hours,
        status: this._statusFor(hoursElapsed, rule.hours),
      });
    }

    if (this.vendorOps) {
      const vState = this.vendorOps.getState();
      for (const ticket of vState.tickets || []) {
        if (ticket.status === 'closed') continue;
        const vendor = (vState.vendors || []).find((v) => v.id === ticket.vendorId);
        const slaHours = vendor ? vendor.slaTargetHours : 24;
        const hoursElapsed = (now - new Date(ticket.openedAt).getTime()) / 3600000;
        issues.push({
          module: 'vendor',
          message: `${ticket.subject} (${ticket.id})`,
          ts: ticket.openedAt,
          hoursElapsed: Number(hoursElapsed.toFixed(2)),
          slaHours,
          status: ticket.slaBreached ? 'breached' : this._statusFor(hoursElapsed, slaHours),
        });
      }
    }

    return issues;
  }

  summary() {
    const issues = this.evaluate();
    const summary = { onTrack: 0, atRisk: 0, breached: 0, total: issues.length };
    for (const issue of issues) {
      if (issue.status === 'on-track') summary.onTrack += 1;
      else if (issue.status === 'at-risk') summary.atRisk += 1;
      else if (issue.status === 'breached') summary.breached += 1;
    }
    return summary;
  }
}

module.exports = { SLAEngine };
