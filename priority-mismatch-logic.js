/**
 * TSM_PRIORITY_ALIGNMENT
 * ------------------------------------------------------------------
 * Computes a real MISMATCH/ALIGNED verdict from the two values that
 * actually exist today:
 *   - ticket priority:   #tkPriority select, text content "P1".."P4"
 *   - AI severity:       analysis.severity from /api/l1-copilot/analyze,
 *                         one of "Low" | "Medium" | "High" | "Critical"
 *
 * There is no server-side recommended_priority or requires_human_review
 * field. Both are derived here, deterministically, so the "MISMATCH"
 * badge is never fabricated -- it's a direct function of the two real
 * inputs above.
 */

// Ordinal scale so severity and priority can be compared on the same axis.
// Lower number = more urgent, matching how P1/Critical are both "top".
const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4 };
const SEVERITY_RANK = { Critical: 1, High: 2, Medium: 3, Low: 4 };

// Maps an AI severity to the priority it implies, so we can show a
// concrete "Recommended: P2" instead of just "these disagree."
const SEVERITY_TO_RECOMMENDED_PRIORITY = {
  Critical: 'P1',
  High: 'P2',
  Medium: 'P3',
  Low: 'P4'
};

/**
 * @param {string} ticketPriorityRaw - text content of #tkPriority, e.g. "P2"
 * @param {string} aiSeverityRaw     - analysis.severity from the analyze response
 * @returns {{
 *   status: 'ALIGNED'|'MISMATCH'|'UNKNOWN',
 *   ticketPriority: string|null,
 *   aiSeverity: string|null,
 *   recommendedPriority: string|null,
 *   requiresHumanReview: boolean,
 *   gapSize: number,           // 0 = aligned, 1 = one band off, 2+ = major gap
 *   direction: 'under-prioritized'|'over-prioritized'|null
 * }}
 */
function computePriorityAlignment(ticketPriorityRaw, aiSeverityRaw) {
  const ticketPriority = (ticketPriorityRaw || '').trim().toUpperCase();
  const aiSeverity = (aiSeverityRaw || '').trim();

  const pRank = PRIORITY_RANK[ticketPriority];
  const sRank = SEVERITY_RANK[aiSeverity];

  if (!pRank || !sRank) {
    return {
      status: 'UNKNOWN',
      ticketPriority: ticketPriority || null,
      aiSeverity: aiSeverity || null,
      recommendedPriority: null,
      requiresHumanReview: false,
      gapSize: 0,
      direction: null
    };
  }

  const gapSize = pRank - sRank; // positive = ticket priority is LOWER urgency than AI severity implies
  const recommendedPriority = SEVERITY_TO_RECOMMENDED_PRIORITY[aiSeverity] || null;

  return {
    status: gapSize === 0 ? 'ALIGNED' : 'MISMATCH',
    ticketPriority,
    aiSeverity,
    recommendedPriority,
    // Human review is warranted whenever the AI and the ticket disagree at all --
    // not just on big gaps. A P3/High one-band gap still means the technician's
    // stated priority doesn't match what the AI independently assessed.
    requiresHumanReview: gapSize !== 0,
    gapSize: Math.abs(gapSize),
    direction: gapSize > 0 ? 'under-prioritized' : (gapSize < 0 ? 'over-prioritized' : null)
  };
}

/**
 * Renders the Priority Alignment step body given the computed result.
 * Matches the "BIG WOW" card language from the demo narrative, but every
 * value shown is real: ticketPriority and aiSeverity are read straight
 * off the DOM/API, recommendedPriority is a pure function of aiSeverity.
 */
function renderPriorityAlignmentCard(alignment) {
  if (alignment.status === 'UNKNOWN') {
    return `<div class="tsm-dj-brief">Run analysis to compare AI-assessed severity against the ticket's stated priority.</div>`;
  }

  if (alignment.status === 'ALIGNED') {
    return `
      <div class="tsm-dj-brief">
        Ticket priority (<strong>${alignment.ticketPriority}</strong>) matches AI-assessed severity
        (<strong>${alignment.aiSeverity}</strong>). No discrepancy to review.
      </div>
    `;
  }

  const directionLabel = alignment.direction === 'under-prioritized'
    ? 'lower than the operational severity TSM detected'
    : 'higher than the operational severity TSM detected';

  return `
    <div class="tsm-dj-alert">
      <strong>&#9888; PRIORITY MISMATCH DETECTED</strong>
      <div style="margin-top:6px;">
        Current: <strong>${alignment.ticketPriority}</strong> &nbsp;&rarr;&nbsp;
        Recommended: <strong>${alignment.recommendedPriority}</strong>
      </div>
      <div style="margin-top:4px;font-size:0.9em;">
        The ticket was logged at ${directionLabel} (${alignment.gapSize} band${alignment.gapSize > 1 ? 's' : ''} gap).
      </div>
      <div style="margin-top:8px;">
        <strong>Human review required</strong> before this priority is changed.
      </div>
    </div>
  `;
}

// Usage inside your existing analysis flow (wherever currentAnalysis is set,
// around line 1943-1944 in l1-ticket-copilot.html where sevEl is populated):
//
//   const alignment = computePriorityAlignment(
//     document.getElementById('tkPriority').value,
//     currentAnalysis.severity
//   );
//   syncDecisionJourneyFromAnalysis(currentAnalysis, alignment);
//
// syncDecisionJourneyFromAnalysis should store `alignment` on state and use
// alignment.requiresHumanReview to decide whether Step 5 shows the
// ACCEPT / KEEP CURRENT / SEND FOR REVIEW controls or a plain "no action needed."

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computePriorityAlignment, renderPriorityAlignmentCard, PRIORITY_RANK, SEVERITY_RANK };
}
