// TSM Policy History

const history = [];

module.exports = {

record(policy){

history.push({

...policy,

timestamp:new Date().toISOString()

});

},

list(){

return history;

}

};