'use strict';

// Was: hardcoded score:89. Now reads the real GOVERNANCE_RISK_REGISTER that
// server.js maintains in-memory (GET /api/governance/risk). Optionally
// scoped to context.vertical since risks carry a vertical field.

const { getJSON } = require('./_live');

module.exports = {

    id: "governance",

    title: "Enterprise Governance Intelligence",


    async analyze(context = {}) {

        let risks;

        try {
            const data = await getJSON(context.baseUrl, '/api/governance/risk');
            risks = data.risks || [];
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (context.vertical) {
            risks = risks.filter(r => r.vertical === context.vertical);
        }

        const open = risks.filter(r => r.status === 'OPEN');

        if (!open.length) {
            return { relevant: false };
        }

        const critical = open.filter(r => r.severity === 'CRITICAL');

        const score = Math.round(
            (critical.length * 100 + (open.length - critical.length) * 60) / open.length
        );

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + open.length * 5),

            findings: open.slice(0, 5).map(
                r => `${r.title} (${r.severity}) — owner: ${r.owner}`
            ),

            recommendations: critical.length
                ? ["Escalate CRITICAL risks for immediate remediation sign-off", "Assign owners to any unassigned open risks"]
                : ["Continue standard risk register review"],

            evidence: open.map(r => r.id),

            explainability: {

                reason:
                    `${open.length} open risk${open.length === 1 ? '' : 's'} in the register` +
                    (critical.length ? `, ${critical.length} at CRITICAL severity.` : '.'),

                openCount: open.length,
                criticalCount: critical.length

            }

        };

    }

};
