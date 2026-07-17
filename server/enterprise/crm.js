'use strict';

// Was: hardcoded score:91. Now reads the real, case-linked account store
// that routes/enterprise-capability-bridge.js writes to
// (POST /api/crm/records).

const { getJSON } = require('./_live');

module.exports = {

    id: "crm",

    title: "Customer Relationship Management",


    async analyze(context = {}) {

        let records;

        try {
            const path = '/api/crm/records' +
                (context.caseId ? ('?caseId=' + encodeURIComponent(context.caseId)) : '');
            const data = await getJSON(context.baseUrl, path);
            records = data.records || [];
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (!records.length) {
            return { relevant: false };
        }

        const highRisk = records.filter(r => r.riskFlag === 'HIGH');

        const score = Math.round((highRisk.length / records.length) * 100);

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + records.length * 5),

            findings: records.slice(0, 5).map(
                r => `${r.accountName} (${r.relationshipType}): risk ${r.riskFlag}`
            ),

            recommendations: highRisk.length
                ? ["Escalate high-risk accounts to account owner", "Review relationship health for at-risk accounts"]
                : ["Continue standard account monitoring"],

            evidence: records.map(r => r.id),

            explainability: {

                reason:
                    `${highRisk.length} of ${records.length} tracked accounts flagged HIGH risk.`,

                recordCount: records.length,
                highRiskCount: highRisk.length

            }

        };

    }

};
