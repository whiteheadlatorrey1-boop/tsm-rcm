window.TSMTwinHealth = {

calculate(){

const entities =
Object.keys(
window.TSMTwinState.state
).length;

return {

entities,

health:
entities ? 100 : 0,

timestamp:
new Date().toISOString()

};

}

};