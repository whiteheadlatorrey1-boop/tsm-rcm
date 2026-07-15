
window.TSMMortgageMission=function(){

const sector=
window.TSM_ACTIVE_SECTOR;


if(!sector ||
sector.id!=="mortgage"){
return null;
}


return {

vertical:"mortgage",

category:
window.TSM_SELECTED_MORTGAGE_PACK ||
"mortgage-ops-scorecard",

routing:
sector.routing,

created:
new Date().toISOString()

};


};

