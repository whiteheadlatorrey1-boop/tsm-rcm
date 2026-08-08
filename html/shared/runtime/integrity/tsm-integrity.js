/**
 * TSM Integrity — SHA-256 payload signing + verification
 * html/shared/runtime/integrity/tsm-integrity.js
 *
 * Adds a tamper-evident layer to relay/mission payloads and stored JSON
 * models. This is NOT encryption and NOT an auth/access-control layer —
 * it's a checksum: it tells a receiver "this payload is exactly what the
 * sender produced" and tells a loader "this stored blob hasn't been
 * hand-edited or corrupted since it was last signed."
 *
 * Rollout scope (intentional, per current phase): rcm-os, sentinel-center,
 * hotelops only. Other verticals are untouched until this pattern is
 * validated.
 *
 * Uses the browser's native Web Crypto API (crypto.subtle.digest), no
 * external dependency, no key management — this is integrity, not secrecy.
 *
 * ── Usage ──────────────────────────────────────────────────────────────
 *   const signed = await TSMIntegrity.sign(payload, { module: 'rcm-os' });
 *   localStorage.setItem(KEY, JSON.stringify(signed));
 *
 *   const stored = JSON.parse(localStorage.getItem(KEY));
 *   const result = await TSMIntegrity.verify(stored);
 *   if (!result.ok) { ...flag as tampered/corrupted, still non-fatal... }
 *
 * Include this script BEFORE any file that calls TSMIntegrity.*.
 */
(function (global) {
  'use strict';

  var ALGO = 'SHA-256';

  // ── Deterministic stringify ──────────────────────────────────────────
  // JSON.stringify's key order depends on insertion order, which would
  // make the same logical object hash differently across browsers/runs.
  // Sort keys recursively so signing is reproducible. Also mirrors
  // JSON.stringify's own undefined-handling exactly (drop object keys,
  // coerce array elements to null) — see note on withoutIntegrity below
  // for why that specific detail matters.
  function stableStringify(value) {
    if (value === undefined) return undefined; // caller decides how to treat a missing value
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return '[' + value.map(function (v) {
        var s = stableStringify(v);
        return s === undefined ? 'null' : s;
      }).join(',') + ']';
    }
    var keys = Object.keys(value).sort();
    var parts = [];
    keys.forEach(function (k) {
      var s = stableStringify(value[k]);
      if (s === undefined) return;
      parts.push(JSON.stringify(k) + ':' + s);
    });
    return '{' + parts.join(',') + '}';
  }

  function hasSubtleCrypto() {
    return !!(global.crypto && global.crypto.subtle && global.crypto.subtle.digest);
  }

  async function sha256Hex(str) {
    if (!hasSubtleCrypto()) {
      throw new Error('crypto.subtle unavailable (requires a secure context: https:// or localhost)');
    }
    var enc = new TextEncoder().encode(str);
    var buf = await global.crypto.subtle.digest('SHA-256', enc);
    var bytes = Array.from(new Uint8Array(buf));
    return bytes.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  // Strip any existing _integrity block before hashing, so re-signing an
  // already-signed payload is idempotent (hashes the content, not the seal).
  function withoutIntegrity(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    var rest = {};
    Object.keys(payload).forEach(function (k) {
      if (k !== '_integrity') rest[k] = payload[k];
    });
    return rest;
  }

  /**
   * Sign a JSON-serializable payload. Returns a NEW object (does not
   * mutate the input) with an `_integrity` block attached.
   * @param {object} payload
   * @param {object} [meta] optional { module: 'rcm-os' | 'sentinel-center' | 'hotelops' }
   */
  async function sign(payload, meta) {
    // Snapshot via a real JSON.stringify/parse round trip, SYNCHRONOUSLY,
    // before the async digest call below. crypto.subtle.digest yields the
    // event loop; if we held a live reference to payload's nested objects
    // across that await, a concurrent mutation elsewhere on the page (a
    // live KPI tick, another handler) could change them between "hash
    // computed" and "object returned/stored" — producing a signature that
    // doesn't match what's actually persisted a moment later. Cloning up
    // front makes the hash and the returned object provably the same data.
    var body = JSON.parse(JSON.stringify(withoutIntegrity(payload)));
    var hash = await sha256Hex(stableStringify(body));
    body._integrity = {
      algo: ALGO,
      hash: hash,
      signedAt: new Date().toISOString(),
      module: (meta && meta.module) || null
    };
    return body;
  }

  /**
   * Verify a previously-signed payload against its own claimed hash.
   * Non-throwing — always resolves to a result object so callers can
   * treat verification failures as non-fatal (log/flag, don't crash).
   * @param {object} payload
   * @returns {Promise<{ok: boolean, reason?: string, expected?: string, actual?: string, signedAt?: string, module?: string}>}
   */
  async function verify(payload) {
    if (!payload || typeof payload !== 'object') {
      return { ok: false, reason: 'no-payload' };
    }
    if (!payload._integrity || !payload._integrity.hash) {
      return { ok: false, reason: 'unsigned' };
    }
    try {
      var claimed = payload._integrity.hash;
      // Same reasoning as sign(): snapshot synchronously before the await.
      var body = JSON.parse(JSON.stringify(withoutIntegrity(payload)));
      var actual = await sha256Hex(stableStringify(body));
      if (actual === claimed) {
        return { ok: true, hash: actual, signedAt: payload._integrity.signedAt, module: payload._integrity.module };
      }
      return { ok: false, reason: 'mismatch', expected: claimed, actual: actual, signedAt: payload._integrity.signedAt, module: payload._integrity.module };
    } catch (e) {
      return { ok: false, reason: 'error', error: e.message };
    }
  }

  /**
   * Convenience: verify and console.warn a consistent message on failure.
   * Returns the same result object as verify(). Never throws.
   */
  async function verifyAndWarn(payload, label) {
    var result = await verify(payload);
    if (!result.ok) {
      console.warn('[tsm-integrity]' + (label ? ' [' + label + ']' : '') + ' verification failed:', result.reason, result);
    }
    return result;
  }

  global.TSMIntegrity = {
    ALGO: ALGO,
    sign: sign,
    verify: verify,
    verifyAndWarn: verifyAndWarn,
    sha256Hex: sha256Hex,
    stableStringify: stableStringify,
    hasSubtleCrypto: hasSubtleCrypto
  };
})(window);
