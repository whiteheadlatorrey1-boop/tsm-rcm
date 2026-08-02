window.TSMAgentMemory = {

memory:[],

store(entry){

this.memory.push({
...entry,
timestamp:new Date().toISOString()
});

},

recall(agent){

return this.memory.filter(
m=>m.agent===agent
);

}

};
