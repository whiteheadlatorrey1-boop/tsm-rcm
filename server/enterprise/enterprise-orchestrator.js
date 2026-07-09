'use strict';


const enterprise =
    require('./enterprise-engine');


const bnca =
    require('./bnca-engine');


const explain =
    require('./explainability-engine');



class EnterpriseOrchestrator {


    async execute(context = {}) {


        const enrichment =
            await enterprise.enrich(
                context
            );


        const decision =
            bnca.decide(
                enrichment
            );


        const explainability =
            explain.generate(
                enrichment,
                decision
            );


        return {


            ok:true,


            context,


            enrichment,


            decision,


            explainability,


            timestamp:
                new Date().toISOString()

        };


    }


}


module.exports =
    new EnterpriseOrchestrator();