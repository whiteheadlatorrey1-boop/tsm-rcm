// ── CLIENT REGISTRY: per-client access codes + server-side identity ────────
// Each client gets one admin-assigned access code. The code itself is never
// stored in plaintext — only its HMAC digest (keyed by TSM_SESSION_SECRET,
// same secret already used to sign session cookies). On successful login the
// client's session payload carries { role: 'client', clientId, label } so
// every downstream route can scope data without trusting anything the
// browser sends.
//
// clientId format matches slugifyClient() in html/tsm-doc-search-multi.html
// so a client's server-side identity lines up with their local workspace key.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const REGISTRY_PATH = path.join(DATA_DIR, 'clients.json');

function slugify(label) {
  const s = (label || '').toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'unassigned';
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(REGISTRY_PATH)) fs.writeFileSync(REGISTRY_PATH, '[]');
}

function loadClients() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function saveClients(list) {
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

// Returns { id, label, createdAt, active } — never the plaintext code.
function toSafe(client) {
  const { id, label, createdAt, active } = client;
  return { id, label, createdAt, active };
}

function listClientsSafe() {
  return loadClients().map(toSafe);
}

// True if a login record already exists for this id.
function idExists(id) {
  if (!id) return false;
  return loadClients().some(c => c.id === id);
}

// Returns the safe (non-secret) record for a given id, or null if none exists.
function getSafe(id) {
  if (!id) return null;
  const client = loadClients().find(c => c.id === id);
  return client ? toSafe(client) : null;
}

// Creates a new client, generates its access code, and returns the
// plaintext code exactly once (caller must hand it to the client now —
// it cannot be recovered later, only rotated).
function createClient(label) {
  const clean = (label || '').toString().trim();
  if (!clean) throw new Error('label required');
  const id = slugify(clean);
  return createClientWithId(id, clean);
}

// Same as createClient, but the id is supplied by the caller instead of
// being derived from the label — used when the login record needs to line
// up with an id that already exists elsewhere (e.g. a ledger client id).
function createClientWithId(id, label) {
  const cleanId = (id || '').toString().trim();
  if (!cleanId) throw new Error('id required');
  const clean = (label || '').toString().trim() || cleanId;
  const list = loadClients();
  if (list.find(c => c.id === cleanId)) {
    throw new Error(`Client "${cleanId}" already exists`);
  }
  const code = generateCode();
  list.push({
    id: cleanId,
    label: clean,
    codeHash: hashCode(code),
    createdAt: Date.now(),
    active: true,
  });
  saveClients(list);
  return { client: toSafe(list[list.length - 1]), accessCode: code };
}

function rotateCode(clientId) {
  const list = loadClients();
  const client = list.find(c => c.id === clientId);
  if (!client) throw new Error('Client not found');
  const code = generateCode();
  client.codeHash = hashCode(code);
  client.active = true;
  saveClients(list);
  return { client: toSafe(client), accessCode: code };
}

function setActive(clientId, active) {
  const list = loadClients();
  const client = list.find(c => c.id === clientId);
  if (!client) throw new Error('Client not found');
  client.active = !!active;
  saveClients(list);
  return toSafe(client);
}

// Looks up a client by plaintext access code using a timing-safe compare
// against every active client's stored digest. Returns the client record
// (safe form) or null.
function findClientByCode(code) {
  if (!code) return null;
  let digest;
  try {
    digest = hashCode(code);
  } catch {
    return null;
  }
  const digestBuf = Buffer.from(digest);
  const list = loadClients();
  for (const c of list) {
    if (!c.active) continue;
    const storedBuf = Buffer.from(c.codeHash);
    if (storedBuf.length === digestBuf.length && crypto.timingSafeEqual(storedBuf, digestBuf)) {
      return toSafe(c);
    }
  }
  return null;
}

module.exports = {
  slugify,
  listClientsSafe,
  idExists,
  getSafe,
  createClient,
  createClientWithId,
  rotateCode,
  setActive,
  findClientByCode,
};
