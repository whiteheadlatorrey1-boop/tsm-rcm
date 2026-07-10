#!/usr/bin/env python3
"""
Fix: Two divergent decision-generation paths in the Enterprise Engine.

Problem:
  enterprise-engine.js's enrich() built its OWN decision/explainability
  (buildDecision/buildExplainability) as a leftover stopgap. Meanwhile
  enterprise-orchestrator.js ALSO builds a decision via bnca-engine.js +
  explainability-engine.js, using a different action taxonomy, priority
  threshold, and confidence formula. Depending on which endpoint you hit
  (/decision vs /enrich), the SAME entity could get two different
  decisions.

Fix:
  - enterprise-engine.js goes back to pure enrichment: no decision/
    explainability, no buildDecision()/buildExplainability() helpers.
  - enterprise-router.js: /dashboard, /decision, /missions all now call
    orchestrator.execute() instead of engine.enrich() directly, so BNCA
    is the single, non-negotiable decision authority everywhere. The
    router no longer requires enterprise-engine.js at all.

Run from repo root:
    python3 apply_bnca_single_source_of_truth.py

Then:
    node --check server/enterprise/enterprise-engine.js
    node --check server/enterprise/api/enterprise-router.js
    node scripts/test-enterprise-orchestrator.js   # sanity check
    git checkout -b fix/bnca-single-source-of-truth
    git add server/enterprise/enterprise-engine.js server/enterprise/api/enterprise-router.js
    git commit -m "Fix: route all enterprise endpoints through BNCA (single decision source)"
    gh pr create --fill
"""

import re
import sys

ENGINE_PATH = "server/enterprise/enterprise-engine.js"
ROUTER_PATH = "server/enterprise/api/enterprise-router.js"


