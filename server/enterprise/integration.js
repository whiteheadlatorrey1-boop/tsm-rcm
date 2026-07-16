'use strict';

// Was: hardcoded score:84. Now reads the real INTEGRATION_CATALOG health
// rollup server.js maintains (GET /api/integration/health).

const { getJSON } = require('./_live');

module.exports = {

    id: "integration",

    title: "Enterprise Integration Intelligence",


    async analyze(context = {}) {

        let health;

        try {
            health = await getJSON(context.baseUrl, '/api/integration/health');
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (!health.total || !health.degraded) {
            return { relevant: false };
        }

        const score = Math.round((health.degraded / health.total) * 100);

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + health.total * 3),

            findings: [
                `${health.degraded} of ${health.total} integrations degraded`,
                `${health.healthy} of ${health.total} integrations healthy`
            ],

            recommendations: [
                "Review and remediate degraded integrations via the HITL gate",
                "Confirm error logs on any repeatedly-degraded connection"
            ],

            evidence: [],

            explainability: {

                reason:
                    `${health.degraded} of ${health.total} tracked integrations are currently degraded.`,

                total: health.total,
                healthy: health.healthy,
                degraded: health.degraded

            }

        };

    }

};
