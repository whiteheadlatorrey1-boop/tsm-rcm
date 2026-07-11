// TSM Conversation Memory

const memory = [];

module.exports = {

store(message){

memory.push({
message,
timestamp:new Date().toISOString()
});

},

history(){

return memory;

}

};