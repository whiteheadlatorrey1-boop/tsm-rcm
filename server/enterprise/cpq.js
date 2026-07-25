'use strict';

// Was: hardcoded score:88. Now reads the real, case-linked quote store
// that routes/enterprise-capability-bridge.js writes to
// (POST /api/cpq/quotes).

const { getJSON } = require('./_live');

module.exports = {

    id: "cpq",

    title: "Configure Price Quote Intelligence",


    async analyze(context = {}) {

        let quotes;

        try {
            const path = '/api/cpq/quotes' +
                (context.caseId ? ('?caseId=' + encodeURIComponent(context.caseId)) : '');
            const data = await getJSON(context.baseUrl, path);
            quotes = data.quotes || [];
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (!quotes.length) {
            return { relevant: false };
        }

        const draft = quotes.filter(q => q.status === 'DRAFT');

        const totalAmount = quotes.reduce(
            (sum, q) => sum + (Number(q.amount) || 0),
            0
        );

        const score = Math.round((draft.length / quotes.length) * 100);

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + quotes.length * 5),

            findings: quotes.slice(0, 5).map(
                q => `${q.quoteRef}: ${q.status}` +
                    (q.amount ? ` — $${q.amount}` : '')
            ),

            recommendations: draft.length
                ? ["Move draft quotes through approval before exposure grows", "Validate margin on contingency quotes"]
                : ["Continue standard quote pipeline monitoring"],

            evidence: quotes.map(q => q.id),

            explainability: {

                reason:
                    `${draft.length} of ${quotes.length} tracked quotes are still in DRAFT; ` +
                    `$${totalAmount} total quoted.`,

                quoteCount: quotes.length,
                draftCount: draft.length,
                totalAmount

            }

        };

    }

};
