#!/usr/bin/env python3
"""
Wires Decision Journey Step 5 to the real l1-human-decision-wiring.js
module instead of the presentation-only stub. Two changes:
  1. Move l1-human-decision-wiring.js -> html/l1-copilot/ (repo root isn't
     statically served; html/ is mounted at '/').
  2. In l1-ticket-copilot.html: add the <script src> tag, and replace
     renderHumanDecision()'s button block so it delegates to the real
     renderHumanDecisionStep()/recordHumanDecision() functions instead of
     the local demo-only insertAdjacentHTML handler.
"""
import os, shutil, sys

REPO_ROOT = os.getcwd()
SRC = os.path.join(REPO_ROOT, "l1-human-decision-wiring.js")
DST = os.path.join(REPO_ROOT, "html", "l1-copilot", "l1-human-decision-wiring.js")
PAGE = os.path.join(REPO_ROOT, "html", "l1-copilot", "l1-ticket-copilot.html")

assert os.path.exists(SRC), f"ABORT: {SRC} not found -- already moved?"
assert not os.path.exists(DST), f"ABORT: {DST} already exists -- refusing to overwrite."

with open(PAGE, "r", encoding="utf-8") as f:
    page = f.read()

SCRIPT_TAG_ANCHOR = '<script id="tsm-decision-journey-js">'
NEW_SCRIPT_TAG = '<script src="/l1-copilot/l1-human-decision-wiring.js"></script>\n'
assert page.count(SCRIPT_TAG_ANCHOR) == 1, (
    f"ABORT: expected exactly 1 occurrence of {SCRIPT_TAG_ANCHOR!r}, "
    f"found {page.count(SCRIPT_TAG_ANCHOR)}."
)
assert "l1-human-decision-wiring.js" not in page, (
    "ABORT: page already references l1-human-decision-wiring.js -- skip, don't double-wire."
)
page = page.replace(SCRIPT_TAG_ANCHOR, NEW_SCRIPT_TAG + SCRIPT_TAG_ANCHOR, 1)

OLD_BLOCK = '''    container.innerHTML = `
      <div class="tsm-dj-final">
        <strong>DECISION BRIEF</strong>
        <br><br>
        <strong>Incident:</strong> ${text(ticket.incident)}
        <br>
        <strong>Original Priority:</strong> ${text(pa.ticket_priority || ticket.priority)}
        <br>
        <strong>TSM Severity:</strong> ${text(pa.ai_severity || a.severity)}
        <br>
        <strong>Recommended Priority:</strong> ${text(pa.recommended_priority)}
        <br>
        <strong>Next Action:</strong> ${text(a.recommended_path)}
        <br><br>
        <strong>Human Review:</strong>
        ${pa.requires_human_review ? "REQUIRED" : "Not required"}
      </div>

      <div class="tsm-dj-decision">
        <button type="button" data-dj-decision="accept">
          Accept Recommendation
        </button>
        <button type="button" data-dj-decision="keep">
          Keep Existing Priority
        </button>
        <button type="button" data-dj-decision="review">
          Escalate for Review
        </button>
      </div>
    `;

    container
      .querySelectorAll("[data-dj-decision]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const action = button.dataset.djDecision;

          /*
           * Presentation-only for now.
           * We deliberately do NOT mutate ServiceNow or ticket state.
           */
          container.insertAdjacentHTML(
            "beforeend",
            `<div class="tsm-dj-final">
              <strong>Decision recorded for demo:</strong>
              ${action === "accept"
                ? "Recommendation accepted by human reviewer."
                : action === "keep"
                  ? "Existing priority retained by human reviewer."
                  : "Escalation requested for human review."}
            </div>`
          );
        });
      });'''

assert page.count(OLD_BLOCK) == 1, (
    f"ABORT: expected exactly 1 occurrence of the renderHumanDecision button block, "
    f"found {page.count(OLD_BLOCK)}. File may have changed since this script was written."
)

NEW_BLOCK = '''    container.innerHTML = `
      <div class="tsm-dj-final">
        <strong>DECISION BRIEF</strong>
        <br><br>
        <strong>Incident:</strong> ${text(ticket.incident)}
        <br>
        <strong>Original Priority:</strong> ${text(pa.ticket_priority || ticket.priority)}
        <br>
        <strong>TSM Severity:</strong> ${text(pa.ai_severity || a.severity)}
        <br>
        <strong>Recommended Priority:</strong> ${text(pa.recommended_priority)}
        <br>
        <strong>Next Action:</strong> ${text(a.recommended_path)}
        <br><br>
        <strong>Human Review:</strong>
        ${pa.requires_human_review ? "REQUIRED" : "Not required"}
      </div>

      <div class="tsm-dj-decision" id="tsm-dj-decision-buttons"></div>
    `;

    // Delegates to the real, server-persisted HITL gate
    // (l1-human-decision-wiring.js) instead of a presentation-only stub.
    // Falls back to a plain notice if that module failed to load.
    const buttonsHost = $("tsm-dj-decision-buttons");
    if (buttonsHost && typeof window.renderHumanDecisionStep === "function") {
      window.renderHumanDecisionStep(
        buttonsHost,
        {
          incident: ticket.incident,
          ticketPriority: pa.ticket_priority || ticket.priority,
          aiSeverity: pa.ai_severity || a.severity,
          recommendedPriority: pa.recommended_priority
        },
        { requiresHumanReview: !!pa.requires_human_review }
      );
    } else if (buttonsHost) {
      buttonsHost.innerHTML =
        '<div class="tsm-dj-brief">Human decision recording unavailable this session.</div>';
    }'''

page = page.replace(OLD_BLOCK, NEW_BLOCK, 1)

with open(PAGE, "w", encoding="utf-8") as f:
    f.write(page)

os.makedirs(os.path.dirname(DST), exist_ok=True)
shutil.move(SRC, DST)

print("OK  moved l1-human-decision-wiring.js -> html/l1-copilot/")
print("OK  l1-ticket-copilot.html: script tag added + Step 5 buttons rewired")
print("\nRun `git diff --stat` to confirm: 1 file moved (rename), 1 file modified.")
