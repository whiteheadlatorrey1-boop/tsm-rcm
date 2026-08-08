// TSM Event History

const history = [];

module.exports = {

store(event){

history.push({

...event,

timestamp:new Date().toISOString()

});

},

list(){

return history;

}

};