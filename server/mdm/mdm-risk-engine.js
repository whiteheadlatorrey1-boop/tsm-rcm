/*
 TSM MDM Risk Engine
 Converts data quality findings into business risk
*/

function calculateRisk(record){

    let score = 0;
    let impacts=[];

    if(record.quality < 50){
        score += 40;
        impacts.push(
            "Critical master data quality failure"
        );
    }

    if(record.status === "DUPLICATE"){
        score += 25;
        impacts.push(
            "Duplicate master exposure"
        );
    }


    (record.issues || []).forEach(issue=>{

        if(issue.toLowerCase().includes("email")){
            score += 10;
            impacts.push(
              "Customer communication risk"
            );
        }

        if(issue.toLowerCase().includes("tax")){
            score += 20;
            impacts.push(
              "Compliance risk"
            );
        }

    });


    let level =
        score >= 70 ? "HIGH" :
        score >= 40 ? "MEDIUM" :
        "LOW";


    return {
        id:record.id,
        risk:level,
        score,
        impacts,
        recommendedAction:
            level==="HIGH"
            ? "Create stewardship mission"
            : "Monitor"
    };

}


module.exports={
    calculateRisk
};
