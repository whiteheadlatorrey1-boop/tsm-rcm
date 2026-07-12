window.TSMCommandDashboard = {

build(){

return {

health:
window.TSMTwinHealth ?
window.TSMTwinHealth.calculate() :
null,

missions:
window.TSMMissionStore ?
window.TSMMissionStore.list() :
[],

timestamp:
new Date().toISOString()

};

}

};