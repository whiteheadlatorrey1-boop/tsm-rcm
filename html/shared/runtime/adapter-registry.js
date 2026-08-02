(function(global){

const Registry={

version:"1.0.0",

adapters:{},

register(adapter){

this.adapters[adapter.domain]=adapter;

},

health(){

return {

status:"READY",

domains:Object.keys(this.adapters)

};

}

};

global.TSMAdapterRegistry=Registry;

})(window);
