window.TSMKPIEngine = {

calculate(){

return {

enterprise_health:
window.TSMTwinHealth ?
window.TSMTwinHealth.calculate().health :
0,

missions:
window.TSMMissionStore ?
window.TSMMissionStore.items.length :
0,

timestamp:
new Date().toISOString()

};

}

};