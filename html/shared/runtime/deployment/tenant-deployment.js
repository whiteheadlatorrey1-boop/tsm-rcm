/**
 * tenant-deployment.js
 *
 * Represents a single tenant's deployment record: which pack(s) they run,
 * which version, which environment tier, and current status. This is the
 * top-level object the rest of the deployment fabric operates on.
 */

const STORE_KEY = 'tsm.deployment.tenants.v1';

class TenantDeploymentStore {
  constructor() {
    this._mem = {};
    this._loaded = false;
  }

  _load() {
    if (this._loaded) return;
    this._loaded = true;
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORE_KEY);
        this._mem = raw ? JSON.parse(raw) : {};
      }
    } catch (e) {
      this._mem = {};
    }
  }

  _persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORE_KEY, JSON.stringify(this._mem));
      }
    } catch (e) {
      // ignore
    }
  }

  createTenant(tenantId, opts) {
    this._load();
    opts = opts || {};
    const record = {
      tenantId: tenantId,
      displayName: opts.displayName || tenantId,
      tier: opts.tier || 'standard',
      packs: [],
      status: 'provisioned',
      createdAt: new Date().toISOString(),
    };
    this._mem[tenantId] = record;
    this._persist();
    return record;
  }

  getTenant(tenantId) {
    this._load();
    return this._mem[tenantId] || null;
  }

  attachPack(tenantId, packId, version) {
    this._load();
    const tenant = this._mem[tenantId];
    if (!tenant) throw new Error('Unknown tenant: ' + tenantId);
    tenant.packs.push({ packId: packId, version: version, attachedAt: new Date().toISOString() });
    this._persist();
    return tenant;
  }

  setStatus(tenantId, status) {
    this._load();
    const tenant = this._mem[tenantId];
    if (!tenant) throw new Error('Unknown tenant: ' + tenantId);
    tenant.status = status;
    tenant.statusUpdatedAt = new Date().toISOString();
    this._persist();
    return tenant;
  }

  all() {
    this._load();
    return Object.keys(this._mem).map((id) => this._mem[id]);
  }
}

const tenantDeploymentStore = new TenantDeploymentStore();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TenantDeploymentStore: TenantDeploymentStore, tenantDeploymentStore: tenantDeploymentStore };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.tenantDeploymentStore = tenantDeploymentStore;
}
