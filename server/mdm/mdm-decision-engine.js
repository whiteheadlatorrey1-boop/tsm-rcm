
function analyze(recordA, recordB){

    let confidence = 0;
    let reasons=[];


    if(recordA.taxId &&
       recordA.taxId === recordB.taxId){

        confidence += 50;
        reasons.push("Same tax identifier");

    }


    if(recordA.address &&
       recordA.address === recordB.address){

        confidence += 25;
        reasons.push("Same address");

    }


    if(recordA.name &&
       recordB.name){

        confidence += 25;
        reasons.push("Name similarity");

    }


    return {

        decision:
            confidence >= 75
            ? "MERGE"
            : "REVIEW",

        confidence,

        reasons

    };

}


module.exports={
    analyze
};

