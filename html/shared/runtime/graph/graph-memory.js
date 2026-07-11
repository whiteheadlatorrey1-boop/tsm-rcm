window.TSMGraphMemory = {

store:[],

remember(data){

this.store.push({
data,
timestamp:new Date().toISOString()
});

},

recall(){

return this.store;

}

};
