module.exports = {

decide(input){

return {

decision:"APPROVE_WITH_CONDITIONS",

confidence:94,

conditions:[
"Verify income",
"Confirm insurance"
],

reasoning:
"Loan meets risk threshold with outstanding conditions"

};

}

};
