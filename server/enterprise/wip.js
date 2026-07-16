'use strict';

// Was: hardcoded score:86, static 50% readiness default. Now reads the
// real, file-backed WIP state server.js maintains (WIP_TASKS,
// WIP_READINESS, WIP_DECISIONS, WIP_TRENDS) via GET /api/wip/board.
// Requires context.vertical — WIP state is tracked per-vertical, so
// without one there's nothing specific to analyze.

const { getJSON } = require('./_live');

module.exports = {

    id: "wip",

    title: "Work-In-Progress Intelligence",


    async analyze(context = {}) {

        if (!context.vertical) {
            return { relevant: false };
        }

        let board;

        try {
            board = await getJSON(
                context.baseUrl,
                '/api/wip/board?vertical=' + encodeURIComponent(context.vertical)
            );
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        const tasks = board.tasks || [];
        const highRiskTasks = tasks.filter(t => t.risk === 'HIGH' && t.status !== 'DONE');
        const readinessOverall = board.readinessOverall != null ? board.readinessOverall : null;

        if (!tasks.length && readinessOverall == null) {
            return { relevant: false };
        }

        const readinessGap = readinessOverall != null ? Math.max(0, 100 - readinessOverall) : 0;
        const score = Math.round((readinessGap + highRiskTasks.length * 10) / 2);

        return {

            relevant: true,

            score: Math.min(100, score),

            confidence: Math.min(95, 60 + tasks.length * 5),

            findings: [
                readinessOverall != null ? `Readiness overall: ${readinessOverall}%` : null,
                `${highRiskTasks.length} open HIGH-risk task${highRiskTasks.length === 1 ? '' : 's'}`
            ].filter(Boolean).concat(
                highRiskTasks.slice(0, 4).map(t => `${t.action} (owner: ${t.owner}, status: ${t.status})`)
            ),

            recommendations: highRiskTasks.length
                ? ["Assign owners/due dates to open HIGH-risk tasks", "Review readiness gaps before next milestone"]
                : ["Continue standard execution tracking"],

            evidence: tasks.map(t => t.id),

            explainability: {

                reason:
                    `Vertical "${context.vertical}" has ${highRiskTasks.length} open HIGH-risk task(s)` +
                    (readinessOverall != null ? ` and ${readinessOverall}% overall readiness.` : '.'),

                vertical: context.vertical,
                taskCount: tasks.length,
                highRiskTaskCount: highRiskTasks.length,
                readinessOverall

            }

        };

    }

};
