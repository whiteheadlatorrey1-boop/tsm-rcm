#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERIFY="server/pm/verification-engine.js"
INTEL="server/pm/intelligence-v3.js"
SERVER="server.js"

echo "============================================================"
echo " TSM PM — BUILD INTELLIGENCE V4.1"
echo " Verification → Exposure Reduction → Closed Loop"
echo "============================================================"

echo
echo "=== 1. PATCH VERIFICATION ENGINE ==="

python3 - <<'PY'
from pathlib import Path

p = Path("server/pm/verification-engine.js")
s = p.read_text()

old = """function verifyOutcome(action, input = {}) {
  const before = Number(action.exposure || 0);
  const after = Number(
    input.exposureAfter == null ? before : input.exposureAfter
  );

  const reduction = Math.max(0, before - after);

  let outcome = 'NO_CHANGE';

  if (after === 0) {
    outcome = 'CONDITION_CLEARED';
  } else if (after < before) {
    outcome = 'EXPOSURE_REDUCED';
  } else if (after > before) {
    outcome = 'EXPOSURE_INCREASED';
  }

  return {
    engine: VERSION,
    actionId: action.id,
    verified: Boolean(input.verified),
    outcome,
    exposureBefore: before,
    exposureAfter: after,
    exposureReduction: reduction,
    verifiedAt: new Date().toISOString(),
    verifiedBy: input.verifiedBy || 'PM Manager',
    notes: input.notes || ''
  };
}"""

new = """function verifyOutcome(action, input = {}) {
  if (!action) {
    throw new Error('Action is required');
  }

  const verified = Boolean(input.verified);

  if (!verified) {
    return {
      engine: VERSION,
      actionId: action.id,
      verified: false,
      outcome: 'NOT_VERIFIED',
      exposureBefore: Number(action.exposure || 0),
      exposureAfter: null,
      exposureReduction: 0,
      verifiedAt: null,
      verifiedBy: input.verifiedBy || null,
      notes: input.notes || ''
    };
  }

  const before = Number(action.exposure || 0);
  const after = Number(
    input.exposureAfter == null ? before : input.exposureAfter
  );

  if (!Number.isFinite(after) || after < 0) {
    throw new Error('exposureAfter must be a non-negative number');
  }

  const reduction = Math.max(0, before - after);

  let outcome = 'NO_CHANGE';

  if (after === 0) {
    outcome = 'CONDITION_CLEARED';
  } else if (after < before) {
    outcome = 'EXPOSURE_REDUCED';
  } else if (after > before) {
    outcome = 'EXPOSURE_INCREASED';
  }

  return {
    engine: VERSION,
    actionId: action.id,
    verified: true,
    outcome,
    exposureBefore: before,
    exposureAfter: after,
    exposureReduction: reduction,
    verifiedAt: new Date().toISOString(),
    verifiedBy: input.verifiedBy || 'PM Manager',
    notes: input.notes || ''
  };
}"""

if old not in s:
    raise SystemExit("Verification function pattern not found")

p.write_text(s.replace(old, new))
PY

echo "PASS: verification engine hardened"

echo
echo "=== 2. PATCH V3 VERIFICATION BRIDGE ==="

python3 - <<'PY'
from pathlib import Path

p = Path("server/pm/intelligence-v3.js")
s = p.read_text()

old = """function verifyPmAction(action, input = {}) {
  return verifyOutcome(action, input);
}"""

new = """function verifyPmAction(action, input = {}) {
  if (!action) {
    throw new Error('Action is required');
  }

  const verification = verifyOutcome(action, input);

  if (!verification.verified) {
    return {
      ok: false,
      action,
      verification
    };
  }

  if (action.status !== 'RESOLVED') {
    throw new Error('Only RESOLVED actions may be verified');
  }

  const verifiedAction = {
    ...action,
    status: 'VERIFIED',
    updatedAt: verification.verifiedAt,
    verification: {
      ...(action.verification || {}),
      required: true,
      verified: true,
      verifiedAt: verification.verifiedAt,
      verifiedBy: verification.verifiedBy,
      outcome: verification.outcome,
      exposureAfter: verification.exposureAfter,
      notes: verification.notes
    }
  };

  return {
    ok: true,
    action: verifiedAction,
    verification
  };
}"""

if old not in s:
    raise SystemExit("verifyPmAction pattern not found")

p.write_text(s.replace(old, new))
PY

echo "PASS: V3 verification bridge"

echo
echo "=== 3. PATCH VERIFY ROUTE ==="

python3 - <<'PY'
from pathlib import Path

p = Path("server.js")
s = p.read_text()

old = """    res.json({
      ok: true,
      ...verifyPmAction(body.action, body.verification || {})
    });"""

new = """    const result = verifyPmAction(
      body.action,
      body.verification || {}
    );

    res.json(result);"""

if old not in s:
    raise SystemExit("Verify route response pattern not found")

p.write_text(s.replace(old, new))
PY

echo "PASS: verify route"

echo
echo "=== 4. SYNTAX ==="
node --check server.js
node --check server/pm/verification-engine.js
node --check server/pm/intelligence-v3.js

echo
echo "============================================================"
echo " PM INTELLIGENCE V4.1 BUILD: PASS"
echo "============================================================"
