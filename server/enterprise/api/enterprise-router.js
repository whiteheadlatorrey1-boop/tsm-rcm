'use strict';


const express = require('express');

const router =
    express.Router();


const orchestrator =
    require('../enterprise-orchestrator');

const demoFixtures =
    require('../demo-fixtures');

const domainMap =
    require('../domain-map');



function resolveContext(body = {}) {

    if (body.demo) {

        const fixture =
            demoFixtures[body.demo] ||
            demoFixtures.healthcare;

        return Object.assign(
            {},
            fixture,
            body.context || {}
        );

    }

    return body;

}



function reshapeForClient(result, context) {

    const vertical =
        result.enrichment.vertical ||
        "unknown";

    const labels =
        domainMap[vertical] || {};

    const capabilities =
        result.enrichment.capabilities.map(
            c => Object.assign(
                {},
                c,
                {
                    domainLabel:
                        labels[c.id] || c.title
                }
            )
        );

    return Object.assign(
        {},
        result,
        {

            sector:
                vertical,

            documentType:
                context.documentType ||
                null,

            capabilityCount:
                capabilities.length,

            capabilities,

            bnca:{

                recommendedAction:
                    result.decision.action,

                priority:
                    result.decision.priority ||
                    null,

                confidence:
                    result.decision.confidence,

                escalate:
                    result.decision.priority === "HIGH",

                evidence:
                    result.explainability.evidence,

                reasoning:
                    result.explainability.reasoning,

                exposure:
                    undefined,

                decisionWindow:
                    undefined

            }

        }
    );

}



router.get(
    '/health',
    (req,res)=>{

        res.json({

            ok:true,

            service:
                "TSM Enterprise Intelligence API"

        });

    }
);



router.post(
    '/enrich',
    async(req,res)=>{


        try {

            const context =
                resolveContext(req.body);

            const result =
                await orchestrator.execute(
                    context
                );

            res.json(
                reshapeForClient(result, context)
            );


        }
        catch(err){


            res.status(500).json({

                ok:false,

                error:
                    err.message

            });


        }


    }
);



module.exports =
    router;


// ── Enterprise Dashboard APIs ───────────────────────────────

function payload(req){

return Object.assign({

vertical:"healthcare",

entity:"Banner Health",

customer:{
 id:"BAN-001"
},

audit:{
 id:"AUDIT-2026-001"
}

},req.body || {});

}



router.post("/dashboard", async(req,res)=>{

const result =
await orchestrator.execute(payload(req));


res.json({

ok:true,

dashboard:{

entity:result.enrichment.entity,

vertical:result.enrichment.vertical,

healthScore:
result.enrichment.summary.highestScore,

capabilities:
result.enrichment.capabilities

}

});

});



router.post("/decision", async(req,res)=>{

const result =
await orchestrator.execute(payload(req));


res.json({

ok:true,

decision:
result.decision,

explainability:
result.explainability

});

});



router.post("/missions", async(req,res)=>{

const result =
await orchestrator.execute(payload(req));


res.json({

ok:true,

count:
result.enrichment.capabilities.filter(c=>c.score < 90).length,

missions:
result.enrichment.capabilities
.filter(c=>c.score < 90)
.map(c=>({

id:
"MISSION-"+c.id.toUpperCase(),

capability:
c.title,

score:
c.score,

confidence:
c.confidence,

recommendations:
c.recommendations

}))

});

});