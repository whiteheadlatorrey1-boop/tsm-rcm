// TSM Simulation History

const history = [];

module.exports = {

record(simulation){

history.push({

...simulation,

timestamp:new Date().toISOString()

});

},

list(){

return history;

}

};