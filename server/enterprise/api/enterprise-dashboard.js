const engine = require("../enterprise-engine");


function buildPayload() {
    return {
        vertical: "healthcare",
        entity: "Banner Health",
        objective: "Claims leakage analysis",

        customer: {
            id: "BAN-001"
        },

        supplier: {
            id: "SUP-8832"
        },

        product: {
            id: "HC-99215"
        },

        quote: {
            id: "QUOTE-9001"
        },

        order: {
            id: "ORD-1001"
        },

        invoice: {
            id: "INV-5001"
        },

        compliance: {
            id: "HIPAA-001"
        },

        audit: {
            id: "AUDIT-2026-001"
        }
    };
}


module.exports = {


    async dashboard(req, res) {

        const result = await engine.enrich(buildPayload());

        res.json({

            ok:true,

            dashboard:{

                entity: result.entity,

                vertical: result.vertical,

                healthScore:
                    result.summary.highestScore,

                capabilities:
                    result.capabilities.map(c=>({

                        id:c.id,

                        title:c.title,

                        score:c.score,

                        confidence:c.confidence,

                        status:
                            c.score >= 85
                            ? "HEALTHY"
                            : "REVIEW"

                    }))

            }

        });

    },


    async decision(req,res){

        const result =
            await engine.enrich(buildPayload());


        res.json({

            ok:true,

            decision:
                result.capabilities
                ? result
                : null

        });

    },


    async missions(req,res){

        const result =
            await engine.enrich(buildPayload());


        const missions =
            result.capabilities
            .filter(c=>c.score < 90)
            .map(c=>({

                id:
                    `MISSION-${c.id.toUpperCase()}`,

                capability:
                    c.title,

                priority:
                    c.score < 85
                    ? "HIGH"
                    : "MEDIUM",

                score:c.score,

                recommendations:
                    c.recommendations

            }));


        res.json({

            ok:true,

            missions

        });

    }

};