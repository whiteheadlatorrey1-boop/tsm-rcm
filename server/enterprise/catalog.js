'use strict';

// Was: hardcoded score:85. Now reads the real, case-linked catalog item
// store that routes/enterprise-capability-bridge.js writes to
// (POST /api/catalog/items).

const { getJSON } = require('./_live');

module.exports = {

    id: "catalog",

    title: "Product Catalog Intelligence",


    async analyze(context = {}) {

        let items;

        try {
            const path = '/api/catalog/items' +
                (context.caseId ? ('?caseId=' + encodeURIComponent(context.caseId)) : '');
            const data = await getJSON(context.baseUrl, path);
            items = data.items || [];
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (!items.length) {
            return { relevant: false };
        }

        const flagged = items.filter(i => i.flag && i.flag !== 'REVIEW');

        const score = Math.round((flagged.length / items.length) * 100);

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + items.length * 5),

            findings: items.slice(0, 5).map(
                i => `${i.sku} (${i.name}): ${i.flag}`
            ),

            recommendations: flagged.length
                ? ["Review flagged SKUs for supply/compliance risk", "Confirm end-of-life or substitution plan"]
                : ["Continue standard catalog monitoring"],

            evidence: items.map(i => i.id),

            explainability: {

                reason:
                    `${flagged.length} of ${items.length} tracked catalog items carry a non-REVIEW flag.`,

                itemCount: items.length,
                flaggedCount: flagged.length

            }

        };

    }

};
