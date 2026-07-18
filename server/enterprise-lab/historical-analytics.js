'use strict';

/**
 * Historical Analytics
 * Periodic snapshotting of SLA summary + chaos-engine cumulative counters
 * (NOT capped event-history length, which resets/truncates and would
 * understate activity over time) + AI-scoring summary + open vendor
 * ticket count. Snapshots are capped in memory (demo-scale, not a real
 * time-series store).
 */

class HistoricalAnalytics {
  constructor({ slaEngine, chaosEngine, vendorOpsTwin, aiScoring }) {
    this.slaEngine = slaEngine;
    this.chaosEngine = chaosEngine;
    this.vendorOpsTwin = vendorOpsTwin;
    this.aiScoring = aiScoring || null;
    this.snapshots = [];
    this.maxSnapshots = 200;
    this.intervalMs = 30000;
    this.timer = null;
    this.running = false;
  }

  _takeSnapshot() {
    const slaSummary = this.slaEngine.summary();
    const chaosStatus = this.chaosEngine.getStatus();
    const scoring = this.aiScoring ? this.aiScoring.summary() : null;
    const vendorState = this.vendorOpsTwin ? this.vendorOpsTwin.getState() : null;
    const openVendorTickets = vendorState
      ? (vendorState.tickets || []).filter((t) => t.status !== 'closed').length
      : null;

    const snapshot = {
      ts: new Date().toISOString(),
      sla: slaSummary,
      chaos: {
        running: chaosStatus.running,
        triggeredCumulative: chaosStatus.counters ? chaosStatus.counters.triggered : null,
        succeededCumulative: chaosStatus.counters ? chaosStatus.counters.succeeded : null,
        failedCumulative: chaosStatus.counters ? chaosStatus.counters.failed : null,
      },
      scoring,
      openVendorTickets,
    };
    this.snapshots.unshift(snapshot);
    this.snapshots = this.snapshots.slice(0, this.maxSnapshots);
    return snapshot;
  }

  snapshotNow() {
    return this._takeSnapshot();
  }

  start(intervalMs) {
    if (intervalMs) this.intervalMs = intervalMs;
    if (this.running) return this.getStatus();
    this.running = true;
    this._takeSnapshot();
    this.timer = setInterval(() => this._takeSnapshot(), this.intervalMs);
    if (this.timer.unref) this.timer.unref();
    return this.getStatus();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    return this.getStatus();
  }

  getStatus() {
    return { running: this.running, intervalMs: this.intervalMs, snapshotCount: this.snapshots.length };
  }

  getSnapshots(limit) {
    const n = limit ? parseInt(limit, 10) : undefined;
    return n ? this.snapshots.slice(0, n) : this.snapshots;
  }

  latest() {
    return this.snapshots[0] || null;
  }
}

module.exports = { HistoricalAnalytics };
