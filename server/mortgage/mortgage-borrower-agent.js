

module.exports = {


assist(loan){


return {


borrower:loan.borrower,


messages:[

"Document checklist generated",

"Income verification requested",

"Closing timeline updated"

],


nextAction:
"Upload missing employment verification"


};


}


};

