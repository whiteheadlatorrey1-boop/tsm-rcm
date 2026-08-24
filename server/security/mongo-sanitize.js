// ── NoSQL operator injection guard ──────────────────────────────────────────
// The BPO/PM/concierge ledger functions in tsm-ledger-service.js build Mongo
// filters directly from request input, e.g.:
//   async function bpoListClients({ status } = {}) {
//     const query = {};
//     if (status) query.status = status;
//     return col.find(query)...
//   }
// Express's query-string parser (qs) turns bracket syntax into nested
// objects, so `GET /api/bpo/clients?status[$ne]=null` doesn't arrive as the
// string "null" — `req.query.status` is already the object `{ $ne: null }`.
// Passed straight into `col.find({ status: { $ne: null } })`, that's a live
// Mongo operator, not a value: it matches every client regardless of the
// caller's intended filter. The same risk applies to `req.body` (JSON, so an
// attacker can send literal `{"status": {"$ne": null}}` directly) on every
// upsert/create/update route — bpoUpsertWorkItem, bpoUpsertCase,
// bpoCreateClient, bpoUpdateClient, and the PM/concierge equivalents all
// spread caller-supplied fields toward `$set`.
//
// No new dependency for this — `deepSanitize` below is the same strategy
// `express-mongo-sanitize` uses (strip/reject `$`-prefixed keys and keys
// containing a literal `.`, since both are Mongo operator/path syntax, not
// valid application field names anywhere in this codebase), just scoped to
// exactly the four route prefixes that build queries this way.

/**
 * Recursively strips any object key that starts with '$' or contains '.'
 * Arrays are walked (not treated as objects), primitives pass through
 * unchanged. Mutates nothing — returns a cleaned copy, since req.query is a
 * getter-backed object in some Express/Node versions and in-place mutation
 * of req.params has historically been unreliable across Express majors.
 */
function deepSanitize(value) {
  if (Array.isArray(value)) {
    return value.map(deepSanitize);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) continue; // drop, don't just rename — no legitimate route param/body field needs these
      clean[key] = deepSanitize(value[key]);
    }
    return clean;
  }
  return value;
}

/**
 * Express middleware: sanitizes req.query, req.body, and req.params in
 * place. query/params are reassigned via Object.defineProperty because
 * Express 5's req.query is a read-only getter in some configurations;
 * body is a plain property and safe to reassign directly.
 */
function mongoSanitize() {
  return function mongoSanitizeMiddleware(req, res, next) {
    try {
      if (req.body && typeof req.body === 'object') {
        req.body = deepSanitize(req.body);
      }
      if (req.query && typeof req.query === 'object') {
        const cleaned = deepSanitize(req.query);
        try {
          req.query = cleaned;
        } catch (e) {
          // Express 5 makes req.query a getter-only accessor in some setups —
          // fall back to defineProperty rather than letting the assignment
          // throw and skip sanitization entirely.
          Object.defineProperty(req, 'query', { value: cleaned, writable: true, configurable: true });
        }
      }
      if (req.params && typeof req.params === 'object') {
        req.params = deepSanitize(req.params);
      }
      next();
    } catch (e) {
      res.status(400).json({ ok: false, error: 'Invalid request input' });
    }
  };
}

module.exports = { mongoSanitize, deepSanitize };
