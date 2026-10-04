'use strict';
// Per-candidate write capability. Separate derived key + domain label so a
// candidate token can never be mistaken for a tsm_session cookie.
const crypto = require('crypto');
const { verifySession, getCookie } = require('./require-auth');

function key() {
  const secret = process.env.TSM_SESSION_SECRET;
  if (!secret) throw new Error('TSM_SESSION_SECRET must be set');
  return crypto.createHmac('sha256', secret).update('candidate-write-v1').digest();
}

function signCandidateToken(candidateId) {
  if (typeof candidateId !== 'string' || !candidateId) throw new Error('candidateId required');
  return crypto.createHmac('sha256', key()).update(candidateId).digest('base64url');
}

function verifyCandidateToken(candidateId, token) {
  if (typeof candidateId !== 'string' || !candidateId) return false;
  if (typeof token !== 'string' || !token) return false;
  const expected = Buffer.from(signCandidateToken(candidateId));
  const given = Buffer.from(token);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

function enforced() { return process.env.CANDIDATE_WRITE_TOKEN_REQUIRED === '1'; }

// Guards writes to an EXISTING candidate. A create with no candidateId passes.
function requireCandidateWrite(req, res, next) {
  if (!enforced()) return next();
  const id = (req.params && req.params.id) || (req.body && req.body.candidateId);
  if (!id) return next();
  const session = verifySession(getCookie(req, 'tsm_session'));
  if (session && session.role === 'admin') return next();
  if (verifyCandidateToken(String(id), req.get('x-candidate-token'))) return next();
  return res.status(401).json({ error: 'candidate token required' });
}

module.exports = { signCandidateToken, verifyCandidateToken, requireCandidateWrite, enforced };
