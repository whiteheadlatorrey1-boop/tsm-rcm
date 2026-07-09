const engine = require("../enterprise-engine");


function buildPayload(body = {}) {

    return {

        vertical:
            body.vertical || "healthcare",

        entity:
            body.entity || "Banner Health",

        objective:
            body.objective || "Claims leakage analysis",


        customer:
            body.customer || {
                id:"BAN-001"
            },

        supplier:
            body.supplier || {
                id:"SUP-8832"
            },

        product:
            body.product || {
                id:"HC-99215"
            },

        quote:
            body.quote || {
                id:"QUOTE-9001"
            },

        order:
            body.order || {
                id:"ORD-1001"
            },

        invoice:
            body.invoice || {
                id:"INV-5001"
            },

        compliance:
            body.compliance || {
                id:"HIPAA-001"
            },

        audit:
            body.audit || {
                id:"AUDIT-2026-001"
            }

    };

}



module.exports = {


async dashboard(req,res){

    const result =
        await engine.enrich(
            buildPayload(req.body)
        );


    res.json({

        ok:true,

        dashboard:{

            entity:
                result.entity,

            vertical:
                result.vertical,


            healthScore:
                result.summary.highestScore,


            capabilityCount:
                result.capabilities.length,


            capabilities:
                result.capabilities.map(c=>({

                    id:c.id,

                    title:c.title,

                    score:c.score,

                    confidence:c.confidence,


                    status:
                        c.score >= 90
                        ? "HEALTHY"
                        :
                        c.score >=80
                        ? "MONITOR"
                        :
                        "REVIEW",


                    explainability:
                        c.explainability

                }))

        }

    });

},



async decision(req,res){

    const result =
        await engine.enrich(
            buildPayload(req.body)
        );


    res.json({

        ok:true,

        decision:{

            action:
                result.decision.action,

            priority:
                result.decision.priority,

            confidence:
                result.decision.confidence,


            driver:
                result.decision.driver,


            summary:
                result.decision.summary,


            explainability:
                result.explainability

        }

    });

},



async missions(req,res){

    const result =
        await engine.enrich(
            buildPayload(req.body)
        );


    const missions =

        result.capabilities

        .filter(c =>
            c.score < 90 ||
            c.confidence < 90
        )


        .map(c=>({

            id:
                `MISSION-${c.id.toUpperCase()}`,


            capability:
                c.title,


            priority:

                c.score < 85
                ? "HIGH"
                :
                "MEDIUM",


            score:
                c.score,


            confidence:
                c.confidence,


            findings:
                c.findings,


            recommendations:
                c.recommendations,


            explainability:
                c.explainability

        }));


    res.json({

        ok:true,

        count:
            missions.length,

        missions

    });

}


};