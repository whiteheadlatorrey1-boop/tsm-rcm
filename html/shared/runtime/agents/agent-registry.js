window.TSMAgentRegistry = {

agents:{},

register(agent){

this.agents[agent.name]=agent;

return agent;

},

get(name){

return this.agents[name];

},

list(){

return Object.keys(this.agents);

}

};
