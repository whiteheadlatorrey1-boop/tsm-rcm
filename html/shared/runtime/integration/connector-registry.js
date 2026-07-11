window.TSMConnectorRegistry = {

connectors:{},

register(name,connector){

this.connectors[name]=connector;

},

get(name){

return this.connectors[name];

}

};