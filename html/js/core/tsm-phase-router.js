(function(){

window.TSM_PHASE_ROUTER={

route(vertical){

switch((vertical||"").toLowerCase()){

case "healthcare":

return [
"crm",
"approval",
"mdm",
"governance",
"digitalTwin"
];

case "legal":

return [
"crm",
"approval",
"mdm",
"governance"
];

case "construction":

return [
"o2c",
"crm",
"cpq",
"catalog",
"approval",
"mdm",
"integration",
"governance",
"wip",
"digitalTwin"
];

case "realestate":

return [
"crm",
"catalog",
"approval",
"mdm"
];

case "bpo":

return [
"crm",
"approval",
"mdm",
"governance"
];

default:

return [];

}

}

};

})();
