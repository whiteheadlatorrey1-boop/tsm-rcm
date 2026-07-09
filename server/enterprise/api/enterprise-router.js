'use strict';


const express = require('express');

const router =
    express.Router();


const orchestrator =
    require('../enterprise-orchestrator');



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


            const result =
                await orchestrator.execute(
                    req.body || {}
                );


            res.json(result);


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

const engine =
require("../enterprise-engine");


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
await engine.enrich(payload(req));


res.json({

ok:true,

dashboard:{

entity:result.entity,

vertical:result.vertical,

healthScore:
result.summary.highestScore,

capabilities:
result.capabilities

}

});

});



router.post("/decision", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

decision:
result.decision || {

    action:"EXECUTIVE_REVIEW",

    priority:"HIGH",

    confidence:
        result.explainability?.confidence || 0,

    driver:
        result.explainability?.evidence?.[0]?.capability || null,

    summary:
        result.explainability?.why ||
        "Enterprise capabilities require review."

},

explainability:
result.explainability || null

});

});



router.post("/missions", async(req,res)=>{

const result =
await engine.enrich(payload(req));


res.json({

ok:true,

count:
result.capabilities.filter(c=>c.score < 90).length,

missions:
result.capabilities
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

