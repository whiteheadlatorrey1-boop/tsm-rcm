/*
 TSM MDM Explainability Engine

 Converts findings into executive reasoning.
*/

function explain(anomaly){

    const confidence =
        anomaly.riskScore >= 80 ? 92 :
        anomaly.riskScore >= 50 ? 78 :
        65;


    return {

        finding:
            anomaly.finding,

        risk:
            anomaly.riskScore >= 80
            ? "HIGH"
            : anomaly.riskScore >= 50
            ? "MEDIUM"
            : "LOW",


        explanation:{

            whyDetected:
            `${anomaly.type} identified through master data validation and matching rules.`,

            businessImpact:
            anomaly.exposure
            ?
            `Potential business exposure ${anomaly.exposure}`
            :
            "Potential operational data quality impact.",


            recommendedAction:
            "Validate golden record and execute controlled remediation.",


            confidence

        }

    };

}


module.exports={
    explain
};
