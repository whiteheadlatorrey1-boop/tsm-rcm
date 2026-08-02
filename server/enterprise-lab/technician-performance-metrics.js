'use strict';

/**
 * Technician Performance Metrics
 * NOTE: this is a simulated round-robin assignment layer on top of Chaos
 * Engine incidents — there's no real ticketing/dispatch system underneath.
 * It exists to demo how a technician-performance view would consume the
 * digital-twin incident stream, not to model real staffing.
 */

const ROSTER = [
  { id: 'tech-1', name: 'J. Alvarez' },
  { id: 'tech-2', name: 'M. Chen' },
  { id: 'tech-3', name: 'R. Patel' },
  { id: 'tech-4', name: 'S. Okafor' },
];

class TechnicianMetrics {
  constructor(roster) {
    this.roster = roster || ROSTER;
    this.assignments = [];
    this._nextIndex = 0;
    this._nextId = 1;
  }

  _nextTech() {
    const tech = this.roster[this._nextIndex % this.roster.length];
    this._nextIndex += 1;
    return tech;
  }

  // Call with the result of chaosEngine.triggerOnce()/triggerRandom().
  recordIncident(chaosResult) {
    if (!chaosResult || chaosResult.ok !== true) return null;
    const tech = this._nextTech();
    const assignment = {
      id: `assign-${this._nextId++}`,
      techId: tech.id,
      techName: tech.name,
      module: chaosResult.module,
      type: chaosResult.type,
      targetId: chaosResult.targetId,
      assignedAt: chaosResult.ts,
      resolved: false,
      resolvedAt: null,
      resolutionMinutes: null,
    };
    this.assignments.unshift(assignment);
    this.assignments = this.assignments.slice(0, 200);
    return assignment;
  }

  resolve(assignmentId) {
    const a = this.assignments.find((x) => x.id === assignmentId);
    if (!a) return null;
    if (a.resolved) return a;
    a.resolved = true;
    a.resolvedAt = new Date().toISOString();
    a.resolutionMinutes = Number(
      ((new Date(a.resolvedAt).getTime() - new Date(a.assignedAt).getTime()) / 60000).toFixed(2)
    );
    return a;
  }

  listAssignments(techId) {
    return techId ? this.assignments.filter((a) => a.techId === techId) : this.assignments;
  }

  metrics() {
    const byTech = {};
    for (const tech of this.roster) {
      byTech[tech.id] = {
        techId: tech.id,
        techName: tech.name,
        assigned: 0,
        resolved: 0,
        open: 0,
        totalResolutionMinutes: 0,
        avgResolutionMinutes: null,
      };
    }
    for (const a of this.assignments) {
      const bucket = byTech[a.techId];
      if (!bucket) continue;
      bucket.assigned += 1;
      if (a.resolved) {
        bucket.resolved += 1;
        bucket.totalResolutionMinutes += a.resolutionMinutes || 0;
      } else {
        bucket.open += 1;
      }
    }
    return Object.values(byTech).map((b) => ({
      ...b,
      avgResolutionMinutes: b.resolved ? Number((b.totalResolutionMinutes / b.resolved).toFixed(2)) : null,
    }));
  }
}

module.exports = { TechnicianMetrics, ROSTER };
