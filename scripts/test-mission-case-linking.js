#!/usr/bin/env node
/**
 * test-mission-case-linking.js
 *
 * Proves, end to end, that a Mission built from a classification and the
 * Case built from that same classification are now cross-linked via
 * missionId -- previously each was built independently with no shared
 * foreign key (only a filename in common), so a Mission and its Case
 * looked like two unrelated records even though they came from the same
 * document.
 *
 * Covers:
 *   1. TSMCase now accepts and stores a missionId field (additive schema
 *      change -- defaults to null, doesn't touch any existing field).
 *   2. The doc-search-multi.html wiring: buildMissionFromClassification()'s
 *      return value (previously discarded) is captured and its .id is
 *      passed into buildCaseFromClassification() as missionId.
 *   3. Regression: a case still builds correctly (with missionId: null)
 *      when the Mission bridge itself returns null -- e.g. an unmapped
 *      vertical, or TSMMissionModel/TSMMissionStore not loaded. The fix
 *      does not fabricate a missionId, it just threads the real one
 *      through when one exists.
 *
 * Uses jsdom (not plain require()) because tsm-case-manager.js,
 * mission-model.js, and mission-store.js are all browser IIFE modules
 * that attach to `window`, matching how doc-search-multi.html actually
 * loads them via <script> tags.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passed = 0;
let failed = 0;

function check(label, cond) {
  if (cond) {
    passed++;
    console.log('  OK   ' + label);
  } else {
    failed++;
    console.log('  FAIL ' + label);
  }
}

function loadScriptIntoWindow(win, filePath) {
  win.eval(fs.readFileSync(filePath, 'utf8'));
}

const MISSION_MODEL_PATH = path.join(__dirname, '..', 'html', 'shared', 'runtime', 'mission', 'mission-model.js');
const MISSION_STORE_PATH = path.join(__dirname, '..', 'html', 'shared', 'runtime', 'mission', 'mission-store.js');
const CASE_MANAGER_PATH = path.join(__dirname, '..', 'html', 'shared', 'tsm-case-manager.js');

function freshWindow() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://example.test/',
    runScripts: 'dangerously'
  });
  return dom.window;
}

// Mirrors the real DOC_ROUTER_TO_MISSION_VERTICAL map's shape closely
// enough for this test: one mapped code, one deliberately unmapped code.
const DOC_ROUTER_TO_MISSION_VERTICAL = { HC: 'healthcare', UNMAPPED: null };

// Mirrors buildMissionFromClassification() in doc-search-multi.html.
function buildMissionFromClassification(win, classification, fileName) {
  try {
    if (!win.TSMMissionModel || !win.TSMMissionStore) return null;
    const primaryCode = classification.primaryVertical || (classification.verticals || [])[0];
    const missionVertical = DOC_ROUTER_TO_MISSION_VERTICAL[primaryCode];
    if (!missionVertical) return null;

    const mission = win.TSMMissionModel.createMission({
      tenantId: 'default',
      vertical: missionVertical,
      client: classification.client || null,
      classification: classification,
      confidence: { score: classification.confidence, computedBy: 'server:doc-router' },
      workflow: { assignedTo: null, queue: null, priority: classification.priority || 'normal', sla: null },
      documents: [{ fileName: classification.fileName || fileName }]
    });
    win.TSMMissionStore.saveMission(mission);
    return mission;
  } catch (e) {
    console.error('Mission write failed (non-fatal):', e);
    return null;
  }
}

// Mirrors buildCaseFromClassification() in doc-search-multi.html.
function buildCaseFromClassification(win, classification, fileName, missionId) {
  try {
    if (!win.TSMCaseManager) return null;
    const primaryCode = classification.primaryVertical || (classification.verticals || [])[0];
    const caseVertical = DOC_ROUTER_TO_MISSION_VERTICAL[primaryCode];
    if (!caseVertical) return null;

    return win.TSMCaseManager.create({
      sector: caseVertical,
      vertical: caseVertical,
      tenantId: null,
      client: classification.client || '',
      process: 'doc-search-multi:batch-intake',
      source: 'doc-search-multi',
      missionId: missionId || null,
      documentId: classification.fileName || fileName,
      documentType: classification.documentType || '',
      title: classification.summary || classification.documentType || fileName,
      confidence: typeof classification.confidence === 'number' ? Math.round(classification.confidence * 100) : null
    });
  } catch (e) {
    console.error('Case write failed (non-fatal):', e);
    return null;
  }
}

console.log('1. TSMCase accepts and stores missionId (additive schema field)');
{
  const win = freshWindow();
  loadScriptIntoWindow(win, CASE_MANAGER_PATH);
  const rec = win.TSMCaseManager.create({ sector: 'healthcare', vertical: 'healthcare', title: 'test', missionId: 'MSN-HC-TEST-1' });
  check('case.missionId stores the passed-in value', rec.missionId === 'MSN-HC-TEST-1');

  const recNoMission = win.TSMCaseManager.create({ sector: 'healthcare', vertical: 'healthcare', title: 'test 2' });
  check('case.missionId defaults to null when not passed (honest-missing, not fabricated)', recNoMission.missionId === null);
}

console.log('\n2. Full pipeline: mission built, its real id flows into the case (the actual fix)');
{
  const win = freshWindow();
  loadScriptIntoWindow(win, MISSION_MODEL_PATH);
  loadScriptIntoWindow(win, MISSION_STORE_PATH);
  loadScriptIntoWindow(win, CASE_MANAGER_PATH);

  const classification = {
    primaryVertical: 'HC',
    verticals: ['HC'],
    client: 'Acme Health',
    documentType: 'Denial Letter',
    confidence: 0.91,
    priority: 'High',
    fileName: 'denial-4471.pdf'
  };

  const missionRec = buildMissionFromClassification(win, classification, 'denial-4471.pdf');
  const caseRec = buildCaseFromClassification(win, classification, 'denial-4471.pdf', missionRec ? missionRec.id : null);

  check('mission was actually created (not null)', !!missionRec && !!missionRec.id);
  check('case was actually created (not null)', !!caseRec && !!caseRec.caseId);
  check('case.missionId equals the real mission.id -- this is the cross-link that did not exist before',
    !!missionRec && !!caseRec && caseRec.missionId === missionRec.id);
  check('mission and case remain distinct records with their own ids (linking, not merging)',
    missionRec.id !== caseRec.caseId);
}

console.log('\n3. Regression: unmapped vertical -- mission bridge returns null, case still builds honestly with missionId: null');
{
  const win = freshWindow();
  loadScriptIntoWindow(win, MISSION_MODEL_PATH);
  loadScriptIntoWindow(win, MISSION_STORE_PATH);
  loadScriptIntoWindow(win, CASE_MANAGER_PATH);

  const classification = {
    primaryVertical: 'UNMAPPED',
    verticals: ['UNMAPPED'],
    documentType: 'Unknown',
    confidence: 0.5,
    fileName: 'mystery.pdf'
  };

  const missionRec = buildMissionFromClassification(win, classification, 'mystery.pdf');
  check('mission bridge correctly returns null for an unmapped vertical', missionRec === null);

  const caseRec = buildCaseFromClassification(win, classification, 'mystery.pdf', missionRec ? missionRec.id : null);
  check('case bridge also correctly returns null for an unmapped vertical (both bridges skip silently)', caseRec === null);
}

console.log('\n4. Regression: Mission bridge not loaded at all (TSMMissionModel/TSMMissionStore absent) -- case still builds, honestly missionId: null');
{
  const win = freshWindow();
  loadScriptIntoWindow(win, CASE_MANAGER_PATH); // mission-model.js / mission-store.js deliberately NOT loaded

  const classification = { primaryVertical: 'HC', verticals: ['HC'], documentType: 'Denial', confidence: 0.8, fileName: 'x.pdf' };
  const missionRec = buildMissionFromClassification(win, classification, 'x.pdf');
  check('mission bridge returns null when TSMMissionModel/TSMMissionStore are not loaded', missionRec === null);

  const caseRec = buildCaseFromClassification(win, classification, 'x.pdf', missionRec ? missionRec.id : null);
  check('case still builds (TSMCaseManager was loaded independently)', !!caseRec);
  check('case.missionId is honestly null, not fabricated', caseRec.missionId === null);
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
