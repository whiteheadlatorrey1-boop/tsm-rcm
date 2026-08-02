/**
 * pack-registry.js
 *
 * In-memory (or localStorage-backed) registry of built solution packs.
 * The existing Marketplace UI reads from this registry to list what's
 * available; Customer Provisioning reads from it to know what to install.
 */

const STORE_KEY = 'tsm.solutionPacks.registry.v1';

class PackRegistry {
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

  register(manifest, validateManifest) {
    this._load();
    const result = validateManifest(manifest);
    if (!result.valid) {
      throw new Error('Cannot register invalid pack: ' + result.errors.join('; '));
    }
    this._mem[manifest.packId] = manifest;
    this._persist();
    return manifest;
  }

  get(packId) {
    this._load();
    return this._mem[packId] || null;
  }

  listByVertical(vertical) {
    this._load();
    return Object.keys(this._mem)
      .map((id) => this._mem[id])
      .filter((p) => !vertical || p.vertical === vertical);
  }

  all() {
    this._load();
    return Object.keys(this._mem).map((id) => this._mem[id]);
  }
}

const packRegistry = new PackRegistry();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PackRegistry: PackRegistry, packRegistry: packRegistry };
}
if (typeof window !== 'undefined') {
  window.TSM = window.TSM || {};
  window.TSM.packRegistry = packRegistry;
}
