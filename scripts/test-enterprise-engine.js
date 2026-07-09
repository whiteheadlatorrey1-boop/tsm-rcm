'use strict';

const engine = require('../server/enterprise/enterprise-engine');


(async()=>{

const result = await engine.enrich({

    vertical:"healthcare",

    entity:"Banner Health",

    objective:"Claims leakage analysis",


    customer:{
        id:"BAN-001",
        name:"Banner Health"
    },


    supplier:{
        id:"SUP-8832",
        name:"Example Supplier"
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
    },


    approval:{
        id:"APR-1001"
    },


    integration:{
        id:"INT-ERP-001"
    },


    project:{
        id:"PROJ-1001"
    },


    task:{
        id:"TASK-5001"
    },


    asset:{
        id:"ASSET-001"
    },


    model:{
        id:"MODEL-001"
    }

});


console.log(
    JSON.stringify(result,null,2)
);


})();