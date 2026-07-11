/**
 * behavior-model.js
 *
 * Tracks lightweight, aggregate usage signals per user -- which panels get
 * opened, how often, and how recently -- to refine the role-based
 * defaults from role-intelligence.js into something closer to how this
 * specific person actually works. Intentionally coarse: counts and
 * timestamps only, no keystroke/content-level tracking.
 */

class BehaviorModel {
  constructor() {
    this._events = [];
  }

  recordEvent(userId, eventType, meta) {
    this._events.push({
      userId: userId,
      eventType: eventType,
      meta: meta || {},
      ts: new Date().toISOString(),
    });
    if (this._events.length > 10000) {
      this._events = this._events.slice(-10000);
    }
  }

  topPanelsForUser(userId, limit) {
    const counts = {};
    this._events
      .filter(function (e) { return e.userId === userId && e.eventType === 'panel_open'; })
      .forEach(function (e) {
        const panel = e.meta.panel || 'unknown';
        counts[panel] = (counts[panel] || 0) + 1;
      });
    return Object.keys(counts)
      .map(function (panel) { return { panel: panel, count: counts[panel] }; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, limit || 5);
  }

  lastSeen(userId) {
    const userEvents = this._events.filter(function (e) { return e.userId === userId; });
    if (!userEvents.length) return null;
    return userEvents[userEvents.length - 1].ts;
  }
}

const behaviorModel = new BehaviorModel();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BehaviorModel: BehaviorModel, behaviorModel: behaviorModel };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.behaviorModel = behaviorModel;
}
