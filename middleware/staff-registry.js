// ── STAFF REGISTRY: internal manager/analyst accounts ──────────────────────
// Mirrors middleware/client-registry.js's access-code pattern exactly, for
// internal TSM staff rather than external clients. Each staff member gets
// one admin-assigned access code, HMAC-hashed at rest, never stored in
// plaintext. On successful login the session payload carries
// { role: 'manager'|'analyst', staffId, label } so downstream routes can
// check role without trusting anything the browser sends.
//
// Roles: 'admin' stays password-based via TSM_ADMIN_PASSWORD (unchanged,
// see server.js /api/auth/login) — there is intentionally no admin path
// through this registry. 'client' stays in client-registry.js — clients are
// scoped to their own workspace (tsm-doc-search-multi.html) and must never
// gain access to internal staff tooling via this registry.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REGISTRY_PATH = path.join(DATA_DIR, 'staff.json');

const STAFF_ROLES = ['manager', 'analyst'];

function slugify(label) {
  const s = (label || '').toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'unassigned';
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REGISTRY_PATH)) fs.writeFileSync(REGISTRY_PATH, '[]');
}

function loadStaff() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveStaff(list) {
  ensureStore();
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(list, null, 2));
}

function hashCode(code) {
  if (!process.env.TSM_SESSION_SECRET) {
    throw new Error('TSM_SESSION_SECRET not set — cannot hash access codes safely');
  }
  return crypto.createHmac('sha256', process.env.TSM_SESSION_SECRET)
    .update(code).digest('hex');
}

// Generates a readable, high-entropy code, e.g. "K7RM-QX2P-9FHL"
function generateCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I ambiguity
  const groups = [];
  for (let g = 0; g < 3; g++) {
    let s = '';
    for (let i = 0; i < 4; i++) s += alphabet[crypto.randomInt(alphabet.length)];
    groups.push(s);
  }
  return groups.join('-');
}

// Returns { id, label, role, createdAt, active } — never the plaintext code.
function toSafe(staff) {
  const { id, label, role, createdAt, active } = staff;
  return { id, label, role, createdAt, active };
}

function listStaffSafe() {
  return loadStaff().map(toSafe);
}

// Creates a new staff account, generates its access code, and returns the
// plaintext code exactly once (caller must hand it to the staff member now —
// it cannot be recovered later, only rotated).
function createStaff(label, role) {
  const clean = (label || '').toString().trim();
  if (!clean) throw new Error('label required');
  if (!STAFF_ROLES.includes(role)) {
    throw new Error(`role must be one of: ${STAFF_ROLES.join(', ')}`);
  }
  const id = slugify(clean);
  const list = loadStaff();
  if (list.find(s => s.id === id)) {
    throw new Error(`Staff account "${id}" already exists`);
  }
  const code = generateCode();
  list.push({
    id,
    label: clean,
    role,
    codeHash: hashCode(code),
    createdAt: Date.now(),
    active: true,
  });
  saveStaff(list);
  return { staff: toSafe(list[list.length - 1]), accessCode: code };
}

function rotateCode(staffId) {
  const list = loadStaff();
  const staff = list.find(s => s.id === staffId);
  if (!staff) throw new Error('Staff account not found');
  const code = generateCode();
  staff.codeHash = hashCode(code);
  staff.active = true;
  saveStaff(list);
  return { staff: toSafe(staff), accessCode: code };
}

function setActive(staffId, active) {
  const list = loadStaff();
  const staff = list.find(s => s.id === staffId);
  if (!staff) throw new Error('Staff account not found');
  staff.active = !!active;
  saveStaff(list);
  return toSafe(staff);
}

// Looks up a staff member by plaintext access code using a timing-safe
// compare against every active account's stored digest. Returns the staff
// record (safe form, includes role) or null.
function findStaffByCode(code) {
  if (!code) return null;
  let digest;
  try {
    digest = hashCode(code);
  } catch {
    return null;
  }
  const digestBuf = Buffer.from(digest);
  const list = loadStaff();
  for (const s of list) {
    if (!s.active) continue;
    const storedBuf = Buffer.from(s.codeHash);
    if (storedBuf.length === digestBuf.length && crypto.timingSafeEqual(storedBuf, digestBuf)) {
      return toSafe(s);
    }
  }
  return null;
}

module.exports = {
  STAFF_ROLES,
  slugify,
  listStaffSafe,
  createStaff,
  rotateCode,
  setActive,
  findStaffByCode,
};
