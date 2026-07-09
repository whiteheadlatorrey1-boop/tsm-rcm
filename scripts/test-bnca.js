'use strict';


const engine =
    require('../server/enterprise/enterprise-engine');


const bnca =
    require('../server/enterprise/bnca-engine');



(async()=>{


const enrichment =
    await engine.enrich({

        vertical:"healthcare",

        entity:"Banner Health",

        customer:{
            id:"BAN-001"
        },

        supplier:{
            id:"SUP-8832"
        },

        product:{
            id:"HC-99215"
        },

        quote:{
            id:"QUOTE-9001"
        },

        order:{
            id:"ORD-1001"
        },

        invoice:{
            id:"INV-5001"
        },

        compliance:{
            id:"HIPAA-001"
        },

        audit:{
            id:"AUDIT-2026-001"
        }

    });



const decision =
    bnca.decide(enrichment);



console.log(
    JSON.stringify(decision,null,2)
);



})();