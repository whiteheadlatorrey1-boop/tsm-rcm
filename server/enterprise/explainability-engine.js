'use strict';


class ExplainabilityEngine {


    generate(enrichment = {}, decision = {}) {


        const capabilities =
            enrichment.capabilities || [];



        return {


            decision:


                decision.action ||
                "NO_ACTION",



            why:


                decision.summary ||
                "No decision context available.",



            confidence:


                decision.confidence || 0,



            evidence:

                capabilities.map(
                    capability => ({

                        capability:
                            capability.id,


                        score:
                            capability.score,


                        confidence:
                            capability.confidence,


                        findings:
                            capability.findings

                    })
                ),



            reasoning:


                this.buildReasoning(
                    capabilities
                )

        };


    }



    buildReasoning(capabilities){


        return capabilities
            .slice(0,5)
            .map(

                c =>

                `${c.title} contributed score ${c.score}`

            );

    }


}



module.exports =
    new ExplainabilityEngine();