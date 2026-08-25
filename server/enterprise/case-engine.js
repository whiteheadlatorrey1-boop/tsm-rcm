'use strict';

// Was: nothing. The Enterprise Portal had ten capability modules (o2c, crm,
// cpq, catalog, approval, mdm, integration, governance, wip, digital-twin)
// and none of them read the Case Engine — so a real HC Denial case, or a
// BPO Internal1 intake mirrored in via mission-case-bridge.js, never showed
// up here regardless of how much case activity was happening in those war
// rooms. This module closes that gap: self-fetches the real, already-live
// /api/bpo/reports/case-summary endpoint (server.js, backed by MongoDB
// bpo_cases via tsmLedger.bpoListCases) for context.vertical, same pattern
// wip.js already uses for /api/wip/board.
//
// Requires context.vertical, same as wip.js. Requires context.cookie so the
// requireRole(BPO_REPORT_ROLES)-gated endpoint sees the caller's own
// session — see _live.js and enterprise-router.js resolveContext().

const { getJSON } = require('./_live');

module.exports = {

    id: "case-engine",

    title: "Case Engine Activity",

    async analyze(context = {}) {

        if (!context.vertical) {
            return { relevant: false };
        }

        let body;

        try {
            body = await getJSON(
                context.baseUrl,
                '/api/bpo/reports/case-summary?vertical=' + encodeURIComponent(context.vertical),
                context.cookie
            );
        }
        catch (err) {
            // Most common cause: no/expired session cookie on this call
            // (e.g. a server-to-server test harness hitting /enrich
            // directly without a browser session). Not relevant rather
            // than a hard failure — the other nine capabilities still run.
            return { relevant: false, error: err.message };
        }

        const summary = body.summary || {};
        if (!summary.totalCases) {
            return { relevant: false };
        }

        const openCount = summary.totalCases - (summary.byStatus.CLOSED || 0);
        const p1Count = summary.byPriority.P1 || 0;
        const pendingReview = summary.humanReviewRequiredCount || 0;

        // Higher score = more that needs enterprise attention: open P1s
        // and cases still needing human review both push it up.
        const score = Math.min(100, Math.round(
            (p1Count * 15) + (pendingReview * 5) + (openCount > 0 ? 20 : 0)
        ));

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + summary.totalCases * 3),

            findings: [
                `${summary.totalCases} total case${summary.totalCases === 1 ? '' : 's'} (${openCount} open)`,
                p1Count ? `${p1Count} at P1 priority` : null,
                pendingReview ? `${pendingReview} pending human review` : null,
                summary.exposureCount ? `$${Math.round(summary.exposureTotal).toLocaleString()} total exposure across ${summary.exposureCount} case${summary.exposureCount === 1 ? '' : 's'}` : null
            ].filter(Boolean)

        };

    }

};
