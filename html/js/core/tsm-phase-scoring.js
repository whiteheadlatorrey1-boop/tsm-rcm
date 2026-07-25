(function(){

window.TSM_PHASE_SCORING={

score(result){

return{

confidence:
result.confidence||90,

risk:
result.risk||25,

businessImpact:
result.businessImpact||"Medium",

recommendation:
result.recommendation||"No recommendation"

};

}

};

})();
