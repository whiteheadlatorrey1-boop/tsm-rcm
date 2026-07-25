// middleware/require-api-key.js
//
// Shared-secret gate for mutating endpoints. Single source of truth so
// server.js and any routes/ module (e.g. rcm-relay.js) enforce the same
// check instead of maintaining separate copies that can drift.

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.TSM_API_KEY) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }
  next();
}

module.exports = { requireApiKey };
