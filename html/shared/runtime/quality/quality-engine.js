window.TSMQualityEngine = {

score(input){

return {

score:input.score || 0,

timestamp:new Date().toISOString()

};

}

};
