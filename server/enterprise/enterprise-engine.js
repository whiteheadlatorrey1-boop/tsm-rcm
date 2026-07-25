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


            }


        };


    }


}





module.exports =
    new EnterpriseEngine();
