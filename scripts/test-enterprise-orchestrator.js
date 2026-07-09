'use strict';


const orchestrator =
    require('../server/enterprise/enterprise-orchestrator');



(async()=>{


const result =
    await orchestrator.execute({


        vertical:"healthcare",


        entity:"Banner Health",


        objective:"Claims leakage analysis",


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



console.log(
    JSON.stringify(result,null,2)
);


})();