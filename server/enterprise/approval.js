'use strict';

// Was: hardcoded score:87. Now reads the real, HITL-gated approval store
// that routes/enterprise-capability-bridge.js writes to
// (POST /api/approval/requests, approve/reject endpoints).

const { getJSON } = require('./_live');

module.exports = {

    id: "approval",

    title: "Enterprise Approval Intelligence",


    async analyze(context = {}) {

        let requests;

        try {
            const path = '/api/approval/requests' +
                (context.caseId ? ('?caseId=' + encodeURIComponent(context.caseId)) : '');
            const data = await getJSON(context.baseUrl, path);
            requests = data.requests || [];
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (!requests.length) {
            return { relevant: false };
        }

        const pending = requests.filter(r => r.status === 'PENDING');

        const score = Math.round((pending.length / requests.length) * 100);

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + requests.length * 5),

            findings: requests.slice(0, 5).map(
                r => `${r.title}: ${r.status}` +
                    (r.amount ? ` — $${r.amount}` : '')
            ),

            recommendations: pending.length
                ? ["Route pending approvals to the correct approver", "Escalate any approval past SLA"]
                : ["Continue standard approval monitoring"],

            evidence: requests.map(r => r.id),

            explainability: {

                reason:
                    `${pending.length} of ${requests.length} tracked approval requests are still PENDING.`,

                requestCount: requests.length,
                pendingCount: pending.length

            }

        };

    }

};
