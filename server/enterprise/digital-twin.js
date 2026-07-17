'use strict';

// Was: hardcoded score:90. Now reads the real cross-vertical rollup
// server.js's /api/digital-twin/snapshot already computes from live
// WIP + Governance + MDM state (server.js explicitly does NOT maintain a
// separate simulated dataset for this endpoint, so this is the same data
// every other war room writes to).

const { getJSON } = require('./_live');

module.exports = {

    id: "digital-twin",

    title: "Enterprise Digital Twin Intelligence",


    async analyze(context = {}) {

        let snapshot;

        try {
            snapshot = await getJSON(context.baseUrl, '/api/digital-twin/snapshot');
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        const openRisks = snapshot.governance?.openRisks || 0;
        const openRecs = snapshot.decisionIntelligence?.openRecommendations || 0;

        if (!openRisks && !openRecs) {
            return { relevant: false };
        }

        const score = Math.min(100, openRisks * 15 + openRecs * 10);

        return {

            relevant: true,

            score,

            confidence: 90,

            findings: [
                `${openRisks} open governance risk${openRisks === 1 ? '' : 's'} across the enterprise`,
                `${openRecs} open decision-intelligence recommendation${openRecs === 1 ? '' : 's'} (MDM engine)`,
                `${snapshot.wip?.verticalsTracked || 0} verticals actively tracked in WIP`
            ],

            recommendations: [
                "Prioritize the cross-domain risk with the largest enterprise-health swing",
                "Review MDM open recommendations before they compound into governance risks"
            ],

            evidence: [],

            explainability: {

                reason:
                    `Enterprise rollup shows ${openRisks} open governance risk(s) and ` +
                    `${openRecs} open decision-intelligence recommendation(s).`,

                openRisks,
                openRecommendations: openRecs,
                verticalsTracked: snapshot.wip?.verticalsTracked || 0

            }

        };

    }

};
