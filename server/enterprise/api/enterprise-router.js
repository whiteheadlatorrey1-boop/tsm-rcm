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


const {
    groundEnterpriseResult
} = require('../vertical-decision-grounding');



// Capability modules (o2c.js, crm.js, governance.js, etc.) now self-fetch
// the real, already-mounted endpoints for their data instead of returning
// hardcoded stub values. They need to know what host to call — same
// process, so this is just the incoming request's own origin.
function baseUrlFrom(req) {
    return req.protocol + '://' + req.get('host');
}

// case-engine.js (and any future module hitting a requireRole-gated
// /api/bpo/* route) self-fetches with plain fetch(), which sends no
// cookies of its own. Forwarding the caller's own session cookie means
// the internal call runs with the same permissions as the logged-in
// portal user — no new auth surface, no service account to manage.
function cookieFrom(req) {
    return req.headers.cookie || '';
}

function resolveContext(body = {}, baseUrl, cookie) {

    if (body.demo) {

        const fixture =
            demoFixtures[body.demo] ||
            demoFixtures.healthcare;

        return Object.assign(
            {},
            fixture,
            body.context || {},
            { baseUrl, cookie }
        );

    }

    return Object.assign({}, body, { baseUrl, cookie });

}



function reshapeForClient(result, context) {

      /*
       * Vertical grounding runs AFTER the Enterprise/BNCA
       * decision has been calculated.
       *
       * It augments the response without replacing BNCA.
       */
      result =
          groundEnterpriseResult(
              result,
              context
          );


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

            totalCapabilities:
                result.enrichment.totalCapabilities || capabilities.length,

            capabilities,

            verticalFinding:
                  result.verticalFinding || null,

              decisionContext:
                  result.decisionContext || null,

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
                resolveContext(req.body, baseUrlFrom(req), cookieFrom(req));

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

},req.body || {}, { baseUrl: baseUrlFrom(req), cookie: cookieFrom(req) });

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
