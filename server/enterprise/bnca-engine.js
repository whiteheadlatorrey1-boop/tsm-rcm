'use strict';


class BNCAEngine {


    decide(enrichment = {}) {


        const capabilities =
            enrichment.capabilities || [];



        if (!capabilities.length) {

            return {

                action:"NO_ACTION",

                confidence:0,

                reason:
                    "No enterprise signals detected."

            };

        }



        const highest =
            capabilities[0];



        const averageScore =
            Math.round(

                capabilities.reduce(
                    (sum,item)=>
                        sum + item.score,
                    0
                )
                /
                capabilities.length

            );



        const riskSignals =
            capabilities.filter(
                item =>
                    item.score >= 85
            );



        return {


            action:
                this.determineAction(
                    highest,
                    riskSignals
                ),


            priority:

                highest.score >= 90
                    ? "HIGH"
                    : "MEDIUM",



            confidence:

                averageScore,



            driver:

                highest.id,



            summary:

                `${riskSignals.length} enterprise ${riskSignals.length === 1 ? "capability" : "capabilities"} require review.`,



            explainability:{

                topCapability:
                    highest.title,


                score:
                    highest.score,


                contributingCapabilities:

                    capabilities.map(
                        c => ({
                            id:c.id,
                            score:c.score
                        })
                    )

            }

        };


    }



    determineAction(
        highest,
        signals
    ){


        if (
            highest.id === "mdm"
        ){

            return "REMEDIATE_MASTER_DATA";

        }



        if (
            highest.id === "governance"
        ){

            return "INITIATE_CONTROL_REVIEW";

        }



        if (
            highest.id === "o2c"
        ){

            return "REVIEW_REVENUE_PROCESS";

        }



        if (
            highest.id === "wip"
        ){

            return "OPTIMIZE_EXECUTION";

        }



        return "EXECUTIVE_REVIEW";


    }


}



module.exports =
    new BNCAEngine();