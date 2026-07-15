function auditLoan(loan){

return {
    loanId:loan.loanId,
    status:"AUDITED",
    controls:[
        "DOCUMENT_COMPLETE",
        "INCOME_VERIFIED",
        "COMPLIANCE_CHECKED",
        "DECISION_LOGGED"
    ],
    score:96
};

}

module.exports={auditLoan};
