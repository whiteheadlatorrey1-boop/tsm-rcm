'use strict';

// Was: hardcoded score:86 whenever context.order/invoice/payment/contract
// was present. Now reads the real, case-linked order store that
// routes/enterprise-capability-bridge.js writes to (POST /api/o2c/orders),
// the same store the capability-sweep orchestrator uses.

const { getJSON } = require('./_live');

module.exports = {

    id: "o2c",

    title: "Order-to-Cash Intelligence",


    async analyze(context = {}) {

        let orders;

        try {
            const path = '/api/o2c/orders' +
                (context.caseId ? ('?caseId=' + encodeURIComponent(context.caseId)) : '');
            const data = await getJSON(context.baseUrl, path);
            orders = data.orders || [];
        }
        catch (err) {
            return { relevant: false, error: err.message };
        }

        if (!orders.length) {
            return { relevant: false };
        }

        const frozen = orders.filter(o => o.status === 'FROZEN');

        const totalAtRisk = orders.reduce(
            (sum, o) => sum + (Number(o.amountAtRisk) || 0),
            0
        );

        const score = Math.round((frozen.length / orders.length) * 100);

        return {

            relevant: true,

            score,

            confidence: Math.min(95, 60 + orders.length * 5),

            findings: orders.slice(0, 5).map(
                o => `${o.orderRef} (${o.customer}): ${o.status}` +
                    (o.amountAtRisk ? ` — $${o.amountAtRisk} at risk` : '')
            ),

            recommendations: frozen.length
                ? ["Review frozen orders for release conditions", "Validate billing accuracy on at-risk accounts"]
                : ["Monitor order pipeline for emerging risk"],

            evidence: orders.map(o => o.id),

            explainability: {

                reason:
                    `${frozen.length} of ${orders.length} tracked orders are frozen; ` +
                    `$${totalAtRisk} total amount at risk.`,

                orderCount: orders.length,
                frozenCount: frozen.length,
                totalAmountAtRisk: totalAtRisk

            }

        };

    }

};
