window.TSMExceptionEngine = {

analyze(input){

return {

exception:input.exception || "unknown",

risk_score:input.risk_score || 0,

recommended_action:
input.recommended_action || "review"

};

}

};
