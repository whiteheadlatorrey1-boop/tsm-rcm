function approveLoan(loan){

return {

loanId:loan.loanId,

workflow:[
"AI_REVIEW",
"RISK_CHECK",
"COMPLIANCE_CHECK",
"HUMAN_APPROVAL"
],

status:"PENDING"

};

}

module.exports={approveLoan};