def read(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def write(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)


def apply_engine_fix():
    src = read(ENGINE_PATH)

    # --- 1. Remove decision/explainability construction before the return ---
    old_pre_return = """        const decision =
            results.length
                ? buildDecision(results)
                : {
                    action:"EXECUTIVE_REVIEW",
                    priority:"HIGH",
                    confidence:0,
                    driver:null,
                    summary:"Enterprise capabilities require review."
                };

        const explainability =
            results.length
                ? buildExplainability(results)
                : null;

        return {"""
    count = src.count(old_pre_return)
    assert count == 1, f"expected 1 match for pre-return block, found {count}"
    src = src.replace(
        old_pre_return,
        "        return {",
    )

    # --- 2. Remove decision/explainability fields from the returned object ---
    old_return_tail = """                    Date.now() - started


            },


            decision:
                decision,


            explainability:
                explainability


        };"""
    count = src.count(old_return_tail)
    assert count == 1, f"expected 1 match for return-object tail, found {count}"
    src = src.replace(
        old_return_tail,
        """                    Date.now() - started


            }


        };""",
    )

    # --- 3. Remove the now-orphaned buildDecision() helper ---
    build_decision_pattern = re.compile(
        r"function buildDecision\(capabilities\)\{.*?\n\}\n\n\n\n", re.DOTALL
    )
    matches = build_decision_pattern.findall(src)
    assert len(matches) == 1, f"expected 1 match for buildDecision(), found {len(matches)}"
    src = build_decision_pattern.sub("", src, count=1)

    # --- 4. Remove the now-orphaned buildExplainability() helper ---
    build_explain_pattern = re.compile(
        r"function buildExplainability\(capabilities\)\{.*?\n\}\n\n\n", re.DOTALL
    )
    matches = build_explain_pattern.findall(src)
    assert len(matches) == 1, f"expected 1 match for buildExplainability(), found {len(matches)}"
    src = build_explain_pattern.sub("", src, count=1)

    if not src.endswith("\n"):
        src += "\n"

    write(ENGINE_PATH, src)
    print(f"[OK] {ENGINE_PATH} patched")


def apply_router_fix():
    src = read(ROUTER_PATH)

    # --- 1. Drop the direct engine require ---
    old_require = """// ── Enterprise Dashboard APIs ───────────────────────────────

const engine =
require("../enterprise-engine");


function payload(req){"""
    count = src.count(old_require)
    assert count == 1, f"expected 1 match for engine require block, found {count}"
    src = src.replace(
        old_require,
        """// ── Enterprise Dashboard APIs ───────────────────────────────

function payload(req){""",
    )

    # --- 2. /dashboard: engine.enrich() -> orchestrator.execute() ---
    old_dashboard = """router.post("/dashboard", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

dashboard:{

entity:result.entity,

vertical:result.vertical,

healthScore:
result.summary.highestScore,

capabilities:
result.capabilities

}

});

});"""
    count = src.count(old_dashboard)
    assert count == 1, f"expected 1 match for /dashboard route, found {count}"
    src = src.replace(
        old_dashboard,
        """router.post("/dashboard", async(req,res)=>{

const result =
await orchestrator.execute(payload(req));


res.json({

ok:true,

dashboard:{

entity:result.enrichment.entity,

vertical:result.enrichment.vertical,

healthScore:
result.enrichment.summary.highestScore,

capabilities:
result.enrichment.capabilities

}

});

});""",
    )

    # --- 3. /decision: engine.enrich() -> orchestrator.execute(), drop invented fallback ---
    old_decision = """router.post("/decision", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

decision:
result.decision || {

    action:"EXECUTIVE_REVIEW",

    priority:"HIGH",

    confidence:
        result.explainability?.confidence || 0,

    driver:
        result.explainability?.evidence?.[0]?.capability || null,

    summary:
        result.explainability?.why ||
        "Enterprise capabilities require review."

},

explainability:
result.explainability || null

});

});"""
    count = src.count(old_decision)
    assert count == 1, f"expected 1 match for /decision route, found {count}"
    src = src.replace(
        old_decision,
        """router.post("/decision", async(req,res)=>{

const result =
await orchestrator.execute(payload(req));


res.json({

ok:true,

decision:
result.decision,

explainability:
result.explainability

});

});""",
    )

    # --- 4. /missions: engine.enrich() -> orchestrator.execute() ---
    old_missions = """router.post("/missions", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

count:
result.capabilities.filter(c=>c.score < 90).length,

missions:
result.capabilities
.filter(c=>c.score < 90)
.map(c=>({

id:
"MISSION-"+c.id.toUpperCase(),

capability:
c.title,

score:
c.score,

confidence:
c.confidence,

recommendations:
c.recommendations

}))

});

});"""
    count = src.count(old_missions)
    assert count == 1, f"expected 1 match for /missions route, found {count}"
    src = src.replace(
        old_missions,
        """router.post("/missions", async(req,res)=>{

const result =
await orchestrator.execute(payload(req));


res.json({

ok:true,

count:
result.enrichment.capabilities.filter(c=>c.score < 90).length,

missions:
result.enrichment.capabilities
.filter(c=>c.score < 90)
.map(c=>({

id:
"MISSION-"+c.id.toUpperCase(),

capability:
c.title,

score:
c.score,

confidence:
c.confidence,

recommendations:
c.recommendations

}))

});

});""",
    )

    write(ROUTER_PATH, src)
    print(f"[OK] {ROUTER_PATH} patched")


if __name__ == "__main__":
    try:
        apply_engine_fix()
        apply_router_fix()
    except AssertionError as e:
        print(f"[FAIL] Anchor guard tripped: {e}", file=sys.stderr)
        print("[FAIL] No files were left partially patched by design of write-at-end,", file=sys.stderr)
        print("       but re-check target files against this script's assumptions before retrying.", file=sys.stderr)
        sys.exit(1)
    print("\nDone. Now run:")
    print("  node --check server/enterprise/enterprise-engine.js")
    print("  node --check server/enterprise/api/enterprise-router.js")
    print("  node scripts/test-enterprise-orchestrator.js")