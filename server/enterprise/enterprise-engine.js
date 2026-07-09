/**
 * ============================================================
 * TSM Enterprise Enrichment Engine
 * ------------------------------------------------------------
 *
 * Every Vertical -> One Intelligence Engine
 *
 * Healthcare
 * Legal
 * Construction
 * Insurance
 * Mortgage
 * Real Estate
 * BPO
 * Honeywell
 *
 *          ↓
 *
 * Enterprise Capabilities
 *
 * O2C
 * CRM
 * CPQ
 * Catalog
 * Approval
 * MDM
 * Integration
 * Governance
 * WIP
 * Digital Twin
 *
 *          ↓
 *
 * BNCA
 * Explainability
 * Trust
 *
 * ============================================================
 */

'use strict';


const MODULES = [

    "o2c",
    "crm",
    "cpq",
    "catalog",
    "approval",
    "mdm",
    "integration",
    "governance",
    "wip",
    "digital-twin"

];


function loadCapabilities(){

    const capabilities = [];

    for(const moduleName of MODULES){

        try {

            const capability =
                require(`./${moduleName}`);


            if(
                capability &&
                typeof capability.analyze === "function"
            ){

                capabilities.push(capability);

                console.log(
                    `[Enterprise] Loaded ${moduleName}`
                );

            }
            else {

                console.warn(
                    `[Enterprise] ${moduleName} missing analyze()`
                );

            }


        }
        catch(err){

            console.warn(
                `[Enterprise] ${moduleName} not installed`
            );

        }

    }


    return capabilities;

}



class EnterpriseEngine {


    async enrich(context = {}){


        const started = Date.now();


        const results = [];


        const capabilities =
            loadCapabilities();



        for(const capability of capabilities){


            try {


                const output =
                    await capability.analyze(context);



                if(
                    output &&
                    output.relevant === true
                ){


                    results.push({

                        id:
                            capability.id ||
                            "unknown",


                        title:
                            capability.title ||
                            capability.id,


                        score:
                            output.score || 0,


                        confidence:
                            output.confidence || 0,


                        findings:
                            output.findings || [],


                        recommendations:
                            output.recommendations || [],


                        evidence:
                            output.evidence || [],


                        explainability:
                            output.explainability || {}

                    });


                }



            }
            catch(err){


                console.error(

                    `[Enterprise] ${capability.id || "unknown"}`,

                    err.message

                );


            }


        }



        results.sort(
            (a,b)=>
                b.score - a.score
        );



        const decision =
            results.length
                ? buildDecision(results)
                : {
                    action:"EXECUTIVE_REVIEW",
                    priority:"HIGH",
                    confidence:0,
                    driver:null,
                    summary:"Enterprise capabilities require review."
                };

        const explainability =
            results.length
                ? buildExplainability(results)
                : null;

        return {


            ok:true,


            vertical:
                context.vertical ||
                "unknown",


            entity:
                context.entity ||
                null,


            capabilities:
                results,


            summary:{


                relevantCapabilities:
                    results.length,


                highestScore:
                    results.length
                        ? results[0].score
                        : 0,


                runtime:
                    Date.now() - started


            },


            decision:
                decision,


            explainability:
                explainability


        };


    }


}





function buildDecision(capabilities){

    const ranked =
        [...capabilities]
        .sort((a,b)=>b.score-a.score);

    const top = ranked[0];

    const reviewCount =
        capabilities.filter(c=>c.score < 90).length;

    return {

        action:
            reviewCount > 0
            ? "EXECUTIVE_REVIEW"
            : "NO_ACTION",

        priority:
            top.score < 85
            ? "HIGH"
            : "MEDIUM",

        confidence:87,

        driver:
            top.id,

        summary:
            `${reviewCount} enterprise capabilities require review.`

    };
}



function buildExplainability(capabilities){

    return {

        decision:"EXECUTIVE_REVIEW",

        why:
            `${capabilities.filter(c=>c.score < 90).length} enterprise capabilities require review.`,

        confidence:87,

        evidence:
            capabilities.map(c=>({

                capability:c.id,

                score:c.score,

                confidence:c.confidence,

                findings:c.findings

            })),

        reasoning:
            capabilities
            .slice(0,5)
            .map(c=>
                `${c.title} contributed score ${c.score}`
            )

    };

}


module.exports =
    new EnterpriseEngine();