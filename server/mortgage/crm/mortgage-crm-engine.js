function borrower360(borrower){

return {
    borrower,
    profile:"BORROWER_360",
    relationships:[
        "Loan Officer",
        "Processor",
        "Agent"
    ],
    intelligence:{
        lifecycle:"ACTIVE",
        opportunities:[
            "Refinance",
            "Home Equity"
        ]
    }
};

}

module.exports={borrower360};
