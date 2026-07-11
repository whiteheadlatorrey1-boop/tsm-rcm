window.TSMTwinQuery = {

find(criteria){

return Object.values(
window.TSMTwinState.state
).filter(item=>{

return Object.entries(criteria)
.every(([k,v])=>item[k]===v);

});

}

};