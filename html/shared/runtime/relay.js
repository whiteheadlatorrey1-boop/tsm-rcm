(function(global){

const PREFIX="TSM_";

const Relay={

write(domain,payload){

const key=PREFIX+domain+"_RELAY";

localStorage.setItem(key,JSON.stringify(payload));

sessionStorage.setItem(key,JSON.stringify(payload));

if(global.TSMEventBus){

TSMEventBus.publish("relay.updated",{

domain,

payload

});

}

},

read(domain){

const key=PREFIX+domain+"_RELAY";

const raw=sessionStorage.getItem(key)||localStorage.getItem(key);

if(!raw)return null;

return JSON.parse(raw);

}

};

global.TSMRelay=Relay;

})(window);
