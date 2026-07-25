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



            // FIX: was an array of objects — (data.bnca.evidence||[]).join(' · ')
            // in war-room-prep.html was rendering "[object Object] · [object Object]".
            // Now a flat array of readable strings, safe to join.
            evidence:

                capabilities.map(
                    capability =>

                        `${capability.id} (score ${capability.score}` +
                        (capability.findings && capability.findings[0]
                            ? `: ${capability.findings[0]}`
                            : "") +
                        `)`

                ),



            // FIX: was returning an array — war-room-prep.html assigns this
            // directly to textContent, which comma-joins arrays with no
            // spacing. Now returns a single readable string.
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

            )
            .join(". ");

    }


}



module.exports =
    new ExplainabilityEngine();