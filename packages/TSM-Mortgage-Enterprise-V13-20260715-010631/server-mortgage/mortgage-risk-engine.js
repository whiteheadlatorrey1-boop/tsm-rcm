
module.exports={


score(loan){

let score=0;


if(loan.risk.fico >=740)
 score +=20;

if(loan.risk.dti <=40)
 score +=20;

if(loan.risk.ltv <=80)
 score +=20;


score +=20;


return {


riskScore:score,


classification:
score >=80
?
"LOW RISK"
:
"REVIEW REQUIRED"


};


}


};

