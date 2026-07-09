(function(){

window.TSM_CONTRACTS={

create(parsed){

return{

missionId:
parsed.missionId||null,

vertical:
parsed.vertical||null,

documentType:
parsed.documentType||null,

entities:
parsed.entities||[],

extractedFields:
parsed.extractedFields||{},

confidence:
parsed.confidence||0,

exposure:
parsed.exposure||0,

summary:
parsed.summary||"",

explainability:
parsed.explainability||[]

};

}

};

})();
