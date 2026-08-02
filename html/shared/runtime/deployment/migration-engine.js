/**
 * migration-engine.js
 *
 * Runs ordered, idempotent data/config migrations when a tenant's
 * environment moves between pack versions -- e.g. renaming a relay domain
 * key, backfilling a new required field on existing evidence records.
 * Mirrors the numbered-script discipline already used in
 * scripts/runtime-migration/ itself, just scoped to per-tenant data
 * rather than the codebase.
 */

class MigrationEngine {
  constructor() {
    this._migrations = []; // { id, description, up }
  }

  register(id, description, upFn) {
    if (this._migrations.some((m) => m.id === id)) {
      throw new Error('Migration already registered: ' + id);
    }
    this._migrations.push({ id: id, description: description, up: upFn });
    return this;
  }

  async runPending(tenantId, appliedIds, context) {
    const applied = new Set(appliedIds || []);
    const results = [];

    for (const migration of this._migrations) {
      if (applied.has(migration.id)) continue;
      try {
        await migration.up(context);
        results.push({ id: migration.id, status: 'applied', appliedAt: new Date().toISOString() });
      } catch (err) {
        results.push({ id: migration.id, status: 'failed', error: String(err && err.message ? err.message : err) });
        break; // stop at first failure, mirroring the assert-guard-and-halt pattern
      }
    }

    return { tenantId: tenantId, results: results };
  }

  listRegistered() {
    return this._migrations.map((m) => ({ id: m.id, description: m.description }));
  }
}

const migrationEngine = new MigrationEngine();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MigrationEngine: MigrationEngine, migrationEngine: migrationEngine };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.migrationEngine = migrationEngine;
}
