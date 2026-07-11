window.TSMConnectorRegistry={

 connectors:{},

 register(name,adapter){
   this.connectors[name]=adapter;
 },

 list(){
   return Object.keys(this.connectors);
 }

};