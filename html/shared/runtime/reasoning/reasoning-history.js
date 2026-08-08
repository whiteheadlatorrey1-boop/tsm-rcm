// TSM Reasoning History

const history = [];

module.exports = {

store(reasoning){

history.push({

...reasoning,

timestamp:new Date().toISOString()

});

},

list(){

return history;

}

};