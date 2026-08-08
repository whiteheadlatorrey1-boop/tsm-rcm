window.TSMExplainability = {

create(data){

return {

why:data.reason,

evidence:data.evidence || [],

confidence:data.confidence || 0

};

}

};
